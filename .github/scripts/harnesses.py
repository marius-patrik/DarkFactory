"""Harness registry — the agent pipeline's adapter layer over coding-agent CLIs.

The pipeline is harness-agnostic: nothing in `agent_runner.py` knows which CLI is running. A harness
is described declaratively — a binary, how to turn a prompt into an argv, and a model fallback
chain — so adding one is a data change and swapping one is a configuration change.

Invocation shapes are the real, verified flags for each CLI, but CLIs move. Every field is
overridable at runtime through ``AGENT_HARNESS_CONFIG`` (a JSON object keyed by harness name), so a
flag rename never requires a code change or a container rebuild:

.. code-block:: json

    {
      "claude": {"model_chain": ["claude-opus-5"], "extra_args": ["--add-dir", "/workspace"]},
      "grok":   {"binary": "grok-cli"}
    }

Order comes from ``AGENT_HARNESS_CHAIN`` (comma-separated names, first wins). Harnesses whose binary
is absent from ``PATH`` are skipped rather than failed, so one image can carry a subset.

Environment:
    AGENT_HARNESS_CHAIN: Ordered harness names. Default: every registered harness, in ``ORDER``.
    AGENT_HARNESS_CONFIG: JSON overrides, keyed by harness name.
    AGENT_MODEL_CHAIN: Global model override applied to whichever harness runs first.
"""

import json
import os
import shutil
from dataclasses import dataclass, field, replace
from typing import Any, Dict, List, Optional, Sequence

#: Placeholder substituted with the prompt text when building argv.
PROMPT = "{{PROMPT}}"

#: Placeholder substituted with the model id. Templates omitting it run the harness default.
MODEL = "{{MODEL}}"

#: Placeholder substituted with the print-mode timeout (Go duration string, e.g. ``15m0s``).
TIMEOUT = "{{TIMEOUT}}"


@dataclass(frozen=True)
class Auth:
    """How a harness obtains a usable credential.

    Authentication was special-cased: one harness exchanged a Google refresh token in
    ``agent_runner``, and every other harness was assumed to find its own credential in the
    environment. Adding a harness that refreshes therefore meant editing the runner, which is the
    opposite of the registry being the place a harness is described.

    Declaring it here keeps the answer beside the harness. ``static`` means the environment already
    holds something usable; ``oauth_refresh`` means the environment holds a *refresh* token to be
    exchanged at ``token_url`` for a short-lived one.

    Attributes:
        kind: ``"static"`` or ``"oauth_refresh"``.
        env: Environment variable holding the credential, static or refresh.
        token_url: Token endpoint, for ``oauth_refresh``.
        client_id_env: Environment variable holding the OAuth client id, where one is required.
        client_secret_env: Environment variable holding the OAuth client secret, likewise.
        writes_back: Whether the provider rotates the refresh token on use, so a caller must
            persist the new one. Declared rather than assumed: getting it wrong silently strands
            the credential after the first refresh.
        note: Human-readable explanation for logs and documentation.
    """

    kind: str = "static"
    env: str = ""
    token_url: str = ""
    client_id_env: str = ""
    client_secret_env: str = ""
    writes_back: bool = False
    note: str = ""


