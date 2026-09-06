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
        extra_args: Appended verbatim to every invocation.
        description: Human-readable note for logs and documentation.
    """

    name: str
    binary: str
    template: Sequence[str]
    model_chain: Sequence[str] = ()
    env_keys: Sequence[str] = ()
    extra_args: Sequence[str] = ()
    description: str = ""

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
        description="Google Antigravity CLI",
    ),
    "claude": Harness(
        name="claude",
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
        description="Anthropic Claude Code",
    ),
    "codex": Harness(
        name="codex",
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
        binary="kimi",
        template=["--prompt", PROMPT, "--model", MODEL, "--output-format", "text", "--yolo"],
        model_chain=(),
        env_keys=("MOONSHOT_API_KEY", "KIMI_API_KEY"),
        description="Moonshot Kimi CLI",
    ),
    "grok": Harness(
        name="grok",
        binary="grok",
        template=["--single", PROMPT, "--model", MODEL, "--always-approve"],
        model_chain=(),
        env_keys=("XAI_API_KEY", "GROK_API_KEY"),
        description="xAI Grok Build",
    ),
    "cursor": Harness(
        name="cursor",
        binary="cursor-agent",
        template=["--print", PROMPT, "--model", MODEL, "--force"],
        model_chain=(),
        env_keys=("CURSOR_API_KEY",),
        description="Cursor CLI (cursor-agent)",
    ),
    "opencode": Harness(
        name="opencode",
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