@dataclass(frozen=True)
class Auth:
    """How a harness obtains a usable credential.

    Authentication was special-cased. One harness exchanged a Google refresh token in
    ``agent_runner``, and every other harness was assumed to find something usable already sitting
    in the environment. Adding a harness that refreshes therefore meant editing the runner, which
    is the opposite of the registry being the place a harness is described.

    Declaring it keeps the answer beside the harness that needs it.

    Attributes:
        kind: ``"static"`` when the environment already holds a usable credential, or
            ``"oauth_refresh"`` when it holds a *refresh* token to be exchanged first.
        env: Environment variable holding that credential.
        token_url: Token endpoint, for ``oauth_refresh``.
        client_id_env: Environment variable holding the OAuth client id, where one is required.
        client_secret_env: Environment variable holding the client secret, likewise.
        rotates: Whether the provider issues a new refresh token on each exchange, so the stored
            one must be replaced. Declared rather than assumed: the existing implementation reads
            only ``access_token`` from the response and passes the original refresh token straight
            back, which is correct for a provider that does not rotate and silently strands the
            credential for one that does.
        note: Human-readable explanation, for logs and documentation.
    """

    kind: str = "static"
    env: str = ""
    token_url: str = ""
    client_id_env: str = ""
    client_secret_env: str = ""
    rotates: bool = False
    note: str = ""

    def is_satisfied(self) -> bool:
        """Reports whether the environment holds what this method needs.

        Returns:
            ``True`` when the declared variable is populated, or when nothing is declared and the
            harness authenticates by other means.
        """
        return True if not self.env else bool(os.environ.get(self.env))


@dataclass(frozen=True)
class Harness:
    """One coding-agent CLI the pipeline can drive.

    Attributes:
        name: Registry key, also the value used in ``AGENT_HARNESS_CHAIN``.
        binary: Executable name looked up on ``PATH``.
        template: argv template after the binary, using the ``PROMPT``/``MODEL``/``TIMEOUT``
            placeholders.
        model_chain: Models tried in order within this harness before moving to the next harness.
            Empty means "run the harness default once".
        env_keys: Environment variables the harness needs; a harness missing all of them is
            reported as unauthenticated rather than silently failing mid-run.
        auth: How the credential is obtained. ``None`` means the environment already holds
            something usable, which is true of every harness that takes a plain API key.
        install: Shell that installs the binary into the agent image. Declared here so adding a
            harness is one entry rather than an entry plus a Dockerfile edit that can disagree
            with it.
        extra_args: Appended verbatim to every invocation.
        description: Human-readable note for logs and documentation.
    """

    name: str
    binary: str
    template: Sequence[str]
    model_chain: Sequence[str] = ()
    env_keys: Sequence[str] = ()
    extra_args: Sequence[str] = ()
    auth: Optional["Auth"] = None
    install: str = ""
    description: str = ""

    def install_command(self) -> str:
        """Returns the shell that installs this harness, or an empty string when it declares none.

        Returns:
            A shell command, or `""` for a harness the image does not install.
        """
        return self.install

    def is_available(self) -> bool:
        """Reports whether the harness binary is present on ``PATH``.

        Returns:
            ``True`` when the binary can be executed.
        """
        return shutil.which(self.binary) is not None

    def is_authenticated(self) -> bool:
        """Reports whether at least one of the harness's credential variables is populated.

        A harness with no declared ``env_keys`` is assumed to authenticate by other means (an OAuth
        file, a keyring entry) and reports ``True``.

        Returns:
            ``True`` when the harness looks usable.
        """
        if not self.env_keys:
            return True
        return any(os.environ.get(key) for key in self.env_keys)

    def build_argv(self, prompt: str, model: Optional[str], timeout: str) -> List[str]:
        """Renders the argv for one invocation.

        Placeholder arguments are substituted; any argument still containing ``MODEL`` when no model
        was supplied is dropped along with an immediately preceding flag, so a template can express
        an optional model without a second template.

        Args:
            prompt: Prompt text.
            model: Model id, or ``None`` to use the harness default.
            timeout: Print-mode timeout as a Go duration string.

        Returns:
            Full argv including the binary.
        """
        argv: List[str] = [self.binary]
        pending_flag: Optional[str] = None

        for token in self.template:
            if MODEL in token:
                if model is None:
                    pending_flag = None
                    continue
                token = token.replace(MODEL, model)
            elif token.startswith("-"):
                if pending_flag is not None:
                    argv.append(pending_flag)
                pending_flag = token
                continue

            if pending_flag is not None:
                argv.append(pending_flag)
                pending_flag = None
            argv.append(token.replace(PROMPT, prompt).replace(TIMEOUT, timeout))

        if pending_flag is not None:
            argv.append(pending_flag)
        argv.extend(self.extra_args)
        return argv


#: Built-in registry. Flags verified against each CLI's own ``--help``.
REGISTRY: Dict[str, Harness] = {
    "antigravity": Harness(
        name="antigravity",
        install="curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin",
        binary="agy",
        template=[
            "--print",
            PROMPT,
            "--model",
            MODEL,
            "--dangerously-skip-permissions",
            "--print-timeout",
            TIMEOUT,
        ],
        model_chain=("gemini-3.8-flash-high", "claude-opus-4-6-thinking"),
        env_keys=("ANTIGRAVITY_REFRESH_TOKEN",),
        auth=Auth(
            kind="oauth_refresh",
            env="ANTIGRAVITY_REFRESH_TOKEN",
            token_url="https://oauth2.googleapis.com/token",
            client_id_env="ANTIGRAVITY_CLIENT_ID",
            client_secret_env="ANTIGRAVITY_CLIENT_SECRET",
            # Google does not issue a new refresh token on a refresh_token grant, so the stored one
            # stays valid. Stated rather than relied upon, because the code that assumed it also
            # discarded the field it would have arrived in.
            rotates=False,
            note="Google OAuth; exchanged for a short-lived access token each run.",
        ),
        description="Google Antigravity CLI",
    ),
    "claude": Harness(
        name="claude",
        install="npm install -g @anthropic-ai/claude-code",
        binary="claude",
        template=[
            "--print",
            PROMPT,
            "--model",
            MODEL,
            "--output-format",
            "text",
            "--dangerously-skip-permissions",
        ],
        model_chain=("opus", "sonnet"),
        env_keys=("ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"),
        auth=Auth(
            kind="static",
            env="CLAUDE_CODE_OAUTH_TOKEN",
            # `claude setup-token` mints a long-lived token against a subscription, so there is
            # nothing to exchange and nothing to rotate. An ANTHROPIC_API_KEY works too and bills
            # per token instead.
            note="Long-lived subscription token, or an API key.",
        ),
        description="Anthropic Claude Code",
    ),
    "codex": Harness(
        name="codex",
        install="npm install -g @openai/codex",
        binary="codex",
        template=[
            "exec",
            PROMPT,
            "--model",
            MODEL,
            "--dangerously-bypass-approvals-and-sandbox",
            "--skip-git-repo-check",
        ],
        model_chain=(),
        env_keys=("OPENAI_API_KEY",),
        description="OpenAI Codex CLI",
    ),
    "kimi": Harness(
        name="kimi",
        install="npm install -g @moonshot-ai/kimi-cli",
        binary="kimi",
        template=["--prompt", PROMPT, "--model", MODEL, "--output-format", "text", "--yolo"],
        model_chain=(),
        env_keys=("MOONSHOT_API_KEY", "KIMI_API_KEY"),
        description="Moonshot Kimi CLI",
    ),
    "grok": Harness(
        name="grok",
        install="curl -fsSL https://raw.githubusercontent.com/xai-org/grok-cli/main/install.sh | bash",
        binary="grok",
        template=["--single", PROMPT, "--model", MODEL, "--always-approve"],
        model_chain=(),
        env_keys=("XAI_API_KEY", "GROK_API_KEY"),
        description="xAI Grok Build",
    ),
    "cursor": Harness(
        name="cursor",
        install="curl -fsSL https://cursor.com/install | bash",
        binary="cursor-agent",
        template=["--print", PROMPT, "--model", MODEL, "--force"],
        model_chain=(),
        env_keys=("CURSOR_API_KEY",),
        description="Cursor CLI (cursor-agent)",
    ),
    "opencode": Harness(
        name="opencode",
        install="npm install -g opencode-ai",
        binary="opencode",
        template=["run", PROMPT, "--model", MODEL, "--auto"],
        model_chain=(),
        env_keys=("OPENCODE_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"),
        description="opencode (model given as provider/model)",
    ),
}

#: Default order when ``AGENT_HARNESS_CHAIN`` is unset.
ORDER: List[str] = ["antigravity", "claude", "codex", "kimi", "grok", "cursor", "opencode"]


def _overrides() -> Dict[str, Dict[str, Any]]:
    """Parses ``AGENT_HARNESS_CONFIG``.

    Returns:
        Mapping of harness name to overridden fields; empty when unset or malformed.
    """
    raw = os.environ.get("AGENT_HARNESS_CONFIG", "").strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError as exc:
        print(f"AGENT_HARNESS_CONFIG is not valid JSON, ignoring: {exc}")
        return {}


def get_harness(name: str) -> Optional[Harness]:
    """Returns a harness with runtime overrides applied.

    Args:
        name: Registry key.

    Returns:
        The harness, or ``None`` when the name is unknown and no override defines it.
    """
    override = _overrides().get(name, {})
    base = REGISTRY.get(name)

    if base is None:
        required = {"binary", "template"}
        if not required.issubset(override):
            return None
        base = Harness(
            name=name,
            binary=override["binary"],
            template=tuple(override["template"]),
            description=override.get("description", "user-defined harness"),
        )

    fields = {}
    for key in ("binary", "description"):
        if key in override:
            fields[key] = override[key]
    for key in ("template", "model_chain", "env_keys", "extra_args"):
        if key in override:
            fields[key] = tuple(override[key])
    return replace(base, **fields) if fields else base


def configured_order() -> List[str]:
    """Returns the harness order from the environment, falling back to :data:`ORDER`.

    Returns:
        Ordered harness names, including any defined only in ``AGENT_HARNESS_CONFIG``.
    """
    raw = os.environ.get("AGENT_HARNESS_CHAIN", "").strip()
    if raw:
        return [part.strip() for part in raw.split(",") if part.strip()]
    return ORDER + [name for name in _overrides() if name not in ORDER]


def resolve_attempts(
    model_chain: Optional[Sequence[str]] = None,
    require_available: bool = True,
) -> List[tuple]:
    """Flattens the configured harnesses into an ordered list of attempts.

    Each attempt is one ``(harness, model)`` pair. A harness with an empty model chain yields a
    single attempt with ``model=None``, meaning "use the harness default".

    Args:
        model_chain: Overrides the model chain of the first available harness. Used so a caller can
            pin models without knowing which harness will run.
        require_available: Skip harnesses whose binary is absent from ``PATH``.

    Returns:
        Ordered ``(Harness, Optional[str])`` pairs.
    """
    attempts: List[tuple] = []
    override_applied = False

    for name in configured_order():
        harness = get_harness(name)
        if harness is None:
            print(f"Unknown harness {name!r} in chain; skipping.")
            continue
        if require_available and not harness.is_available():
            print(f"Harness {name!r} unavailable ({harness.binary} not on PATH); skipping.")
            continue
        if not harness.is_authenticated():
            print(f"Harness {name!r} has no credentials in {list(harness.env_keys)}; skipping.")
            continue

        models: Sequence[Optional[str]]
        if model_chain and not override_applied:
            models = list(model_chain)
            override_applied = True
        else:
            models = list(harness.model_chain) or [None]

        attempts.extend((harness, model) for model in models)

    return attempts


def describe_chain() -> str:
    """Renders the resolved chain for logs and issue comments.

    Returns:
        A human-readable multi-line description, or a notice when nothing is usable.
    """
    attempts = resolve_attempts()
    if not attempts:
        return "No harness is available: no configured CLI is on PATH with credentials."
    lines = []
    for harness, model in attempts:
        lines.append(f"- `{harness.name}` ({harness.binary}){f' model `{model}`' if model else ''}")
    return "\n".join(lines)
