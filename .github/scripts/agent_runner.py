"""Runner for the containerized, df-driven CI agent.

Drives DarkFactory's own agent harness — ``df run`` — through the declarative registry in
:mod:`harnesses`. ``df`` owns model choice and in-flight failover across its own chain, so the
runner resolves a single attempt: it configures df's accounts from the environment before
dispatch, invokes ``df run --json --prompt-file``, parses the JSON event stream into the final
answer text, and maps df's exit codes onto the quota/empty/error paths below.

Handles credential setup, stage dispatching (interpret, plan, implement, self-review,
plan-alignment, respond), auto-labeling, and Conventional Commit generation.
"""

import argparse
import base64
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import hashlib
import random
import uuid
from typing import Any, Dict, List, NoReturn, Optional, Set, Tuple
from datetime import datetime, timezone, timedelta

ANTIGRAVITY_CLIENT_ID = os.environ.get("ANTIGRAVITY_CLIENT_ID", "")
ANTIGRAVITY_CLIENT_SECRET = os.environ.get("ANTIGRAVITY_CLIENT_SECRET", "")
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

_CANDIDATE_DIRS = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.environ.get("GITHUB_WORKSPACE", "/workspace"), ".github", "scripts"),
    "/usr/local/share/darkfactory-scripts",
    "/workspace/.github/scripts",
]
for _d in _CANDIDATE_DIRS:
    if os.path.isdir(_d) and _d not in sys.path:
        sys.path.insert(0, _d)

import harnesses
import manifest as _manifest_module
from commands import (
    HINT_MARKER,
    INTERPRETATION_FOOTER,
    ISSUE_COMMAND_RE,
    PLAN_FOOTER,
    RESUME_INSTRUCTIONS,
    command_feedback,
    is_allowed_approver,
    is_command_hint,
    parse_issue_command,
    parse_pr_command,
)
from harnesses import Harness, resolve_attempts

#: Repository-specific configuration, read once at import.
_MANIFEST = _manifest_module.load(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

try:
    from project_automation import PROJECT_NUMBER, PROJECT_OWNER
except ImportError:
    PROJECT_OWNER = os.environ.get(
        "PROJECT_OWNER", os.environ.get("GITHUB_REPOSITORY_OWNER", "marius-patrik")
    )
    try:
        PROJECT_NUMBER = int(os.environ.get("PROJECT_NUMBER", "1"))
    except (ValueError, TypeError):
        PROJECT_NUMBER = 1

CHECKPOINT_FILENAME = ".antigravity_checkpoint.json"
WORKSPACE_DIR = os.environ.get("GITHUB_WORKSPACE", "/workspace")
STATE_DIR = os.environ.get("STATE_DIR", WORKSPACE_DIR)

DEFAULT_MODEL_FALLBACK_CHAIN: List[str] = [
    "gemini-3.8-flash-high",
    "claude-opus-4-6-thinking",
]

QUOTA_EXHAUSTION_PATTERNS: List[re.Pattern] = [
    re.compile(r"(?:status[_\s]*(?:code)?|http|error|code)\s*[:=]?\s*429\b", re.IGNORECASE),
    re.compile(
        r"\b429\s*[:=\-]?\s*(?:too\s*many\s*requests|resource[_\s]*exhausted|quota|rate\s*limit)",
        re.IGNORECASE,
    ),
    re.compile(r"\bresource[_\s]*exhausted\b", re.IGNORECASE),
    re.compile(
        r"\bquota\b(?:\s+\S+){0,6}\s+\b(?:exceeded|exhausted|exhaustion|reached|hit)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:exceeded|exhausted|exhaustion|reached|hit)\b(?:\s+\S+){0,6}\s+\bquota\b",
        re.IGNORECASE,
    ),
    re.compile(r"\binsufficient\s*quota\b", re.IGNORECASE),
    re.compile(r"\bout\s*of\s*quota\b", re.IGNORECASE),
    re.compile(
        r"\brate\s*[-_]?limit\b(?:\s+\S+){0,6}\s+\b(?:exceeded|exhausted|exhaustion|reached|hit)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:exceeded|exhausted|exhaustion|reached|hit)\b(?:\s+\S+){0,6}\s+\brate\s*[-_]?limit\b",
        re.IGNORECASE,
    ),
    re.compile(r"\btoo\s*many\s*requests\b", re.IGNORECASE),
    # A provider that says "daily limit reached" without the words quota or rate limit was not
    # detected as exhausted, so the runner failed instead of escalating to the next harness. That
    # is the most common way a limit is actually reported.
    re.compile(
        r"\b(?:daily|weekly|monthly|hourly|usage|credit|token|message)\s*limits?\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\blimits?\b(?:\s+\S+){0,3}\s+\b(?:reached|exceeded|hit|exhausted)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\bout\s*of\s*credits?\b", re.IGNORECASE),
    re.compile(r"\binsufficient\s*credits?\b", re.IGNORECASE),
    re.compile(r"\bupgrade\s*(?:your\s*)?plan\b", re.IGNORECASE),
    re.compile(r"\b(?:model|service|endpoint)\s*(?:is\s*)?unavailable\b", re.IGNORECASE),
    re.compile(r"\b(?:model|server|service)\s*(?:is\s*)?overloaded\b", re.IGNORECASE),
]

TYPE_LABELS = ["feat", "bug", "chore", "refactor", "test", "ci", "docs"]
# The area taxonomy is a property of the repository, not of the pipeline, so it comes from
# `repo.df`. `repo_settings` creates the labels from the same source, which is
# what keeps the labels the agent applies and the labels that exist from drifting apart.
AREA_LABELS = [name for name, _colour, _description in _MANIFEST.area_labels]


def refresh_google_oauth_token(
    refresh_token: str,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
) -> Dict[str, Any]:
    """Exchanges a Google OAuth refresh token for a fresh access token.

    Args:
        refresh_token: The long-lived Google OAuth refresh token.
        client_id: Google OAuth client ID (defaults to ANTIGRAVITY_CLIENT_ID env var).
        client_secret: Google OAuth client secret (defaults to ANTIGRAVITY_CLIENT_SECRET env var).

        client_secret: Google OAuth client secret.

    Returns:
        Dictionary containing access_token, expires_in, and token_type.

    Raises:
        RuntimeError: If the token exchange fails.
    """
    client_id = client_id or ANTIGRAVITY_CLIENT_ID or os.environ.get("ANTIGRAVITY_CLIENT_ID", "")
    client_secret = (
        client_secret
        or ANTIGRAVITY_CLIENT_SECRET
        or os.environ.get("ANTIGRAVITY_CLIENT_SECRET", "")
    )

    params = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        GOOGLE_TOKEN_ENDPOINT,
        data=params,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Google OAuth token refresh failed ({e.code}): {err_body}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error during token refresh: {e}") from e


def prepare_credentials(harness: Any, account: int = 1) -> Optional[str]:
    """Obtains a usable credential for a harness from what it declares.

    The runner used to know, by name, that one harness exchanges a Google refresh token and that
    every other one finds an API key already in the environment. Adding a harness that refreshes
    therefore meant editing the runner rather than the registry, which is where a harness is
    otherwise described.

    Args:
        harness: The harness to authenticate, carrying an optional ``auth`` declaration.
        account: 1-based account whose credential to prepare.

    Returns:
        A usable credential, or ``None`` when the harness declares none and authenticates by other
        means.

    Raises:
        RuntimeError: When an exchange was declared and could not be completed.
    """
    auth = getattr(harness, "auth", None)
    if auth is None or not auth.env_names(account):
        return None

    if auth.kind == "static":
        # Several providers accept either of two variable names, so the credential is whichever of
        # the declared names is actually populated rather than the first one declared.
        for name in auth.env_names(account):
            value = os.environ.get(name, "")
            if value:
                return value
        return None

    stored = os.environ.get(auth.env_names(account)[0], "")
    if not stored:
        return None

    if auth.kind != "oauth_refresh":
        raise RuntimeError(f"{harness.name}: unknown auth kind {auth.kind!r}")

    companions = auth.companion_names(account)
    response = exchange_refresh_token(
        stored,
        auth.token_url,
        os.environ.get(companions[0], "") if companions else "",
        os.environ.get(companions[1], "") if len(companions) > 1 else "",
    )

    # A provider that rotates issues a new refresh token on every exchange. Reading only the access
    # token, as this code did, is correct while the provider does not rotate and silently strands
    # the credential the moment one does - so the declaration decides, and the new value is
    # surfaced for the caller to persist rather than dropped.
    if auth.rotates and response.get("refresh_token"):
        rotated = response["refresh_token"]
        if rotated != stored:
            # Written back under this account's own name: rotating account two's token into
            # account one's secret would strand both.
            name = auth.env_names(account)[0]
            os.environ[name] = rotated
            persist_rotated_token(name, rotated)
    return response.get("access_token")


def prepare_login_file(base: Dict[str, str], attempt: Any) -> Optional[Tuple[str, str, str]]:
    """Materialize the selected subscription login and return (path, secret, original)."""
    auth = getattr(attempt.harness, "auth", None)
    login = getattr(auth, "login_file", None) if auth else None
    if not login:
        return None
    secret_name = auth.login_file_names(attempt.account)[0]
    content = base.get(secret_name, "")
    if not content:
        return None
    home = base.get("HOME") or os.environ.get("HOME") or os.path.expanduser("~")
    path = os.path.join(home, os.path.normpath(login.path))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as stream:
        stream.write(content)
    os.chmod(path, 0o600)
    return path, secret_name, content


def finish_login_file(state: Optional[Tuple[str, str, str]], rotates: bool = True) -> None:
    """Persist a changed login file under the account that supplied it, then remove it."""
    if not state:
        return
    path, secret_name, original = state
    try:
        with open(path, "r", encoding="utf-8") as stream:
            current = stream.read()
        if rotates and current != original:
            persist_rotated_token(secret_name, current)
    except FileNotFoundError:
        pass
    finally:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


def _export_names(auth: Any, account: int, base: Dict[str, str]) -> Tuple[str, ...]:
    """Returns the account-one names a prepared credential is exported under.

    Args:
        auth: The harness's auth declaration.
        account: 1-based account the credential belongs to.
        base: Environment the attempt derives from.

    Returns:
        For a static credential, the one account-one name matching the populated name; for an
        exchanged credential, every declared name.
    """
    if auth.kind != "static":
        return tuple(auth.env_names(1))
    for source, target in zip(auth.env_names(account), auth.env_names(1)):
        if base.get(source) or os.environ.get(source):
            return (target,)
    return tuple(auth.env_names(1)[:1])


def credential_env(base: Dict[str, str], attempt: Any) -> Dict[str, str]:
    """Builds the environment one attempt runs in, holding that account's credential and no other.

    Two things had to be true and only one was. A CLI reads its credential from the name it knows -
    ``CLAUDE_CODE_OAUTH_TOKEN``, never ``CLAUDE_CODE_OAUTH_TOKEN_2`` - so account two's secret has
    to arrive under account one's name. And the names the account does *not* use must be cleared:
    leaving `ANTHROPIC_API_KEY` in place while running account two means the CLI may authenticate
    with the first account's key and the rotation achieves nothing, silently.

    ``prepare_credentials`` was written to be the single place a credential is obtained and was
    never called from the run path, so a declared OAuth exchange never happened outside its tests.
    This is where it is called.

    Args:
        base: Environment to derive from.
        attempt: The attempt about to be made.

    Returns:
        A copy of ``base`` carrying exactly this account's credential.

    Raises:
        RuntimeError: When an exchange was declared and could not be completed.
    """
    env = dict(base)
    harness = attempt.harness
    auth = getattr(harness, "auth", None)
    if auth is None:
        return env

    # Every name this harness could authenticate with, across every account, is cleared first, so
    # what remains is what this attempt chose.
    for name in auth.secret_names():
        env.pop(name, None)

    login = getattr(auth, "login_file", None)
    login_name = auth.login_file_names(attempt.account)[0] if login else ""
    credential = prepare_credentials(harness, attempt.account)
    if login_name and base.get(login_name):
        # Subscription CLIs read the login file, never the static API-key names.
        credential = None
    if credential:
        # Under the *first* account's names, because that is what the CLI reads - but only under
        # the name the credential was found under. The alternatives are different kinds of
        # credential: the claude CLI prefers ANTHROPIC_API_KEY, so a subscription token exported
        # there as well failed every run with "401 API key is invalid".
        for name in _export_names(auth, attempt.account, base):
            env[name] = credential
    for source, target in zip(auth.companion_names(attempt.account), auth.companion_names(1)):
        if base.get(source):
            env[target] = base[source]
    return env


def persist_rotated_token(secret: str, value: str) -> bool:
    """Writes a rotated refresh token back to the repository secret it came from.

    A rotating provider invalidates the old refresh token as it issues the new one, so a run that
    exchanges and then forgets has spent the credential: this run works, and every run afterwards
    fails to authenticate. The failure appears later, on a different issue, and looks like the
    harness being unconfigured rather than like a token that was thrown away.

    The value is piped rather than passed as an argument, so it cannot appear in a process listing
    or a log.

    Args:
        secret: Name of the repository secret holding the refresh token.
        value: The new refresh token.

    Returns:
        True when the secret was updated.
    """
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not repo:
        print(
            f"{secret} was rotated but GITHUB_REPOSITORY is unset, so it cannot be written back; "
            "the next run will fail to authenticate.",
            file=sys.stderr,
        )
        return False
    try:
        subprocess.run(
            ["gh", "secret", "set", secret, "--repo", repo],
            input=value,
            text=True,
            capture_output=True,
            check=True,
            # Writing a secret is repository administration, which the App token cannot do; the
            # person's token is the one with the rights, exactly as for Projects v2.
            env={
                **os.environ,
                "GH_TOKEN": os.environ.get("GH_PROJECT_TOKEN") or os.environ.get("GH_TOKEN", ""),
            },
        )
        print(f"{secret} was rotated by the provider and has been written back.")
        return True
    except subprocess.CalledProcessError as exc:
        print(
            f"{secret} was rotated but could not be written back ({exc.stderr.strip()[:80]}); "
            "the next run will fail to authenticate.",
            file=sys.stderr,
        )
        return False


def exchange_refresh_token(
    refresh_token: str,
    token_url: str,
    client_id: str = "",
    client_secret: str = "",
) -> Dict[str, Any]:
    """Exchanges a refresh token for an access token at any OAuth token endpoint.

    Args:
        refresh_token: The stored refresh token.
        token_url: Token endpoint declared by the harness.
        client_id: OAuth client id, where the provider requires one.
        client_secret: OAuth client secret, likewise.

    Returns:
        The parsed token response.

    Raises:
        RuntimeError: When the endpoint rejects the exchange or cannot be reached.
    """
    fields = {"refresh_token": refresh_token, "grant_type": "refresh_token"}
    if client_id:
        fields["client_id"] = client_id
    if client_secret:
        fields["client_secret"] = client_secret

    request = urllib.request.Request(
        token_url,
        data=urllib.parse.urlencode(fields).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"token refresh failed ({exc.code}): {body}") from exc
    except Exception as exc:  # noqa: BLE001 - surfaced with context rather than swallowed
        raise RuntimeError(f"unexpected error during token refresh: {exc}") from exc


def setup_antigravity_credentials(
    access_token: str,
    refresh_token: str,
    target_dir: Optional[str] = None,
) -> str:
    """Configures Antigravity credential files in target directory.

    Args:
        access_token: Active Google access token.
        refresh_token: Stored refresh token.
        target_dir: Destination directory (defaults to ~/.gemini/antigravity-cli).

    Returns:
        Path to configured credentials payload file.
    """
    if not target_dir:
        target_dir = os.path.expanduser("~/.gemini/antigravity-cli")
    os.makedirs(target_dir, exist_ok=True)

    expiry_str = time.strftime(
        "%Y-%m-%dT%H:%M:%S.000000+00:00", time.gmtime(time.time() + 86400 * 365)
    )
    token_payload = {
        "token": {
            "access_token": access_token,
            "token_type": "Bearer",
            "refresh_token": refresh_token,
            "expiry": expiry_str,
        },
        "auth_method": "consumer",
    }
    encoded = "go-keyring-base64:" + base64.b64encode(
        json.dumps(token_payload).encode("utf-8")
    ).decode("utf-8")

    cred_file = os.path.join(target_dir, "antigravity_token.json")
    for fname in ["antigravity_token.json", "token.json", "tokens.json"]:
        p = os.path.join(target_dir, fname)
        with open(p, "w", encoding="utf-8") as f:
            json.dump({"raw": encoded, "payload": token_payload}, f, indent=2)

    # 1. Primary standalone file token store for Antigravity in container environments
    # (~/.gemini/jetski-standalone-oauth-token)
    gemini_base = os.path.expanduser("~/.gemini")
    os.makedirs(gemini_base, exist_ok=True)
    jetski_token_path = os.path.join(gemini_base, "jetski-standalone-oauth-token")
    with open(jetski_token_path, "w", encoding="utf-8") as f:
        json.dump(token_payload, f, indent=2)
    os.chmod(jetski_token_path, 0o600)

    # Mirror into target_dir and config dir
    for dir_path in [target_dir, os.path.expanduser("~/.config/antigravity")]:
        os.makedirs(dir_path, exist_ok=True)
        m_path = os.path.join(dir_path, "jetski-standalone-oauth-token")
        with open(m_path, "w", encoding="utf-8") as f:
            json.dump(token_payload, f, indent=2)
        os.chmod(m_path, 0o600)

    # 2. Canonical token file expected by agy CLI: antigravity-oauth-token
    oauth_dirs = [
        target_dir,
        os.path.expanduser("~/.gemini/antigravity-cli"),
        os.path.expanduser("~/.gemini"),
        os.path.expanduser("~/.config/antigravity"),
    ]
    for d in oauth_dirs:
        os.makedirs(d, exist_ok=True)
        oauth_file = os.path.join(d, "antigravity-oauth-token")
        with open(oauth_file, "w", encoding="utf-8") as f:
            json.dump(token_payload, f, indent=2)
        os.chmod(oauth_file, 0o600)

    # Ensure minimal settings.json exists so agy does not warn about missing settings
    for d in [target_dir, os.path.expanduser("~/.gemini/antigravity-cli")]:
        os.makedirs(d, exist_ok=True)
        settings_p = os.path.join(d, "settings.json")
        if not os.path.exists(settings_p):
            with open(settings_p, "w", encoding="utf-8") as f:
                json.dump({}, f)

    # In Linux container environments, populate D-Bus SecretService keyring
    if sys.platform.startswith("linux"):
        try:
            if os.path.exists("/.dockerenv"):
                os.remove("/.dockerenv")
        except OSError:
            pass

        # Unlock gnome-keyring
        try:
            p_unlock = subprocess.Popen(
                ["gnome-keyring-daemon", "--unlock"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            p_unlock.communicate(input="\n")
        except Exception as e:
            print(f"gnome-keyring unlock notice: {e}", file=sys.stderr)

        # Store token via secret-tool under all service/attribute combinations
        keyring_entries = [
            ("gemini", "username", "antigravity"),
            ("gemini", "account", "antigravity"),
            ("antigravity", "username", "antigravity"),
            ("antigravity", "account", "antigravity"),
        ]
        for service, attr_name, attr_val in keyring_entries:
            try:
                p_store = subprocess.Popen(
                    [
                        "secret-tool",
                        "store",
                        "--label=Antigravity",
                        "service",
                        service,
                        attr_name,
                        attr_val,
                    ],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                p_store.communicate(input=encoded)
            except Exception as e:
                print(f"secret-tool store notice ({service}/{attr_name}): {e}", file=sys.stderr)
        print("Successfully populated SecretService keyring for agy CLI.")

    return cred_file


def classify_type_and_area(text: str) -> Tuple[str, str]:
    """Classifies type and area labels from text content.

    Prefer the issue-form ``### Request Type`` declaration when present. Keyword fallback is used
    only when that section is absent, and the bug fallback is limited to explicit defect wording so
    ordinary mentions of failures or error handling do not become ``bug``.

    Args:
        text: Title and body text to inspect.

    Returns:
        Tuple of (type_label, area_label).
    """
    lower = text.lower()

    declared = re.search(
        r"###\s*Request Type\s*\n+\s*([a-z]+)(?:\s|\(|$)",
        text,
        flags=re.IGNORECASE,
    )
    known_types = {"feat", "bug", "refactor", "docs", "chore", "test", "ci"}
    if declared and declared.group(1).lower() in known_types:
        t_label = declared.group(1).lower()
    else:
        # Determine type label from keywords only when the form did not declare one.
        t_label = "feat"
        if re.search(r"\b(bug|regression|crash|broken)\b", lower):
            t_label = "bug"
        elif re.search(
            r"\b(docs?|document|documents|documenting|documentation|docstrings?|tsdoc|typedoc|readme)\b",
            lower,
        ):
            t_label = "docs"
        elif re.search(r"\b(refactor|clean|cleanup|simplify)\b", lower):
            t_label = "refactor"
        elif re.search(r"\b(test|pytest|testing|mock)\b", lower):
            t_label = "test"
        elif re.search(r"\b(ci|workflow|action|docker|runner)\b", lower):
            t_label = "ci"
        elif re.search(r"\b(chore|dependency|deps|bump)\b", lower):
            t_label = "chore"

    # Determine the area label from the repository's own taxonomy. Declaration order is match
    # order, so a repository puts its most specific areas first and the first hit wins.
    a_label = f"area:{_MANIFEST.default_area}"
    for area, keywords in _MANIFEST.area_keywords.items():
        if not keywords:
            continue
        pattern = r"\b(" + "|".join(re.escape(word) for word in keywords) + r")\b"
        if re.search(pattern, lower):
            a_label = f"area:{area}"
            break

    return t_label, a_label


def format_conventional_commit(commit_type: str, scope: str, description: str) -> str:
    """Formats a commit message adhering to Conventional Commits.

    Args:
        commit_type: One of feat, bug/fix, chore, refactor, test, ci, docs.
        scope: Scope identifier (e.g. model, view, ci, docs).
        description: Brief description of the change.

    Returns:
        Formatted conventional commit title.
    """
    t = "fix" if commit_type == "bug" else commit_type
    scope_clean = scope.replace("area:", "").strip()
    desc_clean = description.strip()
    if desc_clean and desc_clean[0].isupper():
        desc_clean = desc_clean[0].lower() + desc_clean[1:]
    return f"{t}({scope_clean}): {desc_clean}"


def run_gh(args: List[str], repo: Optional[str] = None) -> str:
    """Executes a gh CLI command and returns stdout.

    Args:
        args: List of command-line arguments.
        repo: Optional repository slug.

    Returns:
        Output string.

    Raises:
        subprocess.CalledProcessError: When the command fails, carrying the reason in its message.
    """
    cmd = ["gh"] + args
    # `gh api` has no --repo flag ("unknown flag: --repo"); its path already names the repository.
    if repo and (not args or args[0] != "api"):
        cmd.extend(["--repo", repo])
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        # `str()` of a CalledProcessError names the command and the exit status and nothing else,
        # so an agent crash used to end in a traceback that did not say why. `gh issue edit` failing
        # on an exhausted quota and failing because a label does not exist look identical from the
        # outside, and cost an hour to tell apart.
        detail = (res.stderr or res.stdout).strip().splitlines()
        raise subprocess.CalledProcessError(
            res.returncode,
            cmd,
            output=res.stdout,
            stderr=detail[0] if detail else "no output",
        )
    return res.stdout.strip()


def _pacific_offset_hours(moment: datetime) -> int:
    """Returns the UTC offset of America/Los_Angeles at a UTC moment (US daylight-saving rule).

    Computed without a time zone database, which Windows Python lacks unless ``tzdata`` is installed.

    Args:
        moment: A timezone-aware UTC datetime.

    Returns:
        -7 during daylight saving time (second Sunday of March to first Sunday of November), else -8.
    """
    year = moment.year
    march_first = datetime(year, 3, 1, tzinfo=timezone.utc)
    second_sunday_march = march_first + timedelta(days=(6 - march_first.weekday()) % 7 + 7)
    november_first = datetime(year, 11, 1, tzinfo=timezone.utc)
    first_sunday_november = november_first + timedelta(days=(6 - november_first.weekday()) % 7)
    dst_start = second_sunday_march.replace(hour=10)  # 02:00 PST
    dst_end = first_sunday_november.replace(hour=9)  # 02:00 PDT
    return -7 if dst_start <= moment < dst_end else -8


def _next_pacific_midnight(now: float) -> float:
    """Returns epoch seconds of the next midnight in America/Los_Angeles.

    Args:
        now: Current time in epoch seconds.

    Returns:
        The next Pacific midnight, when Google's daily free-tier quotas reset.
    """
    utc_now = datetime.fromtimestamp(now, tz=timezone.utc)
    local = utc_now + timedelta(hours=_pacific_offset_hours(utc_now))
    local_next_midnight = datetime(
        local.year, local.month, local.day, tzinfo=timezone.utc
    ) + timedelta(days=1)
    guess = local_next_midnight - timedelta(hours=_pacific_offset_hours(utc_now))
    return (local_next_midnight - timedelta(hours=_pacific_offset_hours(guess))).timestamp()


def next_quota_reset(error_detail: str, now: float) -> float:
    """Return epoch seconds of the earliest moment the run may resume.

    Uses, in order:
    1. ISO timestamp found in ``error_detail``.
    2. ``resetAt`` epoch (ms) found in ``error_detail``.
    3. ``retryDelay`` or ``Please retry in Ns`` value added to ``now``.
    4. Next Pacific midnight (America/Los_Angeles) if none of the above.
    """
    import re

    # 1. ISO timestamp (e.g. 2025-01-02T15:04:05Z)
    iso_match = re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?", error_detail)
    if iso_match:
        try:
            iso_str = iso_match.group(0)
            dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.timestamp()
        except Exception:
            pass
    # 2. resetAt epoch in milliseconds
    reset_match = re.search(r'"resetAt"\s*:\s*(\d{10,})', error_detail)
    if reset_match:
        try:
            ms = int(reset_match.group(1))
            return ms / 1000.0
        except Exception:
            pass
    # 3. retryDelay or Please retry in Ns
    retry_match = re.search(r'"retryDelay"\s*:\s*(\d+)', error_detail)
    if not retry_match:
        retry_match = re.search(r"please\s+retry\s+in\s+(\d+)s", error_detail, re.IGNORECASE)
    if retry_match:
        try:
            delay = int(retry_match.group(1))
            return now + delay
        except Exception:
            pass
    # 4. Next Pacific midnight
    return _next_pacific_midnight(now)


def _already_exists(error: Exception) -> bool:
    """Tells whether a gh failure means the variable already exists (HTTP 409).

    Args:
        error: The failure raised by ``run_gh``; its stderr carries the HTTP status.

    Returns:
        True for a 409 / "Already exists" response.
    """
    text = " ".join(
        str(part)
        for part in (error, getattr(error, "stderr", ""), getattr(error, "output", ""))
        if part
    )
    return "409" in text or "already exists" in text.lower()


def record_quota_block(
    repo, item_number, is_pr, reset_at, providers: List[str], run_id: str
) -> None:
    """Writes repository variable ``DF_QUOTA_<run_id>`` and updates ``DARKFACTORY_QUOTA_PROVIDERS``.

    The run variable stores JSON with keys ``item``, ``is_pr``, ``reset_at`` (ISO UTC), and ``blocked_at`` (ISO UTC).
    The provider map stores the maximum reset epoch for each provider.
    All failures are printed as notices and never raise.
    """
    var_name = f"DF_QUOTA_{run_id}"
    now_iso = (
        datetime.fromtimestamp(reset_at, tz=timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    blocked_iso = (
        datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    )
    payload = {
        "item": item_number,
        "is_pr": is_pr,
        "reset_at": now_iso,
        "blocked_at": blocked_iso,
    }
    value_json = json.dumps(payload, separators=(",", ":"))
    # Create or update the run variable
    try:
        run_gh(
            [
                "api",
                f"repos/{repo}/actions/variables",
                "--method",
                "POST",
                "-f",
                f"name={var_name}",
                "-f",
                f"value={value_json}",
            ],
            repo=repo,
        )
    except subprocess.CalledProcessError as e:
        # If it already exists (HTTP 409) fall back to PATCH
        if _already_exists(e):
            try:
                run_gh(
                    [
                        "api",
                        f"repos/{repo}/actions/variables/{var_name}",
                        "--method",
                        "PATCH",
                        "-f",
                        f"value={value_json}",
                    ],
                    repo=repo,
                )
            except Exception as ee:
                print(f"Notice: Failed to patch quota variable {var_name}: {ee}", file=sys.stderr)
        else:
            print(f"Notice: Failed to create quota variable {var_name}: {e}", file=sys.stderr)
    prov_name = "DARKFACTORY_QUOTA_PROVIDERS"
    existing = {}
    try:
        raw = run_gh(
            [
                "api",
                f"repos/{repo}/actions/variables/{prov_name}",
                "--method",
                "GET",
            ],
            repo=repo,
        )
        data = json.loads(raw)
        if isinstance(data, dict) and "value" in data:
            existing = json.loads(data["value"]) if data["value"] else {}
    except subprocess.CalledProcessError:
        existing = {}
    except Exception as ee:
        print(f"Notice: Failed to read provider map {prov_name}: {ee}", file=sys.stderr)
    for p in providers:
        existing[p] = max(existing.get(p, 0), reset_at)
    prov_json = json.dumps(existing, separators=(",", ":"))
    # Write back provider map (POST if missing, otherwise PATCH)
    try:
        run_gh(
            [
                "api",
                f"repos/{repo}/actions/variables",
                "--method",
                "POST",
                "-f",
                f"name={prov_name}",
                "-f",
                f"value={prov_json}",
            ],
            repo=repo,
        )
    except subprocess.CalledProcessError as e:
        if _already_exists(e):
            try:
                run_gh(
                    [
                        "api",
                        f"repos/{repo}/actions/variables/{prov_name}",
                        "--method",
                        "PATCH",
                        "-f",
                        f"value={prov_json}",
                    ],
                    repo=repo,
                )
            except Exception as ee:
                print(f"Notice: Failed to patch provider map {prov_name}: {ee}", file=sys.stderr)
        else:
            print(f"Notice: Failed to create provider map {prov_name}: {e}", file=sys.stderr)


def try_gh(args: List[str], repo: Optional[str] = None, doing: str = "") -> Optional[str]:
    """Runs a `gh` command whose failure must not end the run.

    Classification is the clearest case: an agent that cannot apply a label has still read the
    issue, can still interpret it, and can still be useful. Aborting there threw away the whole run
    and filed a pipeline-failure issue whose only content was a traceback.

    Args:
        args: Arguments following the `gh` executable.
        repo: Optional repository slug.
        doing: What was being attempted, for the message.

    Returns:
        Command stdout, or `None` when it failed.
    """
    try:
        return run_gh(args, repo=repo)
    except subprocess.CalledProcessError as exc:
        what = doing or " ".join(args[:2])
        print(f"Could not {what}: {exc.stderr or exc}", file=sys.stderr)
        return None


def is_bot_or_agent_comment(user_login: str, body: str) -> bool:
    """Detects whether a comment originated from automation or the agent itself."""
    if (
        user_login.endswith("[bot]")
        or user_login == "app/github-actions"
        or user_login == "github-actions"
    ):
        return True
    lower = body.strip().lower()
    if (
        lower.startswith("### darkfactory agent")
        or lower.startswith("### omnis agent")
        or lower.startswith("### implementation plan")
        or lower.startswith("### implementation review")
        or "[darkfactory agent" in lower
        or "[omnis agent" in lower
        or "autogenerated by the darkfactory agent" in lower
        or "autogenerated by the omnis agent" in lower
        or "<!-- darkfactory-agent -->" in lower
        or "<!-- omnis-agent -->" in lower
    ):
        return True
    return False


#: Recognises an approval, which must be the whole comment.
#:
#: Deliberately strict, and it was briefly loosened by mistake. A comment carrying anything besides
#: the word is feedback, and feedback has its own path: it reaches `handle_respond`, the agent
#: answers or amends, and the reviewer then approves cleanly once satisfied.
#:
#: Accepting "three concerns, and approve" would collapse those two acts into one ambiguous
#: message - nobody can tell whether the concerns were meant to be addressed first. Requiring the
#: word to stand alone is what keeps a decision distinguishable from a discussion.
#:
#: The grammar itself lives in :mod:`commands` so the issue gates here and the merge gate in
#: `handle_pr_approval` parse the same commands. This alias keeps the historic name working.
APPROVAL_PATTERN = ISSUE_COMMAND_RE


def is_quota_exhausted(error_message: str) -> bool:
    """Detects whether an error indicates quota or rate limit exhaustion.

    Args:
        error_message: Error string or subprocess stderr/stdout.

    Returns:
        True if the error message indicates quota or rate limit exhaustion, False otherwise.
    """
    if not error_message:
        return False
    for pattern in QUOTA_EXHAUSTION_PATTERNS:
        if (
            pattern.search(error_message)
            if hasattr(pattern, "search")
            else re.search(pattern, error_message, re.IGNORECASE)
        ):
            return True
    return False


#: Authentication failure wording. One stale secret must not stop a healthy chain: a 401/403,
#: an expired token, or a rejected key rotates to the next account/harness exactly like quota,
#: because an unused credential is always a better answer than failing. Matched against the same
#: subprocess output as quota, never against an agent's answer text.
AUTH_FAILURE_PATTERNS: List[re.Pattern] = [
    re.compile(r"(?:status[_\s]*(?:code)?|http|error|code)\s*[:=]?\s*40[123]\b", re.IGNORECASE),
    re.compile(r"\b401\s*[:=\-]?\s*(?:unauthorized|invalid|expired)", re.IGNORECASE),
    re.compile(r"\bunauthorized\b", re.IGNORECASE),
    re.compile(
        r"\binvalid[_\s-]*(?:api[_\s-]*key|token|oauth|grant|credentials?)\b", re.IGNORECASE
    ),
    re.compile(r"\bexpired[_\s-]*token\b", re.IGNORECASE),
    re.compile(r"\binvalid_grant\b", re.IGNORECASE),
    re.compile(r"\bauthentication\s*(?:failed|expired|required)\b", re.IGNORECASE),
    re.compile(
        r"\b(?:token|credential|api[_\s-]*key)\s*(?:expired|invalid|revoked)\b", re.IGNORECASE
    ),
]


def is_auth_failure(error_message: str) -> bool:
    """Detects whether an error indicates a rejected or expired credential.

    Args:
        error_message: Error string or subprocess stderr/stdout.

    Returns:
        True if the error message indicates an authentication failure, False otherwise.
    """
    if not error_message:
        return False
    for pattern in AUTH_FAILURE_PATTERNS:
        if pattern.search(error_message):
            return True
    return False


#: Maximum length of an exit-0 stdout treated as a failure report rather than an answer. CLI
#: error reports are terse single lines; agent answers run long, so a short report carrying
#: quota or auth wording rotates instead of being posted as the agent's reply.
SHORT_REPORT_LIMIT: int = 300


#: Prefix of the notice `run_agent_prompt` returns once every harness, account and model is out of
#: quota. Callers test for this notice and never for quota wording: an agent's answer may discuss
#: quotas and rate limits (a Request about quota handling always does), and reading that answer as
#: exhaustion drops it without a comment - the run stays green and the issue waits forever.
QUOTA_EXHAUSTED_NOTICE = "[DarkFactory Agent Execution Error]: Quota exhausted"


def is_quota_exhaustion_notice(result: str) -> bool:
    """Detects the runner's own out-of-quota notice in a `run_agent_prompt` result.

    Args:
        result: What `run_agent_prompt` returned - an agent's answer or an error notice.

    Returns:
        True only for the exhaustion notice, which has already checkpointed the work and marked
        the issue Blocked, so there is nothing left for the caller to post.
    """
    return bool(result) and result.startswith(QUOTA_EXHAUSTED_NOTICE)


#: Print-mode timeout wording from the harness CLIs. `agy --print-timeout 5m0s` exits 0 after its
#: time budget with no (or partial) stdout, which the runner used to treat as a perfect answer and
#: post as an empty shell comment. The wording is what separates that silent truncation from a real
#: reply, so a reply carrying it is a failed attempt like any other.
PRINT_TIMEOUT_PATTERNS: List[re.Pattern] = [
    re.compile(r"\bprint[_\s-]?timeout\b", re.IGNORECASE),
    re.compile(r"\btimed?\s*out\b[^\n]{0,60}\b(?:print|output|response|result)\b", re.IGNORECASE),
    re.compile(r"\bprint\b[^\n]{0,40}\btimed?\s*out\b", re.IGNORECASE),
]


def is_print_timeout(text: str) -> bool:
    """Detects whether a harness invocation hit its print-mode time budget.

    A Harness reached for ``--print-timeout`` because a coding agent sitting on a TTY will keep a
    turn alive forever; the timeout is what makes ``--print`` usable in CI. The CLIs that honour
    it do so by exiting 0 once the budget is spent, which is invisible to ``check=True``.

    Args:
        text: The attempt's stdout and stderr, combined.

    Returns:
        True when the text carries print-mode timeout wording.
    """
    if not text:
        return False
    for pattern in PRINT_TIMEOUT_PATTERNS:
        if pattern.search(text):
            return True
    return False


def _bounded_tail(text: str, limit: int = 2000) -> str:
    """Cuts a log tail down to a bounded size, keeping the most recent end.

    Args:
        text: The text to truncate.
        limit: Maximum number of characters to keep.

    Returns:
        The tail, marked where it was truncated.
    """
    if not text:
        return ""
    compact = text.strip()
    if len(compact) <= limit:
        return compact
    return f"...[{len(compact) - limit} characters omitted]...\n{compact[-limit:]}"


def redact_secrets(text: str) -> str:
    """Replaces known credential values in a log or error line before it is written.

    Harness credentials live in the environment and may legitimately appear in a CLI's stderr;
    the account being run is named in the job log, its credential never is.

    Args:
        text: Text that may embed credential values.

    Returns:
        The text with every known credential value replaced by `***`.
    """
    if not text:
        return text
    names = set(harnesses.credential_env_names())
    # Every registered harness, not only the default chain: a chain override can still run one,
    # and the df setup reads its own secrets.
    for registered in harnesses.REGISTRY.values():
        if registered.auth is not None:
            names.update(registered.auth.secret_names())
    names.update(df_setup_secret_names())
    names.update(("GH_TOKEN", "GH_PROJECT_TOKEN", "GITHUB_TOKEN"))
    for name in sorted(names):
        value = os.environ.get(name, "")
        if len(value) >= 8 and value in text:
            text = text.replace(value, "***")
    return text


#: Matches a `file://` URL in agent output. Coding-agent CLIs cite local paths this way, which
#: is a broken link on GitHub: it points at the reader's own machine, not the repository.
_FILE_URL_RE = re.compile(r"file://([^\s)'\"<>]+)")


def rewrite_file_links(text: str, repo: str = "", branch: str = "") -> str:
    """Rewrites `file://` URLs in agent output into repository links or plain paths.

    Args:
        text: Agent output that may contain `file://` URLs.
        repo: Repository slug (`owner/name`) used to build blob links when known.
        branch: Branch the blob link points at.

    Returns:
        The text with every `file://` URL replaced by a GitHub blob link when the repository
        and branch are known, otherwise by a plain code path.
    """
    if not text or "file://" not in text:
        return text

    def _replace(match: re.Match) -> str:
        raw = match.group(1).strip()
        path = raw.lstrip("/")
        for prefix in ("home/agent/", "home/runner/work/", "github/workspace/", "workspace/"):
            if path.startswith(prefix):
                path = path[len(prefix) :]
                break
        path = re.sub(r"^home/[^/]+/", "", path)
        path = re.sub(
            r"^[^/]+/[^/]+/[^/]+/(?=\.github/|\.agents/|src/|tests/|docs/|bin/)", "", path
        )
        if not path:
            return match.group(0)
        if path.startswith(("usr/", "opt/", "etc/", "tmp/", "var/", "proc/")):
            return f"`{raw.rstrip('/').split('/')[-1]}`"
        if repo and branch:
            return f"[{path}](https://github.com/{repo}/blob/{branch}/{path})"
        return f"`{path}`"

    return _FILE_URL_RE.sub(_replace, text)


def fail_agent_run(message: str) -> NoReturn:
    """Exits non-zero after an agent failure notice has been posted.

    A posted `[Execution Error]` comment used to be followed by a normal return, so the
    container exited 0 and `report-failure.yml` saw success and filed nothing. Quota
    exhaustion of the whole chain keeps its own path (checkpoint + `Blocked`, run stays
    green) and never comes through here.

    Args:
        message: The failure reason, already posted as a comment.

    Raises:
        SystemExit: Always, with exit code 1.
    """
    print(message, file=sys.stderr)
    raise SystemExit(1)


def calculate_backoff(
    attempt: int,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    jitter_factor: float = 0.5,
) -> float:
    """Calculates exponential backoff delay with jitter.

    Args:
        attempt: Zero-based retry attempt number.
        base_delay: Initial delay in seconds.
        backoff_factor: Multiplier for exponential backoff.
        max_delay: Upper bound for backoff delay.
        jitter: Whether to add random jitter.
        jitter_factor: Maximum fraction of computed delay added as jitter.

    Returns:
        Delay in seconds.
    """
    if max_delay <= 0:
        return 0.0
    safe_attempt = max(0, min(attempt, 30))
    raw_delay = base_delay * (backoff_factor**safe_attempt)
    if not jitter or jitter_factor <= 0:
        return min(max_delay, raw_delay)

    max_base = max_delay / (1.0 + jitter_factor)
    effective_base = min(raw_delay, max_base)
    delay = effective_base + random.uniform(0.0, effective_base * jitter_factor)
    return min(max_delay, delay)


def get_model_fallback_chain(
    initial_model: Optional[str] = None,
    custom_chain: Optional[List[str]] = None,
) -> List[str]:
    """Returns the ordered model fallback chain starting with the initial model.

    Args:
        initial_model: The starting model ID or tier.
        custom_chain: Optional explicit list of models to use.

    Returns:
        List of model identifiers to attempt in order.
    """
    if custom_chain is not None:
        chain = list(custom_chain)
        if not initial_model:
            return chain
        if initial_model in chain:
            idx = chain.index(initial_model)
            return chain[idx:]
        else:
            return [initial_model] + chain

    if not initial_model:
        return list(DEFAULT_MODEL_FALLBACK_CHAIN)

    if initial_model in DEFAULT_MODEL_FALLBACK_CHAIN:
        idx = DEFAULT_MODEL_FALLBACK_CHAIN.index(initial_model)
        return list(DEFAULT_MODEL_FALLBACK_CHAIN[idx:])
    else:
        return [initial_model] + list(DEFAULT_MODEL_FALLBACK_CHAIN)


def _exclude_checkpoint_from_git(git_dir: str) -> None:
    """Appends CHECKPOINT_FILENAME to .git/info/exclude if not already present.

    Handles standard git repositories, git worktrees, and submodules where .git
    may be a file containing a gitdir pointer.
    """
    git_entry = os.path.join(git_dir, ".git")
    git_info_dir = None
    if os.path.isdir(git_entry):
        git_info_dir = os.path.join(git_entry, "info")
    elif os.path.isfile(git_entry):
        try:
            with open(git_entry, "r", encoding="utf-8") as f:
                content = f.read().strip()
            if content.startswith("gitdir:"):
                gitdir_path = content.split(":", 1)[1].strip()
                if not os.path.isabs(gitdir_path):
                    gitdir_path = os.path.normpath(os.path.join(git_dir, gitdir_path))
                git_info_dir = os.path.join(gitdir_path, "info")
        except Exception:
            pass

    if git_info_dir:
        exclude_file = os.path.join(git_info_dir, "exclude")
        try:
            os.makedirs(os.path.dirname(exclude_file), exist_ok=True)
            content = ""
            if os.path.isfile(exclude_file):
                with open(exclude_file, "r", encoding="utf-8") as f:
                    content = f.read()
            if CHECKPOINT_FILENAME not in content:
                with open(exclude_file, "a", encoding="utf-8") as f:
                    if content and not content.endswith("\n"):
                        f.write("\n")
                    f.write(f"{CHECKPOINT_FILENAME}\n")
        except Exception:
            pass


def save_checkpoint(checkpoint_data: Dict[str, Any], cwd: Optional[str] = None) -> str:
    """Saves checkpoint data to a JSON file in the target workspace directory.

    Args:
        checkpoint_data: Checkpoint payload dictionary.
        cwd: Directory where checkpoint file should be written (defaults to STATE_DIR).

    Returns:
        Absolute path to the saved checkpoint file.
    """
    target_dir = cwd or STATE_DIR
    os.makedirs(target_dir, exist_ok=True)
    _exclude_checkpoint_from_git(target_dir)
    checkpoint_file = os.path.join(target_dir, CHECKPOINT_FILENAME)
    tmp_file = f"{checkpoint_file}.tmp.{uuid.uuid4().hex}"
    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(checkpoint_data, f, indent=2, default=str)
        os.replace(tmp_file, checkpoint_file)
    except Exception as e:
        print(f"Notice: Failed to save checkpoint file: {e}", file=sys.stderr)
        raise
    finally:
        if os.path.exists(tmp_file):
            try:
                os.remove(tmp_file)
            except OSError:
                pass
    return checkpoint_file


def load_checkpoint(cwd: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Loads checkpoint data from the workspace directory if present.

    Args:
        cwd: Directory to look for checkpoint file (defaults to STATE_DIR).

    Returns:
        Checkpoint dictionary if found and valid, None otherwise.
    """
    target_dir = cwd or STATE_DIR
    checkpoint_file = os.path.join(target_dir, CHECKPOINT_FILENAME)
    if os.path.isfile(checkpoint_file):
        try:
            with open(checkpoint_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
            print(f"Notice: Checkpoint data is not a dict: {type(data)}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"Notice: Failed to read checkpoint file: {e}", file=sys.stderr)
    return None


def clear_checkpoint(cwd: Optional[str] = None) -> None:
    """Removes the checkpoint file from the workspace directory if present.

    Args:
        cwd: Directory to clear checkpoint from (defaults to STATE_DIR).
    """
    target_dir = cwd or STATE_DIR
    checkpoint_file = os.path.join(target_dir, CHECKPOINT_FILENAME)
    if os.path.exists(checkpoint_file):
        try:
            os.remove(checkpoint_file)
        except OSError as e:
            print(f"Notice: Failed to remove checkpoint file: {e}", file=sys.stderr)


def is_workflow_permission_error(error_message: str) -> bool:
    """Detects whether a git push failure was caused by missing workflow permissions.

    Args:
        error_message: Git stderr or stdout string.

    Returns:
        True if rejected due to missing workflow write permissions.
    """
    if not error_message:
        return False
    lower = error_message.lower()
    return "without workflows permission" in lower or (
        "refusing to allow a github app to create or update workflow" in lower
    )


def run_git(args: List[str], cwd: Optional[str] = None) -> str:
    """Executes a git command and returns stdout.

    Args:
        args: Git subcommand and arguments.
        cwd: Working directory (defaults to WORKSPACE_DIR).

    Returns:
        Command stdout stripped.

    Raises:
        subprocess.CalledProcessError: If git command fails.
    """
    cmd = ["git"] + args
    try:
        res = subprocess.run(
            cmd, capture_output=True, text=True, check=True, cwd=cwd or WORKSPACE_DIR
        )
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Git command failed ({' '.join(cmd)}):\n{e.stderr}", file=sys.stderr)
        raise


def update_project_status_blocked(
    issue_or_pr_number: int,
    repo: str,
    is_pr: bool = False,
    client: Optional[Any] = None,
) -> None:
    """Updates the project board status to Blocked and adds the Blocked label.

    Args:
        issue_or_pr_number: GitHub issue or pull request number.
        repo: Repository slug (owner/repo).
        is_pr: Whether the entity is a pull request.
        client: Optional GitHubProjectClient instance.
    """
    # 1. Add Blocked label to issue or PR
    label_cmd = (
        ["pr", "edit", str(issue_or_pr_number), "--add-label", "Blocked"]
        if is_pr
        else ["issue", "edit", str(issue_or_pr_number), "--add-label", "Blocked"]
    )
    try:
        run_gh(label_cmd, repo=repo)
    except Exception as e:
        print(f"Notice: Failed to add Blocked label: {e}", file=sys.stderr)

    # 2. Update Project status to Blocked
    owner = repo.split("/")[0] if "/" in repo else PROJECT_OWNER
    entity_url = (
        f"https://github.com/{repo}/pull/{issue_or_pr_number}"
        if is_pr
        else f"https://github.com/{repo}/issues/{issue_or_pr_number}"
    )

    if client is None:
        try:
            from project_automation import GitHubProjectClient

            client = GitHubProjectClient(owner=owner, project_number=PROJECT_NUMBER)
        except Exception as e:
            print(f"Notice: Failed to instantiate GitHubProjectClient: {e}", file=sys.stderr)
            client = None

    if client is not None:
        try:
            if hasattr(client, "set_status_label"):
                client.set_status_label(repo, issue_or_pr_number, "Blocked")
            if hasattr(client, "set_status"):
                client.set_status(entity_url, "Blocked")
            else:
                item_id = client.add_item(entity_url)
                if item_id:
                    client.edit_status(item_id, "Blocked")
                    print(f"Updated project board status to Blocked for {entity_url}")
        except Exception as e:
            print(f"Notice: Failed to update project status: {e}", file=sys.stderr)


block_entity = update_project_status_blocked


def unblock_entity(
    issue_or_pr_number: int,
    repo: str,
    is_pr: bool = False,
    client: Optional[Any] = None,
    target_status: str = "In Progress",
) -> None:
    """Removes the Blocked label and updates the project board status.

    Args:
        issue_or_pr_number: GitHub issue or pull request number.
        repo: Repository slug (owner/repo).
        is_pr: Whether the entity is a pull request.
        client: Optional GitHubProjectClient instance.
        target_status: Target status to set on the project board (defaults to "In Progress").
    """
    # 1. Remove Blocked label from issue or PR
    label_cmd = (
        ["pr", "edit", str(issue_or_pr_number), "--remove-label", "Blocked"]
        if is_pr
        else ["issue", "edit", str(issue_or_pr_number), "--remove-label", "Blocked"]
    )
    try:
        run_gh(label_cmd, repo=repo)
    except Exception as e:
        print(f"Notice: Failed to remove Blocked label: {e}", file=sys.stderr)

    # 2. Update Project status and status label
    owner = repo.split("/")[0] if "/" in repo else PROJECT_OWNER
    entity_url = (
        f"https://github.com/{repo}/pull/{issue_or_pr_number}"
        if is_pr
        else f"https://github.com/{repo}/issues/{issue_or_pr_number}"
    )

    if client is None:
        try:
            from project_automation import GitHubProjectClient

            client = GitHubProjectClient(owner=owner, project_number=PROJECT_NUMBER)
        except Exception as e:
            print(f"Notice: Failed to instantiate GitHubProjectClient: {e}", file=sys.stderr)
            client = None

    if client is not None:
        try:
            if hasattr(client, "set_status_label"):
                client.set_status_label(repo, issue_or_pr_number, target_status)
            if hasattr(client, "set_status"):
                client.set_status(entity_url, target_status)
            else:
                item_id = client.add_item(entity_url)
                if item_id:
                    client.edit_status(item_id, target_status)
                    print(f"Updated project board status to {target_status} for {entity_url}")
        except Exception as e:
            print(f"Notice: Failed to update project status: {e}", file=sys.stderr)


def checkpoint_and_notify_exhaustion(
    issue_number: int,
    repo: str,
    completed_steps: Optional[List[str]] = None,
    branch_name: Optional[str] = None,
    is_pr: bool = False,
    error_detail: str = "",
    cwd: Optional[str] = None,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """Gracefully checkpoints progress, posts user notification, and updates project status to Blocked.

    Args:
        issue_number: Target issue or PR number to notify.
        repo: Repository slug.
        completed_steps: List of completed pipeline steps up to exhaustion.
        branch_name: Active git branch name if applicable.
        is_pr: Whether target is a pull request.
        error_detail: Detailed error message explaining exhaustion.
        cwd: Working directory (defaults to WORKSPACE_DIR).
        client: Optional GitHubProjectClient for project board update.

    Returns:
        Checkpoint dictionary saved.
    """
    work_dir = cwd or WORKSPACE_DIR
    target_state_dir = work_dir
    steps = completed_steps or ["Pipeline execution initiated"]

    checkpoint_data: Dict[str, Any] = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "issue_number": issue_number,
        "repo": repo,
        "is_pr": is_pr,
        "branch_name": branch_name,
        "completed_steps": steps,
        "status": "Blocked",
        "error_detail": error_detail,
    }

    # 1. Save checkpoint JSON
    save_checkpoint(checkpoint_data, cwd=target_state_dir)

    # 2. Git checkpoint: stage and commit any working changes
    if branch_name:
        try:
            run_git(["add", "-A"], cwd=work_dir)
            status = run_git(["status", "--porcelain"], cwd=work_dir)
            if status:
                run_git(
                    ["commit", "-m", "chore(ci): checkpoint progress on quota exhaustion"],
                    cwd=work_dir,
                )
                try:
                    run_git(["push", "origin", branch_name], cwd=work_dir)
                except Exception as pe:
                    print(f"Notice: Git push during checkpoint notice: {pe}", file=sys.stderr)
        except Exception as ge:
            print(f"Notice: Git checkpoint notice: {ge}", file=sys.stderr)

    # 3. Post structured notice comment
    steps_formatted = "\n".join([f"- [x] {s}" for s in steps])
    models_formatted = harnesses.describe_chain()

    # Automatic resume time computation
    reset_at = next_quota_reset(error_detail, time.time())
    reset_at_utc = (
        datetime.fromtimestamp(reset_at, tz=timezone.utc)
        .replace(microsecond=0)
        .strftime("%Y-%m-%d %H:%M:%S UTC")
    )

    comment_body = (
        "<!-- darkfactory-agent -->\n"
        "### ⚠️ DarkFactory Agent Quota Exhaustion Notice\n\n"
        "Execution has paused because API quota was exhausted across every configured "
        "harness and model:\n"
        f"{models_formatted}\n\n"
        "#### Completed Steps\n"
        f"{steps_formatted}\n\n"
        "#### Checkpoint Information\n"
        f"- **Branch**: `{branch_name or 'N/A'}`\n"
        f"- **Automatic Resume**: {reset_at_utc}\n"
        "- **Checkpoint**: Progress preserved in `.antigravity_checkpoint.json`\n"
        "- **Project Status**: Updated to `Blocked`\n\n"
        "#### Instructions to Resume\n"
        f"{RESUME_INSTRUCTIONS}\n"
    )
    if error_detail:
        comment_body += f"\n<details><summary>Error Details</summary>\n\n```\n{error_detail.strip()}\n```\n</details>\n"

    try:
        if is_pr:
            run_gh(["pr", "comment", str(issue_number), "--body", comment_body], repo=repo)
        else:
            run_gh(["issue", "comment", str(issue_number), "--body", comment_body], repo=repo)
    except Exception as e:
        print(f"Notice: Failed to post quota exhaustion notice comment: {e}", file=sys.stderr)

    # 4. Update Project Board Status to Blocked
    update_project_status_blocked(issue_number, repo=repo, is_pr=is_pr, client=client)

    # 5. Record quota block in repository variables
    run_id = os.environ.get("GITHUB_RUN_ID")
    if run_id:
        import re

        m = re.search(r"across every harness and model\s*\(([^)]+)\)", error_detail)
        providers = []
        if m:
            providers = [p.strip() for p in m.group(1).split(",")]
        try:
            record_quota_block(repo, issue_number, is_pr, reset_at, providers, run_id)
        except Exception as error:  # noqa: BLE001 - recording the block must never fail the notice
            print(f"Notice: could not record the quota block: {error}", file=sys.stderr)
    return checkpoint_data


def _post_agent_failure_notice(
    message: str,
    checkpoint_context: Optional[Dict[str, Any]],
) -> None:
    """Posts a short failure notice where an agent produced no output anywhere.

    Every attempt running the prompt came back empty or print-timed-out, so there is no agent text
    to relay. The comment still had to say something, because an execution that ends without any
    trace looks exactly like one that was never run.

    Args:
        message: The failure reason, already redacted.
        checkpoint_context: Context carrying the target issue/PR and repository.
    """
    if not checkpoint_context:
        return
    issue_number = checkpoint_context.get("issue_number")
    if not issue_number:
        return
    repo = checkpoint_context.get("repo") or os.environ.get(
        "GITHUB_REPOSITORY", "marius-patrik/DarkFactory"
    )
    body = (
        "<!-- darkfactory-agent -->\n"
        "### DarkFactory Agent Execution Error\n\n"
        f"{redact_secrets(message)}"
    )
    try:
        if checkpoint_context.get("is_pr"):
            run_gh(["pr", "comment", str(issue_number), "--body", body], repo=repo)
        else:
            run_gh(["issue", "comment", str(issue_number), "--body", body], repo=repo)
    except (
        Exception
    ) as e:  # noqa: BLE001 - the run is already failing; a notice must not replace it
        print(f"Notice: Failed to post agent output failure notice: {e}", file=sys.stderr)


#: Appended to every prompt. The pipeline posts or parses the agent's final message, and nobody can
#: reply during a run: #227's plan was written to a file inside the container and the comment only
#: asked whether to post it, so the plan never reached the issue.
ANSWER_CONTRACT = (
    "\n\nThis is a non-interactive pipeline run. Your final message is used verbatim (posted as "
    "the GitHub comment or read by the pipeline), so put the complete result in that message. Do "
    "not write the result to a file instead, do not summarise a file, and do not ask for "
    "confirmation or offer options: nobody can reply until the run has ended."
)


#: df exit codes, from ``exitCodeFor`` in the harness source (``harness/src/cli.ts``): 2 means
#: quota was exhausted on every candidate in df's chain, 3 means every candidate failed to
#: authenticate, and anything else nonzero is a genuine error.
DF_EXIT_QUOTA_EXHAUSTED = 2
DF_EXIT_AUTH_FAILED = 3


def parse_df_json_output(stdout: str) -> str:
    """Extracts the final answer text from a ``df run --json`` event stream.

    ``df`` streams one JSON object per line — session, text deltas, tool start/end, failover,
    step, result and error events — and the result event carries no text itself. The answer is
    the assistant text streamed after the last tool call, so deltas are collected into segments
    split at every tool event and only the final segment is kept. A run that never touches a
    tool answers with the whole stream.

    Args:
        stdout: Captured standard output of ``df run --json``.

    Returns:
        The final answer text, stripped, or an empty string when no text delta was streamed.
    """
    segments: List[List[str]] = [[]]
    for line in (stdout or "").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            continue
        if not isinstance(event, dict):
            continue
        kind = event.get("type")
        if kind == "text_delta":
            delta = event.get("delta")
            if isinstance(delta, str) and delta:
                segments[-1].append(delta)
        elif kind in ("tool_start", "tool_end", "failover") or (
            kind == "step" and (event.get("errorMessage") or event.get("stopReason") == "error")
        ):
            # A new segment starts after each tool call and after an attempt that failed; the
            # closing ``step`` of a successful turn follows its text and must not clear it.
            segments.append([])
    return "".join(segments[-1]).strip()


def parse_df_error_message(stdout: str) -> str:
    """Reads the error message from a failed ``df run --json`` invocation.

    A failing df run prints a final ``{"type": "error", "message": ...}`` line on stdout beside
    its nonzero exit. That message names the failing candidate and the reason without ever
    carrying a secret — df redacts credentials itself — so it is safe to surface.

    Args:
        stdout: Captured standard output of the failed invocation.

    Returns:
        The last error event's message, or an empty string when there is none.
    """
    message = ""
    for line in (stdout or "").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            continue
        if (
            isinstance(event, dict)
            and event.get("type") == "error"
            and isinstance(event.get("message"), str)
        ):
            message = event["message"]
    return message.strip()


def df_failure_detail(exc: "subprocess.CalledProcessError", detail: str) -> str:
    """Builds the failure detail for a ``df`` invocation that exited nonzero.

    Two things are folded in beside the captured output. The parsed error event message is first,
    because it is df's own summary of what failed. And the exit code is translated into the
    runner's wording — exit 2 is quota exhausted on every candidate — so the single
    ``is_quota_exhausted`` check below keeps working: the quota decision stays in one place
    rather than gaining a second, exit-code-shaped branch beside it.

    Args:
        exc: The failed invocation.
        detail: Stderr and stdout already captured for the attempt.

    Returns:
        The detail the quota/error paths decide on.
    """
    parts: List[str] = []
    message = parse_df_error_message(exc.stdout or "")
    if message:
        parts.append(message)
    if detail and detail not in message:
        parts.append(detail)
    if exc.returncode == DF_EXIT_QUOTA_EXHAUSTED:
        parts.append("df exit code 2: quota exhausted on every candidate in the chain")
    elif exc.returncode == DF_EXIT_AUTH_FAILED:
        parts.append("df exit code 3: authentication failed on every candidate in the chain")
    return "\n".join(parts).strip() or str(exc)


#: Environment variables mapped onto ``df account set`` calls: ``(variable, account id, slot)``.
#: The value travels on stdin, never in argv or logs. Provider ids and the ``provider:label``
#: account syntax are df's own (see the harness source, ``harness/src/cli.ts`` and
#: ``assets/providers.defaults.json``): ``google`` reads ``GEMINI_API_KEY``, ``openrouter`` reads
#: ``OPENROUTER_API_KEY``, ``groq`` reads ``GROQ_API_KEY``.
DF_ACCOUNT_SET_MAP = (
    ("GEMINI_API_KEY", "google:default", "api_key"),
    ("GEMINI_API_KEY_2", "google:key2", "api_key"),
    ("GEMINI_API_KEY_3", "google:key3", "api_key"),
    ("OPENROUTER_API_KEY", "openrouter:default", "api_key"),
    ("OPENROUTER_API_KEY_2", "openrouter:acct2", "api_key"),
    ("GROQ_API_KEY", "groq:default", "api_key"),
)

#: Subscription logins df loads as df-owned accounts: ``(variable, account id)``.
#: Loaded with ``df account load <account> --from-env <variable>``.
DF_ACCOUNT_LOAD_MAP = (
    ("DF_ACCOUNT_OPENAI_CODEX", "openai-codex:pipeline"),
    ("DF_ACCOUNT_GROK_SUB", "grok-sub:pipeline"),
)


def df_setup_secret_names() -> Tuple[str, ...]:
    """Returns every secret name the df container setup consumes, in setup order.

    This is the list ``agent.yml`` must declare and forward: a workflow that omits one does not
    fail, it silently drops that df account. Kept beside the maps that consume them so the guard
    test can assert the workflow and the setup cannot disagree.

    Returns:
        Secret variable names, without repeats.
    """
    names: List[str] = [variable for variable, _, _ in DF_ACCOUNT_SET_MAP]
    names.extend(variable for variable, _ in DF_ACCOUNT_LOAD_MAP)
    seen: List[str] = []
    for name in names:
        if name not in seen:
            seen.append(name)
    return tuple(seen)


def find_df_config() -> Optional[str]:
    """Locates the df chain config for this run.

    Repository-specific data lives in ``.darkfactory/``: the target repository's own
    ``.darkfactory/df/config.json`` wins, falling back to the pipeline's copy checked out at
    ``.darkfactory-pipeline/`` when a consumer has none yet.

    Returns:
        Path of the config file, or ``None`` when neither exists.
    """
    candidates = (
        os.path.join(WORKSPACE_DIR, ".darkfactory", "df", "config.json"),
        os.path.join(WORKSPACE_DIR, ".darkfactory-pipeline", ".darkfactory", "df", "config.json"),
    )
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


#: Set after the first ``setup_df_accounts`` call so repeated calls (``main`` then
#: ``dispatch_event``) reuse the same ``DF_HOME`` instead of reconfiguring every account.
_DF_SETUP_HOME: Optional[str] = None


def setup_df_accounts() -> str:
    """Configures df's accounts from the environment before dispatch.

    Points ``DF_HOME`` at a fresh temp dir, copies the chain config there, saves every populated
    API key with ``df account set`` (value on stdin, never printed), and loads each populated
    subscription account record with ``df account load``. Empty variables are skipped: a
    repository holding three of the keys gets a shorter chain, not a failure. A failure to reach
    ``df`` at all is a notice, not a fatal error, so local runs without the harness still
    dispatch.

    Called exactly once per process; a second call returns the existing ``DF_HOME``.

    Returns:
        The ``DF_HOME`` directory the run uses.
    """
    global _DF_SETUP_HOME
    if _DF_SETUP_HOME is not None:
        return _DF_SETUP_HOME
    df_home = tempfile.mkdtemp(prefix="df-home-")
    _DF_SETUP_HOME = df_home
    os.environ["DF_HOME"] = df_home
    df_env = {**os.environ, "DF_HOME": df_home}
    try:
        source = find_df_config()
        if source:
            shutil.copy(source, os.path.join(df_home, "config.json"))
            print(f"Using df chain config from {source}.")
        else:
            print(
                "No .darkfactory/df/config.json found; df uses its built-in default chain.",
                file=sys.stderr,
            )
    except Exception as exc:  # noqa: BLE001 - a missing config must not stop the run
        print(f"df config notice: {exc}", file=sys.stderr)

    for variable, account, slot in DF_ACCOUNT_SET_MAP:
        value = os.environ.get(variable, "")
        if not value:
            continue
        try:
            subprocess.run(
                ["df", "account", "set", account, slot, "--type", "api_key"],
                input=value,
                text=True,
                capture_output=True,
                check=True,
                env=df_env,
            )
            print(f"Configured df account {account} from {variable}.")
        except FileNotFoundError:
            print("df binary not found; skipping df account setup.", file=sys.stderr)
            return df_home
        except Exception as exc:  # noqa: BLE001 - one bad key must not drop the rest
            print(f"df account setup notice for {account}: {exc}", file=sys.stderr)

    for variable, account in DF_ACCOUNT_LOAD_MAP:
        content = os.environ.get(variable, "")
        if not content:
            continue
        try:
            subprocess.run(
                ["df", "account", "load", account, "--from-env", variable],
                capture_output=True,
                text=True,
                check=True,
                env=df_env,
            )
            print(f"Loaded df account {account} from {variable}.")
        except FileNotFoundError:
            print("df binary not found; skipping df account setup.", file=sys.stderr)
            return df_home
        except Exception as exc:  # noqa: BLE001 - one bad login must not drop the rest
            print(f"df account load notice for {account}: {exc}", file=sys.stderr)
    return df_home


def snapshot_df_login_files() -> List[Tuple[str, str, Optional[Any]]]:
    """Snapshots the df-owned account records that can rotate during a run.

    The snapshot records the initial account state for each loaded account so
    :func:`finish_df_login_files` can detect refreshed OAuth tokens and write them back to
    the secret they were loaded from.

    Returns:
        List of ``(account id, secret variable, original record)``.
    """
    states: List[Tuple[str, str, Optional[Any]]] = []
    df_home = os.environ.get("DF_HOME", "")
    store_path = os.path.join(df_home, "credentials.json") if df_home else ""
    accounts_store: Dict[str, Any] = {}
    if store_path and os.path.isfile(store_path):
        try:
            with open(store_path, "r", encoding="utf-8") as stream:
                accounts_store = json.load(stream).get("accounts", {})
        except (OSError, ValueError):
            accounts_store = {}

    for variable, account in DF_ACCOUNT_LOAD_MAP:
        original: Optional[Any] = accounts_store.get(account)
        if original is None:
            raw = os.environ.get(variable, "")
            if raw:
                try:
                    original = json.loads(raw)
                except ValueError:
                    original = raw
        states.append((account, variable, original))
    return states


def finish_df_login_files(states: List[Tuple[str, str, Optional[Any]]]) -> None:
    """Writes rotated df account records back to the secret they came from.

    Compares the stored record under ``DF_HOME/credentials.json`` with the value loaded before
    the run. If tokens were refreshed, the updated record is written back using
    :func:`persist_rotated_token` so a refreshed token never strands the secret.

    Args:
        states: Snapshot taken by :func:`snapshot_df_login_files` before the invocation.
    """
    df_home = os.environ.get("DF_HOME", "")
    store_path = os.path.join(df_home, "credentials.json") if df_home else ""
    if not store_path or not os.path.isfile(store_path):
        return

    try:
        with open(store_path, "r", encoding="utf-8") as stream:
            accounts_store = json.load(stream).get("accounts", {})
    except (OSError, ValueError):
        return

    for account, secret, original in states:
        if not secret:
            continue
        current = accounts_store.get(account)
        if current is None or original is None:
            continue
        orig_val = original
        if isinstance(orig_val, str):
            try:
                orig_val = json.loads(orig_val)
            except ValueError:
                pass
        curr_val = current
        if isinstance(curr_val, str):
            try:
                curr_val = json.loads(curr_val)
            except ValueError:
                pass
        if curr_val != orig_val:
            serialized = json.dumps(current) if not isinstance(current, str) else current
            persist_rotated_token(secret, serialized)
            print(f"Rotated df account {account} written back to {secret}.")


#: Time budget for stages that explore the repository before answering. Every antigravity attempt
#: at planning #227 hit "print timeout after 5m0s", so a plan or review gets the longer budget.
PLAN_TIMEOUT = "15m0s"
REVIEW_TIMEOUT = "10m0s"


def run_agent_prompt(
    prompt: str,
    model: Optional[str] = None,
    timeout: str = "5m0s",
    max_retries: int = 2,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
    checkpoint_context: Optional[Dict[str, Any]] = None,
    kind: Optional[str] = None,
) -> str:
    """Executes a prompt non-interactively against the first harness that succeeds.

    Walks the resolved chain (see :mod:`harnesses`), where every rung is a quota move: another
    account, then another pool, then another harness. A quota error moves to the next attempt
    immediately - an unused account is always a better answer than sleeping - and the exponential
    backoff is kept for the last attempt, the only point at which there is nothing left to rotate
    to. An authentication failure (a 401/403, a rejected key, an expired token) rotates exactly
    the same way: one stale secret must not stop a healthy chain. Any other failure returns at
    once, because falling through on a genuine bug would burn every harness on the same broken
    prompt.

    Args:
        prompt: Instruction prompt to execute.
        model: The model to run, from the node's configuration, pinned onto the first available
            harness.
        timeout: Print-mode timeout as a Go duration string.
        max_retries: Transient retry attempts per attempt before escalating.
        base_delay: Initial retry delay in seconds.
        backoff_factor: Exponential backoff multiplier.
        checkpoint_context: Optional context for checkpointing when every attempt is exhausted.
        kind: Optional semantic task kind forwarded to df; omission preserves df inference.

    Returns:
        Agent text output, or an explicit error description prefixed
        ``[DarkFactory Agent Execution Error]``.

    Raises:
        RuntimeError: When every attempt exits cleanly but produces no usable output, after a
            short failure notice is posted on the checkpoint context's issue or pull request.
    """
    attempts = resolve_attempts(model=model)

    if not attempts:
        err = (
            "[DarkFactory Agent Execution Error]: No usable harness. "
            "The pipeline runs df as its only agent harness and it is not on PATH."
        )
        print(err, file=sys.stderr)
        return err

    base_env = os.environ.copy()
    base_env.setdefault("TERM", "xterm-256color")
    last_error_detail = ""
    # What the last rotated failure was. Quota everywhere ends in a checkpoint and a `Blocked`
    # label; auth everywhere is a plain error with no checkpoint, because resuming the same
    # stale secrets would fail the same way. Defaults to quota to preserve the previous
    # end-of-chain behaviour for failures that carry neither wording.
    last_rotatable = "quota"
    tried: List[str] = []
    saw_no_output = False

    for index, attempt in enumerate(attempts):
        harness, current_model = attempt.harness, attempt.model
        label = attempt.label
        tried.append(label)
        # A template carrying ``{{PROMPT_FILE}}`` (df) receives the prompt by path rather than as
        # an argv element, so long prompts never meet an argument-length limit. The file is written
        # per retry and removed in the loop's ``finally`` below.
        needs_prompt_file = any(harnesses.PROMPT_FILE in token for token in harness.template)
        argv = harness.build_argv(prompt + ANSWER_CONTRACT, current_model, timeout, kind=kind)

        try:
            env = credential_env(base_env, attempt)
            if harness.name == "antigravity":
                refresh_name = (
                    harness.auth.env_names(attempt.account)[0]
                    if getattr(harness, "auth", None)
                    else "ANTIGRAVITY_REFRESH_TOKEN"
                )
                refresh_val = base_env.get(refresh_name, "")
                access_val = env.get("ANTIGRAVITY_REFRESH_TOKEN", "")
                if access_val and refresh_val:
                    try:
                        setup_antigravity_credentials(access_val, refresh_val)
                    except Exception as e:
                        print(f"Antigravity setup notice: {e}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001 - an unusable account is not a fatal error
            print(f"Could not authenticate {label}: {exc}", file=sys.stderr)
            last_error_detail = str(exc)
            continue

        # An unused account or harness is always a better answer than sleeping, so the backoff is
        # reserved for the last attempt in the chain - the only point at which there is nothing
        # else to try.
        rotation_available = index < len(attempts) - 1

        for retry in range(max_retries + 1):
            login_state = prepare_login_file(base_env, attempt)
            # df borrows CLI subscription logins (codex, grok) and keeps OAuth in its own store;
            # either can rotate mid-run, so the pre-run state is snapshotted for write-back below.
            df_login_state = snapshot_df_login_files() if harness.name == "df" else None
            retry_prompt_file: Optional[str] = None
            if needs_prompt_file:
                fd, retry_prompt_file = tempfile.mkstemp(prefix="df-prompt-", suffix=".md")
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    stream.write(prompt + ANSWER_CONTRACT)
                argv = harness.build_argv(
                    prompt + ANSWER_CONTRACT,
                    current_model,
                    timeout,
                    prompt_file=retry_prompt_file,
                    kind=kind,
                )
            try:
                res = subprocess.run(argv, capture_output=True, text=True, check=True, env=env)
            except FileNotFoundError:
                print(
                    f"Harness binary {harness.binary!r} vanished between resolution and "
                    f"invocation; moving to the next attempt.",
                    file=sys.stderr,
                )
                break
            except subprocess.CalledProcessError as e:
                stderr_part = (e.stderr or "").strip()
                stdout_part = (e.stdout or "").strip()
                detail = f"{stderr_part}\n{stdout_part}".strip() or str(e)
                if harness.name == "df":
                    # df reports quota and auth through its exit code (2 and 3) rather than through
                    # stderr wording, so the code is translated into the runner's wording here and
                    # the single quota check below keeps deciding everything.
                    detail = df_failure_detail(e, detail)
                last_error_detail = detail

                # Quota is checked first: some providers report exhaustion as a 403, and that
                # classification predates auth rotation and stays as it was.
                exhausted = is_quota_exhausted(detail)
                auth_failed = not exhausted and is_auth_failure(detail)

                if not exhausted and not auth_failed:
                    err = (
                        f"[DarkFactory Agent Execution Error]: `{harness.binary}` invocation failed "
                        f"(exit code {e.returncode}): {detail}"
                    )
                    print(err, file=sys.stderr)
                    return err

                if auth_failed:
                    last_rotatable = "auth"
                    safe_detail = redact_secrets(detail)[:400]
                    if rotation_available:
                        print(
                            f"Authentication failed on {label}: {safe_detail}. "
                            f"Moving to the next account/model/harness rather than failing.",
                            file=sys.stderr,
                        )
                        break
                    print(
                        f"Authentication failed on {label} "
                        f"with no account, model or harness left to try: {safe_detail}.",
                        file=sys.stderr,
                    )
                    break

                last_rotatable = "quota"
                if rotation_available:
                    print(
                        f"Quota exhausted on {label}: {detail}. "
                        f"Moving to the next account/model/harness rather than waiting.",
                        file=sys.stderr,
                    )
                    break

                if retry < max_retries:
                    delay = calculate_backoff(
                        retry, base_delay=base_delay, backoff_factor=backoff_factor
                    )
                    print(
                        f"Transient rate limit on {label}, and nothing left to rotate to "
                        f"(attempt {retry + 1}/{max_retries + 1}): {detail}. "
                        f"Retrying in {delay:.2f}s...",
                        file=sys.stderr,
                    )
                    time.sleep(delay)
                    continue

                print(
                    f"Quota exhausted on {label} after {max_retries + 1} attempts, "
                    f"with no account, model or harness left to try.",
                    file=sys.stderr,
                )
                break
            except Exception as e:  # noqa: BLE001 - surface anything unexpected verbatim
                err = f"[DarkFactory Agent Execution Error]: Unexpected failure executing {label}: {e}"
                print(err, file=sys.stderr)
                return err
            finally:
                login_file = getattr(harness, "login_file", None) or getattr(
                    getattr(harness, "auth", None), "login_file", None
                )
                finish_login_file(login_state, login_file.rotates if login_file else False)
                if df_login_state is not None:
                    finish_df_login_files(df_login_state)
                if retry_prompt_file is not None:
                    try:
                        os.remove(retry_prompt_file)
                    except OSError:
                        pass

            if harness.name == "df":
                # ``df run --json`` streams events, not an answer: the final text is the assistant
                # text streamed after the last tool call.
                output = parse_df_json_output(res.stdout or "")
            else:
                output = (res.stdout or "").strip()
            # A harness that reports exhaustion or an auth failure instead of an answer exits 0
            # with the report on stdout. A terse single-line report is not an answer: rotating
            # past it beats posting the error text as the agent's reply. The single-line limit
            # is what keeps this from catching real answers - an answer may discuss quotas or
            # credentials at length (a Request about quota handling always does), and that
            # discussion must still pass through untouched.
            if output and "\n" not in output and len(output) <= SHORT_REPORT_LIMIT:
                short_quota = is_quota_exhausted(output)
                short_auth = not short_quota and is_auth_failure(output)
                if short_quota or short_auth:
                    last_rotatable = "quota" if short_quota else "auth"
                    last_error_detail = redact_secrets(output)
                    where = (
                        "Moving to the next attempt."
                        if rotation_available
                        else "Nothing left to rotate to."
                    )
                    cause = "Quota exhausted" if short_quota else "Authentication failed"
                    print(
                        f"{cause} on {label} (reported on stdout); "
                        f"detail: {last_error_detail[:400]}. {where}",
                        file=sys.stderr,
                    )
                    break
            # Timeout wording is only trusted from stderr: an agent's real answer may discuss timeouts.
            if not output or is_print_timeout(res.stderr or ""):
                # A harness may report exhaustion or an auth failure on stdout while exiting 0
                # with no usable text. That is a rotated failure like any other - not an empty
                # shell - so classify the combined output before the empty branch below.
                combined = f"{res.stdout or ''}\n{res.stderr or ''}".strip()
                if is_quota_exhausted(combined):
                    last_rotatable = "quota"
                    last_error_detail = redact_secrets(_bounded_tail(combined)) or (
                        f"{label} reported exhaustion"
                    )
                    where = (
                        "Moving to the next attempt."
                        if rotation_available
                        else "Nothing left to rotate to."
                    )
                    print(
                        f"Quota exhausted on {label} (reported without usable output); "
                        f"stderr tail: {last_error_detail[:400]}. {where}",
                        file=sys.stderr,
                    )
                    break
                if is_auth_failure(combined):
                    last_rotatable = "auth"
                    last_error_detail = redact_secrets(_bounded_tail(combined)) or (
                        f"{label} reported an authentication failure"
                    )
                    where = (
                        "Moving to the next attempt."
                        if rotation_available
                        else "Nothing left to rotate to."
                    )
                    print(
                        f"Authentication failed on {label} (reported without usable output); "
                        f"stderr tail: {last_error_detail[:400]}. {where}",
                        file=sys.stderr,
                    )
                    break
                # A harness that exits 0 with no usable text is a failed attempt, not a perfect
                # answer: `agy --print-timeout` spends its budget and exits 0 with empty output,
                # and posting that empty shell was the whole bug. It rotates exactly like quota -
                # waiting cannot fix a spent time budget - and if nothing produces text anywhere,
                # the run raises below instead of reporting success over an empty shell.
                saw_no_output = True
                tail = _bounded_tail(res.stderr or "")
                detail = redact_secrets(tail) or f"{label} produced no output"
                last_error_detail = detail
                where = (
                    "Moving to the next attempt."
                    if rotation_available
                    else "Nothing left to rotate to."
                )
                print(
                    f"No usable output from {label} (exit 0, empty or print-timed-out); "
                    f"stderr tail: {detail[:400]}. {where}",
                    file=sys.stderr,
                )
                break

            if len(tried) > 1:
                print(f"Succeeded on {label} after {len(tried) - 1} exhausted attempt(s).")
            return output

    if saw_no_output:
        # Every attempt produced nothing usable. This is not quota - quota blocks gracefully with
        # a checkpoint - it is the pipeline silently succeeding on an empty shell, which must fail
        # the run instead so the workflow turns red rather than "passing" with vacuous comments.
        notice = (
            "[DarkFactory Agent Execution Error]: No usable agent output was produced "
            f"across every attempt ({', '.join(tried)}): "
            f"{last_error_detail or 'empty output'}"
        )
        notice = redact_secrets(notice)
        print(notice, file=sys.stderr)
        _post_agent_failure_notice(notice, checkpoint_context)
        raise RuntimeError(notice)

    if last_rotatable == "auth":
        # Every credential in the chain was rejected. This is not quota - resuming the same
        # stale secrets would fail the same way - so there is no checkpoint and no `Blocked`
        # label, just an error the callers post before failing the run.
        err = (
            "[DarkFactory Agent Execution Error]: Authentication failed "
            f"across every harness and model ({', '.join(tried)}): {last_error_detail}"
        )
        print(redact_secrets(err), file=sys.stderr)
        return err

    err = (
        f"{QUOTA_EXHAUSTED_NOTICE} across every harness and model "
        f"({', '.join(tried)}): {last_error_detail}"
    )
    print(err, file=sys.stderr)

    if checkpoint_context:
        checkpoint_and_notify_exhaustion(
            issue_number=checkpoint_context.get("issue_number", 0),
            repo=checkpoint_context.get("repo", "marius-patrik/DarkFactory"),
            completed_steps=checkpoint_context.get("completed_steps"),
            branch_name=checkpoint_context.get("branch_name"),
            is_pr=checkpoint_context.get("is_pr", False),
            error_detail=err,
            cwd=checkpoint_context.get("cwd"),
            client=checkpoint_context.get("client"),
        )

    return err


def handle_interpret(issue_number: int, repo: str, feedback: str = ""):
    """Generates and posts an interpretation comment on a Request issue.

    Args:
        issue_number: Request issue number.
        repo: Repository slug (owner/name).
        feedback: Reviewer feedback from a `reject`/`revise` comment. When present
            the interpretation is re-run with the feedback instead of starting over.
    """
    raw_issue = run_gh(
        ["issue", "view", str(issue_number), "--json", "title,body,labels"], repo=repo
    )
    data = json.loads(raw_issue)
    title = data.get("title", "")
    body = data.get("body", "")

    t_label, a_label = classify_type_and_area(f"{title} {body}")
    try_gh(
        ["issue", "edit", str(issue_number), "--add-label", f"{t_label},{a_label}"],
        repo=repo,
        doing=f"label #{issue_number} as {t_label},{a_label}",
    )

    prompt = (
        f"Analyze this user request issue:\nTitle: {title}\nBody: {body}\n\n"
        "Draft a structured Interpretation comment containing:\n"
        "1. Verbatim Request Summary\n"
        "2. Architectural Scope & Breakdown\n"
        "3. Proposed Verification Plan\n"
        "Keep it concise and clear.\n"
        "Cite repository files as plain `path/to/file` code spans, never as file:// URLs."
    )
    if feedback:
        prompt += (
            "\n\nThe previous interpretation was rejected with this reviewer feedback, "
            f'which must be addressed in the new interpretation:\n"{feedback}"'
        )
    checkpoint_ctx = {
        "issue_number": issue_number,
        "repo": repo,
        "completed_steps": [
            f"Read Request issue #{issue_number}",
            f"Classified labels as `{t_label}`, `{a_label}`",
        ],
        "is_pr": False,
    }
    interpretation = run_agent_prompt(prompt, checkpoint_context=checkpoint_ctx, kind="classify")

    if is_quota_exhaustion_notice(interpretation):
        return

    if interpretation.startswith("[DarkFactory Agent Execution Error]"):
        comment = (
            "<!-- darkfactory-agent -->\n"
            f"### DarkFactory Agent Execution Error\n\n"
            f"{interpretation}\n"
        )
        run_gh(["issue", "comment", str(issue_number), "--body", comment], repo=repo)
        fail_agent_run(f"Interpretation failed on issue #{issue_number}; Execution Error posted.")
    comment = (
        "<!-- darkfactory-agent -->\n"
        f"### DarkFactory Agent Interpretation\n\n"
        f"{rewrite_file_links(interpretation, repo, development_branch())}\n\n"
        f"---\n*Assigned Labels: `{t_label}`, `{a_label}`. {INTERPRETATION_FOOTER}.*"
    )
    run_gh(["issue", "comment", str(issue_number), "--body", comment], repo=repo)
    print(f"Interpretation posted on issue #{issue_number}")


def create_child_plan_issue(request_number: int, repo: str) -> int:
    """Creates a child Plan issue natively linked via --parent to the Request issue."""
    req_data = json.loads(
        run_gh(["issue", "view", str(request_number), "--json", "title,body"], repo=repo)
    )
    raw_title = req_data.get("title", "")
    plan_title = f"Plan: {raw_title.removeprefix('Request: ').strip()}"
    initial_body = f"Implementation plan for Parent Request #{request_number}.\n\nLinked Parent: #{request_number}"

    # Try creating directly with --parent flag
    create_args = [
        "issue",
        "create",
        "--title",
        plan_title,
        "--body",
        initial_body,
        "--label",
        "Plan",
        "--parent",
        str(request_number),
    ]
    try:
        out = run_gh(create_args, repo=repo)
        match = re.search(r"/issues/(\d+)", out)
        if match:
            plan_num = int(match.group(1))
            print(f"Created child Plan issue #{plan_num} with parent #{request_number}")
            return plan_num
    except Exception as e:
        print(
            f"Notice: creating with --parent failed ({e}); falling back to create then edit...",
            file=sys.stderr,
        )

    # Fallback: create then link parent
    out = run_gh(
        ["issue", "create", "--title", plan_title, "--body", initial_body, "--label", "Plan"],
        repo=repo,
    )
    match = re.search(r"/issues/(\d+)", out)
    if not match:
        raise RuntimeError(f"Could not parse created issue number from output: {out}")
    plan_num = int(match.group(1))
    try:
        run_gh(["issue", "edit", str(plan_num), "--parent", str(request_number)], repo=repo)
        print(f"Linked parent #{request_number} to child Plan issue #{plan_num} via edit")
    except Exception as e:
        try:
            run_gh(
                ["issue", "edit", str(request_number), "--add-sub-issue", str(plan_num)], repo=repo
            )
            print(f"Added sub-issue #{plan_num} to parent #{request_number} via edit")
        except Exception as e2:
            print(
                f"Warning: could not link parent issue #{request_number} to #{plan_num}: {e2}",
                file=sys.stderr,
            )
    return plan_num


#: Marks the comment carrying an implementation plan.
#:
#: The two approval gates live on one issue, so something has to say which gate an `approve` is
#: answering. Rather than tracking that in a label or a second issue, it is read back from the
#: issue: if a plan has been posted, the next approval is approving the plan.
PLAN_MARKER = "<!-- darkfactory-plan -->"


def has_plan(issue_number: int, repo: str) -> bool:
    """Reports whether an implementation plan has already been posted on an issue.

    Args:
        issue_number: Issue to inspect.
        repo: `owner/name` of the repository.

    Returns:
        True when a plan comment is present.
    """
    try:
        raw = run_gh(["issue", "view", str(issue_number), "--json", "comments"], repo=repo)
    except Exception as exc:  # noqa: BLE001 - treated as "no plan yet", which re-plans safely
        print(f"Could not read comments on #{issue_number}: {exc}", file=sys.stderr)
        return False
    comments = json.loads(raw or "{}").get("comments", []) or []
    return any(_is_plan_comment(c.get("body") or "") for c in comments)


def _is_plan_comment(body: str) -> bool:
    """Reports whether a comment carries an implementation plan.

    The marker is the reliable signal, but it was introduced when the two approval gates were
    merged onto one issue. Plans posted before that carry only the heading, and an issue whose plan
    predates the marker would be planned a second time on approval - which is precisely what
    happened to the first issue to run through the merged flow.

    Args:
        body: Comment body.

    Returns:
        True when the comment is a plan.
    """
    if PLAN_MARKER in body:
        return True
    return "### Implementation Plan" in body or body.lstrip().startswith("## Implementation Plan")


def handle_plan(request_number: int, plan_number: int, repo: str, feedback: str = ""):
    """Generates and posts an implementation plan on the child Plan issue.

    Args:
        request_number: Parent Request issue number.
        plan_number: Issue the plan is posted on (the Request itself when the gates
            are merged, a child Plan issue for legacy issues).
        repo: Repository slug (owner/name).
        feedback: Reviewer feedback from a `reject`/`revise` comment. When present
            the plan is re-run with the feedback instead of starting over.
    """
    req_data = json.loads(
        run_gh(["issue", "view", str(request_number), "--json", "title,body"], repo=repo)
    )
    prompt = (
        f"Draft a detailed, step-by-step Implementation Plan for Request #{request_number}:\n"
        f"Title: {req_data.get('title')}\nDetails: {req_data.get('body')}\n\n"
        "Include Scope, Architectural & Code Changes, and Verification Steps.\n"
        "Cite repository files as plain `path/to/file` code spans, never as file:// URLs."
    )
    if feedback:
        prompt += (
            "\n\nThe previous plan was rejected with this reviewer feedback, "
            f'which must be addressed in the new plan:\n"{feedback}"'
        )
    checkpoint_ctx = {
        "issue_number": plan_number,
        "repo": repo,
        "completed_steps": [
            f"Reviewed Parent Request #{request_number}",
            f"Created child Plan issue #{plan_number}",
        ],
        "is_pr": False,
    }
    plan_body = run_agent_prompt(
        prompt, timeout=PLAN_TIMEOUT, checkpoint_context=checkpoint_ctx, kind="plan"
    )

    if is_quota_exhaustion_notice(plan_body):
        return

    if plan_body.startswith("[DarkFactory Agent Execution Error]"):
        comment = (
            "<!-- darkfactory-agent -->\n"
            f"### DarkFactory Agent Execution Error\n\n"
            f"- **Parent Request**: #{request_number}\n\n"
            f"{plan_body}\n"
        )
        run_gh(["issue", "comment", str(plan_number), "--body", comment], repo=repo)
        fail_agent_run(f"Plan failed on issue #{plan_number}; Execution Error posted.")
    comment = (
        "<!-- darkfactory-agent -->\n"
        f"{PLAN_MARKER}\n"
        "### Implementation Plan (Autogenerated by the DarkFactory Agent)\n\n"
        f"- **Parent Request**: #{request_number}\n\n"
        f"{rewrite_file_links(plan_body, repo, development_branch())}\n\n"
        f"---\n*{PLAN_FOOTER}.*"
    )
    run_gh(["issue", "comment", str(plan_number), "--body", comment], repo=repo)
    print(f"Plan posted on issue #{plan_number}")


def handle_respond(issue_or_pr_num: int, comment_text: str, repo: str, is_pr: bool = False):
    """Generates a contextual agent response to human feedback."""
    checkpoint_ctx = {
        "issue_number": issue_or_pr_num,
        "repo": repo,
        "completed_steps": [
            f"Received user comment on {'PR' if is_pr else 'Issue'} #{issue_or_pr_num}"
        ],
        "is_pr": is_pr,
    }
    prompt = (
        f"User posted the following feedback on {'PR' if is_pr else 'Issue'} #{issue_or_pr_num}:\n"
        f'"{comment_text}"\n\n'
        "Provide a direct, helpful, and concise response addressing the feedback and detailing next actions.\n"
        "Cite repository files as plain `path/to/file` code spans, never as file:// URLs."
    )
    response = run_agent_prompt(prompt, checkpoint_context=checkpoint_ctx, kind="chat")
    if is_quota_exhaustion_notice(response):
        return

    if response.startswith("[DarkFactory Agent Execution Error]"):
        body = f"<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n{response}"
        if is_pr:
            run_gh(["pr", "comment", str(issue_or_pr_num), "--body", body], repo=repo)
        else:
            run_gh(["issue", "comment", str(issue_or_pr_num), "--body", body], repo=repo)
        fail_agent_run(f"Respond failed on #{issue_or_pr_num}; Execution Error posted.")
    body = (
        "<!-- darkfactory-agent -->\n### DarkFactory Agent Response\n\n"
        f"{rewrite_file_links(response, repo, development_branch())}"
    )

    if is_pr:
        run_gh(["pr", "comment", str(issue_or_pr_num), "--body", body], repo=repo)
    else:
        run_gh(["issue", "comment", str(issue_or_pr_num), "--body", body], repo=repo)
    print(f"Responded to comment on #{issue_or_pr_num}")


def _looks_like_file_path(token: str) -> bool:
    """Heuristic check whether a token looks like a file path rather than code/command."""
    token = token.strip("`'\",:;()[]{}")
    if not token or len(token) > 250:
        return False
    if token.startswith("http://") or token.startswith("https://") or token.startswith("file://"):
        return False
    # Avoid command invocations or code snippets with spaces or shell operators
    if any(ch in token for ch in (" ", "\t", "\n", ";", "|", "&", ">", "<", "$", "{", "}", "*")):
        return False
    known_exts = (
        ".py",
        ".ts",
        ".js",
        ".json",
        ".yml",
        ".yaml",
        ".toml",
        ".md",
        ".rs",
        ".sh",
        ".txt",
        ".html",
        ".css",
        ".sql",
        ".cfg",
        ".ini",
        ".lock",
        ".dockerignore",
        ".gitignore",
    )
    lower = token.lower()
    if any(lower.endswith(ext) for ext in known_exts):
        return True
    if "/" in token:
        parts = token.split("/")
        if all(part for part in parts) and not token.startswith("-"):
            return True
    return False


def _clean_path(token: str) -> str:
    """Normalizes a candidate file path, preserving leading dots in directory names like .github."""
    token = token.strip("`'\",:;()[]{}").replace("\\", "/")
    if token.startswith("./"):
        token = token[2:]
    elif token.startswith("/"):
        token = token[1:]
    return token


def parse_plan_files(plan_text: str) -> Set[str]:
    """Extracts repository file paths named in an implementation plan comment.

    Args:
        plan_text: Text/markdown of the approved plan comment.

    Returns:
        A set of file paths cited in the plan.
    """
    if not plan_text:
        return set()

    found: Set[str] = set()

    # 1. GitHub blob links: https://github.com/.../blob/.../<path>
    for match in re.finditer(
        r"https://github\.com/[^/\s'\"]+/[^/\s'\"]+/blob/[^/\s'\"]+/([^\s#)'\"]+)",
        plan_text,
    ):
        raw_path = _clean_path(match.group(1).strip())
        if raw_path and _looks_like_file_path(raw_path):
            found.add(raw_path)

    # 2. Markdown links: [text](target)
    for match in re.finditer(r"\[([^\]]+)\]\(([^)]+)\)", plan_text):
        for candidate in (match.group(1), match.group(2)):
            c = _clean_path(candidate.strip())
            if (
                not c.startswith("http://")
                and not c.startswith("https://")
                and ("/" in c or "." in c)
            ):
                token = c.split("#")[0].strip()
                if _looks_like_file_path(token):
                    found.add(token)

    # 3. Backtick spans: `...`
    for match in re.finditer(r"`([^`\n]+)`", plan_text):
        token = _clean_path(match.group(1).strip())
        if _looks_like_file_path(token):
            found.add(token)

    # 4. List items: - path or * path
    for match in re.finditer(r"(?:^|\n)\s*[-*]\s+([^\s`]+)", plan_text):
        token = _clean_path(match.group(1))
        if _looks_like_file_path(token):
            found.add(token)

    return found


def parse_explicit_plan_files(plan_text: str) -> Set[str]:
    """Extracts an exact file allowlist only when Planning declares one explicitly.

    Behavioral Planning commonly cites package names, config files, current owners and example paths
    as architectural context. Those references must not become mutation permissions. Exact file
    scope is opt-in through a dedicated heading so current-tree discovery can choose the concrete
    implementation files required by the approved behavior.

    Accepted headings are File Scope, Allowed Files, Files to Change and File Allowlist
    (case-insensitive). The section ends at the next markdown heading.

    Args:
        plan_text: Approved Planning markdown.

    Returns:
        Repository paths declared in an explicit file-scope section, or an empty set when Planning
        intentionally leaves concrete file ownership to current-tree discovery.
    """
    if not plan_text:
        return set()

    heading = re.compile(
        r"(?:^|\n)#{2,6}\s*(?:File Scope|Allowed Files|Files to Change|File Allowlist)\s*\n",
        re.IGNORECASE,
    )
    match = heading.search(plan_text)
    if not match:
        return set()
    tail = plan_text[match.end() :]
    next_heading = re.search(r"(?:^|\n)#{1,6}\s+", tail)
    section = tail[: next_heading.start()] if next_heading else tail
    return parse_plan_files(section)


def is_file_in_plan(file_path: str, plan_files: Set[str]) -> bool:
    """Reports whether a changed file matches any path cited in the approved plan.

    Matches by exact path, basename, or path suffix/prefix.
    """
    norm = _clean_path(file_path)
    basename = os.path.basename(norm)
    for pf in plan_files:
        pfnorm = _clean_path(pf)
        if norm == pfnorm:
            return True
        if norm.endswith("/" + pfnorm):
            return True
        if pfnorm.endswith("/" + norm):
            return True
        if basename == pfnorm or basename == os.path.basename(pfnorm):
            return True
    return False


def is_test_file(file_path: str) -> bool:
    """Reports whether a path is a test: tests accompany every change (DF-RULE-001), so never out of scope.

    Args:
        file_path: Repository-relative path.

    Returns:
        True for files under a test directory or named like a test.
    """
    norm = _clean_path(file_path)
    parts = norm.split("/")
    name = parts[-1]
    return (
        any(part in ("tests", "test", "__tests__") for part in parts[:-1])
        or name.startswith("test_")
        or name.endswith(("_test.py", ".test.ts", ".test.js", ".spec.ts"))
        or name == "conftest.py"
    )


def check_scope(changed_files: List[str], plan_files: Set[str]) -> Tuple[List[str], List[str]]:
    """Separates changed files into in-scope and out-of-scope files relative to the plan.

    Args:
        changed_files: List of file paths changed in the PR.
        plan_files: Set of file paths named in the approved plan.

    Returns:
        Tuple of (in_scope_files, out_of_scope_files).
    """
    in_scope: List[str] = []
    out_of_scope: List[str] = []
    if not plan_files:
        # A plan that names no files cannot define scope; reverting everything would undo the work.
        return list(changed_files), []
    for f in changed_files:
        if is_test_file(f) or is_file_in_plan(f, plan_files):
            in_scope.append(f)
        else:
            out_of_scope.append(f)
    return in_scope, out_of_scope


def get_pr_changed_files(base_branch_name: str = "", cwd: str = WORKSPACE_DIR) -> List[str]:
    """Returns the list of changed files between the current branch and the base branch."""
    base = base_branch_name or development_branch()
    for ref in (f"origin/{base}...HEAD", f"{base}...HEAD", f"origin/{base}", base):
        try:
            out = run_git(["diff", "--name-only", ref], cwd=cwd)
            files = [line.strip().replace("\\", "/") for line in out.splitlines() if line.strip()]
            if files:
                return files
        except Exception:
            continue
    return []


def revert_out_of_scope_files(
    out_of_scope_files: List[str], base_branch_name: str = "", cwd: str = WORKSPACE_DIR
) -> str:
    """Reverts out-of-scope files to the base branch in a commit and pushes to origin.

    Args:
        out_of_scope_files: Files modified outside the plan scope.
        base_branch_name: Base branch to restore from.
        cwd: Repository directory.

    Returns:
        The commit SHA of the reversion commit.
    """
    base = base_branch_name or development_branch()
    for f in out_of_scope_files:
        exists_in_base = False
        for ref in (f"origin/{base}", base):
            res = subprocess.run(
                ["git", "cat-file", "-e", f"{ref}:{f}"],
                cwd=cwd,
                capture_output=True,
            )
            if res.returncode == 0:
                exists_in_base = True
                run_git(["checkout", ref, "--", f], cwd=cwd)
                break
        if not exists_in_base:
            full_path = os.path.join(cwd, f)
            if os.path.isfile(full_path) or os.path.islink(full_path):
                os.remove(full_path)
                run_git(["rm", "-f", "--ignore-unmatch", f], cwd=cwd)
            elif os.path.isdir(full_path):
                shutil.rmtree(full_path, ignore_errors=True)
                run_git(["rm", "-rf", "--ignore-unmatch", f], cwd=cwd)
    run_git(["add", "-A"], cwd=cwd)
    commit_msg = f"revert(scope): revert files outside plan scope ({', '.join(out_of_scope_files)})"
    run_git(["commit", "-m", commit_msg], cwd=cwd)
    run_git(["push", "origin", "HEAD"], cwd=cwd)
    commit_sha = run_git(["rev-parse", "HEAD"], cwd=cwd).strip()
    print(f"Reverted out-of-scope files: {out_of_scope_files}")
    return commit_sha


def extract_plan_scope(plan_text: str, fallback_title: str = "") -> str:
    """Extracts the scope section from an implementation plan, or returns a fallback summary."""
    scope_match = re.search(
        r"(?:^|\n)#{2,4}\s*Scope\s*\n(.*?)(?=\n#{2,4}\s|\Z)", plan_text, re.DOTALL | re.IGNORECASE
    )
    if scope_match:
        scope = scope_match.group(1).strip()
        if scope:
            return scope

    for heading in ("Objectives", "Overview", "Summary", "Description"):
        m = re.search(
            rf"(?:^|\n)#{{2,4}}\s*{heading}\s*\n(.*?)(?=\n#{{2,4}}\s|\Z)",
            plan_text,
            re.DOTALL | re.IGNORECASE,
        )
        if m and m.group(1).strip():
            return m.group(1).strip()

    lines = []
    for line in plan_text.splitlines():
        if (
            line.startswith("<!--")
            or line.startswith("#")
            or "PLAN_FOOTER" in line
            or "Parent Request" in line
        ):
            continue
        lines.append(line)
    text = "\n".join(lines).strip()
    if text:
        return text[:500]
    return fallback_title or "Implementation changes as approved in the plan."


def extract_test_result_line(stdout: str = "", stderr: str = "") -> str:
    """Extracts the final result summary line from test suite output."""
    output = (stdout or "") + "\n" + (stderr or "")
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    if not lines:
        return "Tests passed"
    return lines[-1]


def build_pr_body(
    plan_title: str,
    plan_text: str,
    request_number: int,
    plan_number: Optional[int] = None,
    diff_stat: str = "",
    test_command: str = "",
    test_result_line: str = "",
    agent_notes: str = "",
) -> str:
    """Builds a pull request description deterministically from the approved plan and run stats.

    Args:
        plan_title: Title of the plan issue.
        plan_text: Body of the approved plan.
        request_number: Parent request issue number.
        plan_number: Plan issue number.
        diff_stat: Output of `git diff --stat` vs base branch.
        test_command: The verification command executed.
        test_result_line: The final result summary line from the test runner.
        agent_notes: Raw output notes from the implementation agent.

    Returns:
        Deterministic pull request body markdown.
    """
    scope = extract_plan_scope(plan_text, fallback_title=plan_title)

    sections = [
        f"## Summary\n\n{scope}",
    ]

    if diff_stat.strip():
        sections.append(f"## Changed Files\n\n```\n{diff_stat.strip()}\n```")

    if test_command or test_result_line:
        verif_lines = ["## Verification\n"]
        if test_command:
            verif_lines.append(f"- **Command**: `{test_command}`")
        if test_result_line:
            verif_lines.append(f"- **Result**: `{test_result_line}`")
        sections.append("\n".join(verif_lines))

    closes_lines = [f"Closes #{request_number}"]
    if plan_number and plan_number != request_number:
        closes_lines.append(f"Closes #{plan_number}")
    sections.append("\n".join(closes_lines))

    if agent_notes.strip():
        truncated_notes = agent_notes[:2000].strip()
        sections.append(
            f"<details>\n<summary>Agent notes</summary>\n\n{truncated_notes}\n</details>"
        )

    return "\n\n".join(sections) + "\n"


def find_parent_request_number(plan_number: int, repo: str) -> Optional[int]:
    """Finds the parent Request issue number from a Plan issue body or GitHub metadata.

    Args:
        plan_number: The Plan issue number.
        repo: Repository slug (owner/name).

    Returns:
        Parent Request issue number, or None if not found.
    """
    raw = run_gh(["issue", "view", str(plan_number), "--json", "body,parent,comments"], repo=repo)
    data = json.loads(raw)

    # 1. Native GitHub sub-issue parent metadata
    parent_obj = data.get("parent")
    if isinstance(parent_obj, dict) and parent_obj.get("number"):
        return int(parent_obj["number"])

    # 2. Regex search in body (supports "Parent Request #N", "Parent Request: #N", "Linked Parent: #N")
    body = data.get("body", "")
    match = re.search(r"(?:Parent Request|Linked Parent):?\s*#(\d+)", body, re.IGNORECASE)
    if match:
        return int(match.group(1))

    # 3. Search in comments
    for c in data.get("comments", []):
        c_body = c.get("body", "") if isinstance(c, dict) else str(c)
        m = re.search(
            r"(?:Parent Request|Linked Parent|\*\*Parent Request\*\*):?\s*#(\d+)",
            c_body,
            re.IGNORECASE,
        )
        if m:
            return int(m.group(1))

    return None


def find_plan_issue_for_pr(pr_number: int, repo: str) -> Optional[int]:
    """Finds the associated Plan issue number for a PR from PR body, metadata, or comments.

    Args:
        pr_number: The pull request number.
        repo: Repository slug (owner/name).

    Returns:
        Plan issue number, or None if not found.
    """
    try:
        raw = run_gh(
            ["pr", "view", str(pr_number), "--json", "body,closingIssuesReferences,comments"],
            repo=repo,
        )
        data = json.loads(raw)
    except Exception as e:
        print(f"Warning: Failed to fetch PR #{pr_number} metadata: {e}", file=sys.stderr)
        data = {}

    # 1. Native closingIssuesReferences
    for item in data.get("closingIssuesReferences", []):
        if isinstance(item, dict):
            num = item.get("number")
            labels = [
                l.get("name", "").lower() if isinstance(l, dict) else str(l).lower()
                for l in item.get("labels", [])
            ]
            title = item.get("title", "").lower()
            if ("plan" in labels or title.startswith("plan:")) and num:
                return int(num)

    # 2. Check PR body for explicit Plan reference (e.g. "Plan: #N", "Child Plan: #N", "Plan #N")
    body = data.get("body", "")
    plan_match = re.search(r"(?:Plan|Child Plan):?\s*#(\d+)", body, re.IGNORECASE)
    if plan_match:
        return int(plan_match.group(1))

    # 3. Check comments for Plan reference
    for c in data.get("comments", []):
        c_body = c.get("body", "") if isinstance(c, dict) else str(c)
        m = re.search(r"(?:Plan|Child Plan|\*\*Plan\*\*):?\s*#(\d+)", c_body, re.IGNORECASE)
        if m:
            return int(m.group(1))

    # 4. Check closing issue references in PR body: Closes #123, Fixes #456
    matches = re.findall(
        r"(?i)\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#(\d+)|https://github\.com/[^/\s]+/[^/\s]+/issues/(\d+))\b",
        body,
    )
    candidates = []
    for m1, m2 in matches:
        num_str = m1 or m2
        if num_str:
            candidates.append(int(num_str))

    for num in reversed(candidates):
        try:
            issue_raw = run_gh(["issue", "view", str(num), "--json", "labels,title"], repo=repo)
            issue_data = json.loads(issue_raw)
            labels = [
                l.get("name", "").lower() if isinstance(l, dict) else str(l).lower()
                for l in issue_data.get("labels", [])
            ]
            title = issue_data.get("title", "").lower()
            if "plan" in labels or title.startswith("plan:"):
                return num
        except Exception:
            continue

    if candidates:
        return candidates[-1]

    return None


def generate_branch_name(title: str) -> str:
    """Generates a feature branch name from a plan or request title.

    Produces lowercase, hyphenated names prefixed with 'feature/'.
    Issue number references (#N) are stripped per AGENTS.md §7.

    Args:
        title: The plan or request issue title.

    Returns:
        Branch name string (e.g. 'feature/add-link-to-docs-and-diagram').
    """
    clean = re.sub(r"^(?:Plan|Request):\s*", "", title, flags=re.IGNORECASE).strip()
    clean = re.sub(r"#\d+", "", clean).strip()
    slug = re.sub(r"[^a-z0-9]+", "-", clean.lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    if len(slug) > 50:
        slug = slug[:50].rstrip("-")
    return f"feature/{slug}"


def _node_script_command(cwd: str, script: str) -> Optional[List[str]]:
    """Resolves one declared package script through a Node-compatible runner available in the image.

    The agent image is intentionally Bun-first and does not guarantee npm. A root `package.json`
    therefore identifies a Node workspace, not a specific package-manager binary.

    Args:
        cwd: Repository working directory.
        script: Package script name to execute.

    Returns:
        The command to execute, or `None` when the script is not declared or no package runner is
        installed.
    """
    path = os.path.join(cwd, "package.json")
    try:
        with open(path, encoding="utf-8") as handle:
            package = json.load(handle)
    except (OSError, ValueError):
        return None
    scripts = package.get("scripts", {})
    if not isinstance(scripts, dict) or not isinstance(scripts.get(script), str):
        return None

    declared = package.get("packageManager")
    preferred = str(declared).split("@", 1)[0] if isinstance(declared, str) else ""
    runners = [preferred] if preferred in {"bun", "pnpm", "npm", "yarn"} else []
    runners.extend(name for name in ("bun", "pnpm", "npm", "yarn") if name not in runners)
    for runner in runners:
        if not shutil.which(runner):
            continue
        if runner in {"bun", "pnpm", "npm"}:
            return [runner, "run", script]
        return [runner, script]
    return None


def format_repository(cwd: str) -> List[str]:
    """Runs every formatter whose manifest and executable are available.

    Formatting is never a review topic (`.agents/notes/rules/008-formatting-and-linting.md`), so the agent normalizes the tree itself
    before committing. Optional formatters are skipped when either their manifest/script or their
    executable is absent; deterministic verification remains responsible for required quality gates.

    Args:
        cwd: Repository working directory.

    Returns:
        Human-readable names of the formatters that actually ran.
    """
    ran: List[str] = []
    formatters = [
        ("black", "pyproject.toml", ["black", "."]),
        ("cargo fmt", "Cargo.toml", ["cargo", "fmt", "--all"]),
    ]
    node_format = _node_script_command(cwd, "format")
    if node_format is not None:
        formatters.append(("web formatter", "package.json", node_format))

    for name, manifest, cmd in formatters:
        if not os.path.exists(os.path.join(cwd, manifest)) or not shutil.which(cmd[0]):
            continue
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        if result.returncode == 0:
            ran.append(name)
        else:
            print(f"Formatter {name} notice: {result.stderr[-500:]}", file=sys.stderr)
    return ran


def verify_repository(cwd: str) -> subprocess.CompletedProcess:
    """Runs every declared test suite through an executable available in the agent image.

    Returns on the first failing suite so the agent's fix prompt receives the output that actually
    matters instead of a concatenation of every suite. A declared Node test with no available
    package runner fails explicitly instead of crashing the runner.

    Args:
        cwd: Repository working directory.

    Returns:
        The completed process of the first failing suite, or of the last suite that ran. A synthetic
        successful result is returned when no suite is present at all.
    """
    last = subprocess.CompletedProcess(args=["true"], returncode=0, stdout="", stderr="")
    suites = [
        ("pyproject.toml", ["python3", "-m", "pytest", "tests/", "-q"]),
        ("Cargo.toml", ["cargo", "test", "--workspace", "--quiet"]),
    ]
    node_manifest = os.path.join(cwd, "package.json")
    if os.path.exists(node_manifest):
        try:
            with open(node_manifest, encoding="utf-8") as handle:
                scripts = json.load(handle).get("scripts", {})
        except (OSError, ValueError):
            scripts = {}
        if isinstance(scripts, dict) and isinstance(scripts.get("test"), str):
            node_test = _node_script_command(cwd, "test")
            if node_test is None:
                return subprocess.CompletedProcess(
                    args=["node-package-runner"],
                    returncode=127,
                    stdout="",
                    stderr="package.json declares a test script but no Bun/npm/pnpm/yarn runner is available",
                )
            suites.append(("package.json", node_test))

    for manifest, cmd in suites:
        if not os.path.exists(os.path.join(cwd, manifest)):
            continue
        if not shutil.which(cmd[0]):
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=127,
                stdout="",
                stderr=f"Required verification executable is unavailable: {cmd[0]}",
            )
        last = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        if last.returncode != 0:
            return last
    return last


def handle_implement(plan_number: int, request_number: int, repo: str):
    """Implements a plan: creates branch, runs agy, commits, pushes, opens PR, reviews.

    Triggered when a user comments 'approve' on a Plan issue. Executes the full
    autonomous pipeline: implement → open Draft PR → self-review → plan alignment → mark ready.

    Args:
        plan_number: The child Plan issue number.
        request_number: The parent Request issue number.
        repo: Repository slug (owner/name).
    """
    cwd = WORKSPACE_DIR

    # 1. Read plan and request content
    plan_data = json.loads(
        run_gh(["issue", "view", str(plan_number), "--json", "title,body"], repo=repo)
    )
    request_data = json.loads(
        run_gh(["issue", "view", str(request_number), "--json", "title,body"], repo=repo)
    )
    plan_title = plan_data.get("title", "")
    plan_body = plan_data.get("body", "")
    request_title = request_data.get("title", "")
    request_body = request_data.get("body", "")

    # 2. Generate branch name
    branch_name = generate_branch_name(plan_title)
    print(f"Creating branch: {branch_name}")

    # 3. Configure git identity and safe directory
    configure_git_identity(cwd)

    # 4. Create feature branch from main or track existing remote branch
    try:
        run_git(["fetch", "origin"], cwd=cwd)
        remote_branches = run_git(["branch", "-r"], cwd=cwd)
        if f"origin/{branch_name}" in remote_branches:
            local_branches = [b.strip("* ") for b in run_git(["branch"], cwd=cwd).splitlines()]
            if branch_name in local_branches:
                run_git(["checkout", branch_name], cwd=cwd)
            else:
                run_git(["checkout", "-b", branch_name, f"origin/{branch_name}"], cwd=cwd)
            run_git(["pull", "--ff-only", "origin", branch_name], cwd=cwd)
        else:
            local_branches = [b.strip("* ") for b in run_git(["branch"], cwd=cwd).splitlines()]
            if branch_name in local_branches:
                run_git(["checkout", branch_name], cwd=cwd)
            else:
                # Branching from origin/main fails outright where the trunk is called something
                # else. #107 replaced the literals in the pull request calls and missed this one,
                # because the guard test looked for `"main",` and this reads `origin/main`.
                run_git(["checkout", "-b", branch_name, f"origin/{development_branch()}"], cwd=cwd)
    except subprocess.CalledProcessError as e:
        err_msg = f"Failed to create/checkout branch {branch_name}: {e.stderr or e.stdout}"
        print(err_msg, file=sys.stderr)
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n{err_msg}",
            ],
            repo=repo,
        )
        fail_agent_run(f"Branch setup failed for plan #{plan_number}; Execution Error posted.")

    # Check for saved checkpoint on the branch or workspace
    checkpoint = load_checkpoint(cwd=cwd)
    completed_steps = (
        list(checkpoint.get("completed_steps", []))
        if checkpoint
        else [
            f"Loaded Plan #{plan_number} and Parent Request #{request_number}",
            f"Created and checked out feature branch '{branch_name}'",
        ]
    )

    # Check if open PR already exists for branch (e.g. from previous run)
    pr_number = None
    try:
        pr_list = run_gh(
            [
                "pr",
                "list",
                "--head",
                branch_name,
                "--base",
                development_branch(),
                "--state",
                "open",
                "--json",
                "number",
            ],
            repo=repo,
        )
        prs = json.loads(pr_list)
        if prs:
            pr_number = prs[0]["number"]
    except Exception:
        pass

    if pr_number:
        print(
            f"Found existing open PR #{pr_number} for branch {branch_name}, skipping implementation."
        )
        start_self_review(pr_number, plan_number, request_number, repo)
        return

    # 5. Run agy to implement the plan (longer timeout for implementation)
    already_implemented = any("Implemented code and test changes" in s for s in completed_steps)
    if already_implemented:
        print("Implementation already completed according to checkpoint; resuming pipeline.")
        impl_result = "Implementation resumed from checkpoint."
    else:
        implement_prompt = (
            f"You are implementing a plan for a code repository.\n\n"
            f"## Parent Request (#{request_number})\n"
            f"Title: {request_title}\n{request_body}\n\n"
            f"## Implementation Plan (#{plan_number})\n"
            f"Title: {plan_title}\n{plan_body}\n\n"
            f"## Instructions\n"
            f"Implement ALL changes described in the plan above. "
            f"Write production code and corresponding unit tests. "
            f"Follow the binding rules in AGENTS.md: inline API documentation on every public item, "
            f"Conventional Commits, and a unit test for every behavior you add. "
            f"Do NOT create or modify files outside the scope of the plan."
        )
        checkpoint_ctx = {
            "issue_number": plan_number,
            "repo": repo,
            "branch_name": branch_name,
            "completed_steps": list(completed_steps),
            "cwd": cwd,
        }
        impl_result = run_agent_prompt(
            implement_prompt,
            timeout="15m0s",
            checkpoint_context=checkpoint_ctx,
            kind="implement",
        )
        if is_quota_exhaustion_notice(impl_result):
            return

        if impl_result.startswith("[DarkFactory Agent Execution Error]"):
            run_gh(
                [
                    "issue",
                    "comment",
                    str(plan_number),
                    "--body",
                    f"<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n{impl_result}",
                ],
                repo=repo,
            )
            fail_agent_run(
                f"Implementation failed for plan #{plan_number}; Execution Error posted."
            )
        print(f"Implementation complete. Agent output:\n{impl_result[:500]}")
        completed_steps.append("Implemented code and test changes according to plan")

    # 6. Auto-format with every available formatter
    format_repository(cwd)
    completed_steps.append("Formatted code with the repository formatters")

    # 7. Run the repository test suites; if failures, ask the agent to fix once
    test_res = verify_repository(cwd)
    if test_res.returncode != 0:
        print(f"Tests failed, asking agent to fix...\n{test_res.stdout[-500:]}")
        fix_prompt = (
            f"The following test failures occurred after implementing the plan:\n\n"
            f"```\n{test_res.stdout[-2000:]}\n{test_res.stderr[-1000:]}\n```\n\n"
            f"Fix the failures while staying within the plan scope."
        )
        checkpoint_ctx["completed_steps"] = list(completed_steps) + [
            "Executed test suite (failures detected; attempting automated fix)"
        ]
        fix_result = run_agent_prompt(
            fix_prompt,
            timeout="10m0s",
            checkpoint_context=checkpoint_ctx,
            kind="fix",
        )
        if is_quota_exhaustion_notice(fix_result):
            return
        if fix_result.startswith("[DarkFactory Agent Execution Error]"):
            run_gh(
                [
                    "issue",
                    "comment",
                    str(plan_number),
                    "--body",
                    "<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n"
                    f"{fix_result}",
                ],
                repo=repo,
            )
            fail_agent_run(
                f"Automated test fix failed for plan #{plan_number}; Execution Error posted."
            )
        format_repository(cwd)
        completed_steps.append("Resolved automated test fixes")

    # 8. Classify and commit
    t_label, a_label = classify_type_and_area(f"{plan_title} {plan_body}")
    commit_title = format_conventional_commit(
        t_label, a_label, plan_title.removeprefix("Plan: ").strip()
    )

    try:
        run_git(["add", "-A"], cwd=cwd)
        status = run_git(["status", "--porcelain"], cwd=cwd)
        if not status:
            print("No changes to commit after implementation.")
            run_gh(
                [
                    "issue",
                    "comment",
                    str(plan_number),
                    "--body",
                    "<!-- darkfactory-agent -->\n### DarkFactory Agent Notice\n\n"
                    "No file changes produced by implementation. Please review the plan scope.",
                ],
                repo=repo,
            )
            return
        run_git(["commit", "-m", commit_title], cwd=cwd)
        run_git(["push", "origin", branch_name], cwd=cwd)
        print(f"Pushed branch {branch_name}")
    except subprocess.CalledProcessError as e:
        raw_err = (e.stderr or e.stdout or str(e)).strip()
        if is_workflow_permission_error(raw_err):
            err_msg = (
                f"Git commit/push rejected due to missing GitHub Actions workflow permissions:\n\n"
                f"```\n{raw_err}\n```\n\n"
                f"**Resolution**: The GitHub Actions runner token requires `workflows: write` permissions "
                f"in `.github/workflows/antigravity-ci-agent.yml` to modify workflows under `.github/workflows/`."
            )
        else:
            err_msg = f"Git commit/push failed: {raw_err}"
        print(err_msg, file=sys.stderr)
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n{err_msg}",
            ],
            repo=repo,
        )
        fail_agent_run(f"Commit/push failed for plan #{plan_number}; Execution Error posted.")

    # 9. Open Draft PR via workflow dispatch
    diff_stat = ""
    try:
        diff_stat = run_git(["diff", "--stat", f"origin/{development_branch()}...HEAD"], cwd=cwd)
    except Exception:
        try:
            diff_stat = run_git(["diff", "--stat", f"{development_branch()}...HEAD"], cwd=cwd)
        except Exception:
            diff_stat = ""

    test_cmd = (
        " ".join(test_res.args)
        if isinstance(getattr(test_res, "args", None), list)
        else str(getattr(test_res, "args", ""))
    )
    test_result_line = extract_test_result_line(
        getattr(test_res, "stdout", ""), getattr(test_res, "stderr", "")
    )
    pr_body = build_pr_body(
        plan_title=plan_title,
        plan_text=plan_body,
        request_number=request_number,
        plan_number=plan_number,
        diff_stat=diff_stat,
        test_command=test_cmd,
        test_result_line=test_result_line,
        agent_notes=impl_result,
    )
    try:
        run_gh(
            [
                "workflow",
                "run",
                "open-pr.yml",
                "-f",
                f"branch={branch_name}",
                "-f",
                f"title={commit_title}",
                "-f",
                f"body={pr_body}",
                "-f",
                f"base={development_branch()}",
                "-f",
                "draft=true",
            ],
            repo=repo,
        )
        print("Dispatched open-pr.yml workflow")
    except Exception as e:
        print(f"Failed to dispatch open-pr.yml: {e}", file=sys.stderr)
        try:
            run_gh(
                [
                    "pr",
                    "create",
                    "--head",
                    branch_name,
                    "--base",
                    development_branch(),
                    "--title",
                    commit_title,
                    "--body",
                    pr_body,
                    "--draft",
                ],
                repo=repo,
            )
        except Exception as e2:
            print(f"Direct PR creation also failed: {e2}", file=sys.stderr)
            return

    # 10. Wait for PR to appear
    pr_number = None
    for _ in range(30):
        time.sleep(2)
        try:
            pr_list = run_gh(
                [
                    "pr",
                    "list",
                    "--head",
                    branch_name,
                    "--base",
                    development_branch(),
                    "--state",
                    "open",
                    "--json",
                    "number",
                ],
                repo=repo,
            )
            prs = json.loads(pr_list)
            if prs:
                pr_number = prs[0]["number"]
                print(f"Found PR #{pr_number}")
                break
        except Exception:
            pass

    if not pr_number:
        print("Timed out waiting for PR creation.")
        return

    # 11. Self-review runs as dispatched review and fix iterations; the clean review continues to
    # the plan alignment gate.
    start_self_review(pr_number, plan_number, request_number, repo)


def start_self_review(
    pr_number: int, plan_number: int, request_number: Optional[int], repo: str
) -> None:
    """Starts the self-review cycle for a pull request by dispatching review iteration 1.

    Each iteration runs as its own workflow run: the review run posts all findings and dispatches
    the fix run, which dispatches the next review, until a review has no findings.

    Args:
        pr_number: The pull request to review.
        plan_number: The approved Plan issue (the Request itself since both gates share one issue).
        request_number: The parent Request issue; falls back to the plan's parent, then the plan.
        repo: Repository slug (owner/name).
    """
    request = request_number or find_parent_request_number(plan_number, repo) or plan_number
    dispatch_stage(
        repo,
        {
            "stage": "self-review",
            "pr": pr_number,
            "plan": plan_number,
            "request": request,
            "iteration": 1,
        },
    )
    print(f"Dispatched self-review iteration 1 for PR #{pr_number}")


def dispatch_stage(repo: str, payload: Dict[str, Any]):
    """Dispatches the agent-dispatch event to the repository."""
    payload_data = json.dumps({"event_type": "agent-dispatch", "client_payload": payload})
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            f.write(payload_data)
            temp_path = f.name
        run_gh(
            ["api", f"repos/{repo}/dispatches", "--method", "POST", "--input", temp_path],
            repo=repo,
        )
    except Exception as e:
        print(f"Failed to dispatch agent-dispatch to {repo}: {e}", file=sys.stderr)
        # Post PR notice
        pr_num = payload.get("pr")
        run_gh(
            [
                "pr",
                "comment",
                str(pr_num),
                "--body",
                f"<!-- darkfactory-agent -->\n### Self-Review Dispatch Error\n\nFailed to dispatch next stage: {e}",
            ],
            repo=repo,
        )
        block_entity(pr_num, repo=repo, is_pr=True)
        request_num = payload.get("request")
        if request_num:
            block_entity(request_num, repo=repo, is_pr=False)
        raise
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def parse_review_findings(text: str) -> List[str]:
    """Extract top-level findings from agent review text.

    Returns one stripped string per finding. Numbered items (1., 2., etc.)
    and bullet items (* or -) are each one finding; subsequent indented/continuation
    lines belong to that same finding.
    """
    stripped_text = text.strip()
    if stripped_text.startswith("NO_FINDINGS"):
        return []

    lines = text.splitlines()
    items: List[str] = []
    current_item_lines: List[str] = []
    in_item = False

    def flush_item():
        nonlocal current_item_lines
        if current_item_lines:
            items.append(" ".join(l.strip() for l in current_item_lines if l.strip()))
        current_item_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        starts_numbered = re.match(r"^\d+\.\s*", stripped)
        starts_bullet = stripped.startswith(("* ", "- ")) or stripped.startswith(("*", "-"))
        if starts_numbered or starts_bullet:
            flush_item()
            in_item = True
            if starts_numbered:
                content = stripped[starts_numbered.end() :].strip()
            elif stripped.startswith(("* ", "- ")):
                content = stripped[2:].strip()
            elif stripped.startswith(("*", "-")):
                content = stripped[1:].strip()
            current_item_lines = [content]
            continue
        if in_item:
            current_item_lines.append(stripped)

    flush_item()

    if not items and stripped_text:
        return [stripped_text]

    return items


GIT_BOT_NAME = "github-actions[bot]"
GIT_BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com"


def configure_git_identity(cwd: str = WORKSPACE_DIR) -> None:
    """Gives the container's git a committer identity and trusts the mounted working copy.

    The agent container has no global git identity, so every stage that commits must set one
    first; a dispatched stage that skipped this failed with "Author identity unknown".

    Args:
        cwd: Working copy.
    """
    for args in (
        ["config", "--global", "--add", "safe.directory", "*"],
        ["config", "--global", "user.name", GIT_BOT_NAME],
        ["config", "--global", "user.email", GIT_BOT_EMAIL],
        ["config", "user.name", GIT_BOT_NAME],
        ["config", "user.email", GIT_BOT_EMAIL],
    ):
        try:
            run_git(args, cwd=cwd)
        except (subprocess.CalledProcessError, OSError) as error:
            print(f"Git config notice: {getattr(error, 'stderr', None) or error}", file=sys.stderr)


def checkout_pr_branch(pr_number: int, repo: str, cwd: str = WORKSPACE_DIR) -> Optional[str]:
    """Checks out a pull request's head branch in the working copy, ready for commits.

    Dispatched stages start from the default branch; review and fix runs must read and change the
    pull request's own branch, and a push from the default branch would target the wrong ref. The
    committer identity is configured here because every stage that changes the branch starts here.

    Args:
        pr_number: Pull request number.
        repo: Repository slug.
        cwd: Working copy.

    Returns:
        The head branch name, or None when it could not be checked out.
    """
    try:
        head = json.loads(
            run_gh(["pr", "view", str(pr_number), "--json", "headRefName"], repo=repo)
        )["headRefName"]
        configure_git_identity(cwd)
        run_git(["fetch", "origin", head], cwd=cwd)
        run_git(["checkout", "-B", head, f"origin/{head}"], cwd=cwd)
        return head
    except (subprocess.CalledProcessError, KeyError, ValueError, TypeError) as error:
        print(f"Could not check out the branch of PR #{pr_number}: {error}", file=sys.stderr)
        return None


def run_pr_feedback_fix(
    pr_number: int, plan_number: int, request_number: int, feedback: str, repo: str
) -> None:
    """Apply owner feedback to a PR using the approved plan.

    Checks out the PR branch, runs a single agent fix with a prompt containing the plan
    and the verbatim feedback, commits and pushes the change, posts a comment summarizing
    the agent answer (trimmed to 3000 chars), then starts self‑review again.
    """
    if checkout_pr_branch(pr_number, repo) is None:
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                "<!-- darkfactory-agent -->\n### Branch checkout failed\n\n"
                "The pull request branch could not be checked out, so this stage did not run.",
            ],
            repo=repo,
        )
        block_entity(pr_number, repo=repo, is_pr=True)
        return
    cwd = WORKSPACE_DIR
    # Retrieve the approved plan content.
    try:
        plan_data = json.loads(
            run_gh(["issue", "view", str(plan_number), "--json", "title,body,comments"], repo=repo)
        )
    except Exception as e:
        print(f"Failed to load plan #{plan_number}: {e}", file=sys.stderr)
        return
    plan_body = ""
    for c in reversed(plan_data.get("comments", [])):
        cbody = c.get("body", "")
        if _is_plan_comment(cbody):
            plan_body = cbody
            break
    if not plan_body:
        plan_body = plan_data.get("body", "")
    # Build prompt with plan and feedback.
    prompt = (
        f"Plan approved:\n{plan_body}\n\n"
        f"Owner feedback:\n{feedback}\n\n"
        "Make the necessary changes to address the feedback."
    )
    checkpoint_ctx = {
        "issue_number": pr_number,
        "repo": repo,
        "is_pr": True,
        "completed_steps": ["Feedback fix"],
        "cwd": cwd,
    }
    result = run_agent_prompt(
        prompt, timeout="10m0s", checkpoint_context=checkpoint_ctx, kind="fix"
    )
    if is_quota_exhaustion_notice(result):
        return
    if result.startswith("[DarkFactory Agent Execution Error]"):
        # Post error and block
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Feedback Fix Error\n\n{result}",
            ],
            repo=repo,
        )
        block_entity(pr_number, repo=repo, is_pr=True)
        if request_number:
            block_entity(request_number, repo=repo, is_pr=False)
        return
    # Commit and push changes. The owner's rejection is only answered once a revision is on the
    # branch: an empty or failed commit is reported and blocks, never announced as addressed.
    format_repository(cwd)
    failure = None
    try:
        run_git(["add", "-A"], cwd=cwd)
        status = run_git(["status", "--porcelain"], cwd=cwd)
        if status:
            run_git(["commit", "-m", "fix(feedback): address owner feedback"], cwd=cwd)
            run_git(["push", "origin", "HEAD"], cwd=cwd)
        else:
            failure = "The agent finished without changing any file, so nothing was pushed."
    except subprocess.CalledProcessError as e:
        print(f"Git error during feedback fix: {e.stderr or e.stdout}", file=sys.stderr)
        failure = f"Committing or pushing the revision failed:\n\n```\n{(e.stderr or e.stdout or str(e)).strip()[:1500]}\n```"
    if failure:
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Feedback Fix Error\n\n{failure}\n\n"
                "The feedback was not applied. Reply `/df reject <feedback>` to try again.",
            ],
            repo=repo,
        )
        block_entity(pr_number, repo=repo, is_pr=True)
        if request_number:
            block_entity(request_number, repo=repo, is_pr=False)
        return
    # Post summary comment
    trimmed = result[:3000]
    comment_body = f"### Feedback addressed\n\n{trimmed}"
    run_gh(["pr", "comment", str(pr_number), "--body", comment_body], repo=repo)
    # Continue self‑review
    start_self_review(pr_number, plan_number, request_number, repo)


def run_self_review_iteration(
    pr_number: int,
    plan_number: int,
    request_number: int,
    iteration: int,
    repo: str,
) -> str:
    """Run one iteration of self-review.

    Performs a single review pass against the PR diff, posts a comment with findings
    and a digest marker, and decides the next step based on the findings.

    Args:
        pr_number: The pull request number.
        plan_number: The child Plan issue number.
        request_number: The parent Request issue number.
        iteration: Current iteration number (1-based).
        repo: Repository slug (owner/name).

    Returns:
        "clean" if no findings, "blocked" if no progress, "fix-dispatched" if fix payload sent.
    """
    if checkout_pr_branch(pr_number, repo) is None:
        block_entity(pr_number, repo=repo, is_pr=True)
        return "blocked"
    cwd = WORKSPACE_DIR

    # Get PR diff
    try:
        diff = run_gh(["pr", "diff", str(pr_number)], repo=repo)
    except Exception as e:
        print(f"Failed to get PR diff: {e}", file=sys.stderr)
        return "blocked"

    # Get plan content
    try:
        plan_data = json.loads(
            run_gh(
                ["issue", "view", str(plan_number), "--json", "title,body,comments"],
                repo=repo,
            )
        )
    except Exception as e:
        print(f"Failed to get plan data: {e}", file=sys.stderr)
        return "blocked"

    plan_body = ""
    for c in reversed(plan_data.get("comments", [])):
        cbody = c.get("body", "")
        if _is_plan_comment(cbody):
            plan_body = cbody
            break
    if not plan_body:
        plan_body = plan_data.get("body", "")

    # Deterministic scope check before LLM review
    plan_files = parse_explicit_plan_files(plan_body)
    changed_files = get_pr_changed_files(development_branch(), cwd=cwd)
    in_scope_files, out_of_scope_files = check_scope(changed_files, plan_files)

    # Run LLM review (one pass)
    max_diff_len = 60000
    diff_snippet = (
        diff
        if len(diff) <= max_diff_len
        else f"{diff[:max_diff_len]}\n\n[... diff truncated at {max_diff_len} characters ...]"
    )
    review_prompt = (
        f"Review the following pull request diff for code quality issues.\n"
        f"Look for: bugs, edge cases, missing error handling, missing tests, "
        f"style issues, naming problems, architectural concerns.\n\n"
        f"## Plan Scope (for reference — do NOT evaluate plan alignment here)\n"
        f"{plan_body[:2000]}\n\n"
        f"## PR Diff\n```diff\n{diff_snippet}\n```\n\n"
        f"If you find NO actionable issues, respond starting with: NO_FINDINGS\n"
        f"If you find issues, list each finding with a description and suggested fix."
    )
    checkpoint_ctx = {
        "issue_number": pr_number,
        "repo": repo,
        "is_pr": True,
        "completed_steps": [
            f"Completed implementation and opened PR #{pr_number}",
            f"Self-review iteration {iteration}",
        ],
        "cwd": cwd,
    }
    review_result = run_agent_prompt(
        review_prompt,
        timeout=REVIEW_TIMEOUT,
        checkpoint_context=checkpoint_ctx,
        kind="review",
    )

    if is_quota_exhaustion_notice(review_result):
        return "blocked"

    if review_result.startswith("[DarkFactory Agent Execution Error]"):
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Self-Review Error (Iteration {iteration})\n\n{review_result}",
            ],
            repo=repo,
        )
        return "blocked"

    # Build findings list: out of scope files + parsed review findings
    findings_items = [
        f"Out of scope: {path} (not in the approved plan)" for path in out_of_scope_files
    ]
    findings_items.extend(parse_review_findings(review_result))
    K = len(findings_items)  # number of findings, not lines
    combined_findings = "\n".join(findings_items)

    # Compute normalized findings for digest: each finding stripped + lowercased,
    # then sorted, joined by "\n"
    normalized_sorted = "\n".join(sorted(f.strip().lower() for f in findings_items))
    digest = hashlib.sha1(normalized_sorted.encode("utf-8")).hexdigest()

    # Post ONE PR comment with marker
    # First, check for previous iteration marker to get prior digest
    prior_digest = None
    try:
        comments_res = run_gh(["issue", "view", str(pr_number), "--json", "comments"], repo=repo)
        comments = json.loads(comments_res or "{}").get("comments", []) or []
        # Find the marker from iteration N-1
        for c in comments:
            cbody = c.get("body", "")
            marker_match = re.search(
                r"<!--\s*darkfactory-self-review\s+iteration=(\d+)\s+findings=(\d+)\s+digest=([a-f0-9]+)\s*-->",
                cbody,
            )
            if marker_match and int(marker_match.group(1)) == iteration - 1:
                prior_digest = marker_match.group(3)
                break
    except Exception as e:
        print(f"Failed to read previous comments: {e}", file=sys.stderr)

    # Build findings display as `1.`, `2., ...
    findings_display = (
        "\n".join(f"{i+1}. {f}" for i, f in enumerate(findings_items))
        if findings_items
        else "No actionable findings."
    )

    comment_body = (
        f"### Self-Review — iteration {iteration}\n"
        f"{findings_display}\n"
        f"<!-- darkfactory-self-review iteration={iteration} findings={K} digest={digest} -->"
    )

    # Post the comment
    run_gh(
        [
            "pr",
            "comment",
            str(pr_number),
            "--body",
            comment_body,
        ],
        repo=repo,
    )

    # Case 1: K == 0 → clean
    if K == 0:
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Self-Review — iteration {iteration}\n\n✅ Self-review clean at iteration {iteration}\n<!-- darkfactory-self-review iteration={iteration} findings=0 digest={digest} -->",
            ],
            repo=repo,
        )
        print(f"Self-review passed clean on iteration {iteration}")
        handle_plan_alignment(pr_number, plan_number, request_number, repo)
        return "clean"

    # Case 2: K > 0 and D equals the digest in the marker of iteration N-1 → blocked
    if K > 0 and prior_digest is not None and digest == prior_digest:
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Self-Review Findings (Blocked)\n\n"
                f"Self-review made no progress across iterations (identical findings twice in a row):\n\n"
                f"{combined_findings}",
            ],
            repo=repo,
        )
        block_entity(pr_number, repo=repo, is_pr=True)
        # Also block the request if it exists
        if request_number:
            block_entity(request_number, repo=repo, is_pr=False)
        print(f"Self-review loop made no progress on PR #{pr_number}; marked Blocked.")
        return "blocked"

    # Case 3: Otherwise → dispatch fix
    # Post repository_dispatch agent-dispatch with client_payload
    payload = {
        "stage": "self-review-fix",
        "pr": pr_number,
        "plan": plan_number,
        "request": request_number,
        "iteration": iteration,
    }
    try:
        dispatch_stage(repo, payload)
    except Exception as e:
        print(f"Dispatch failed during self-review: {e}", file=sys.stderr)
        return "blocked"

    print(f"Self-review fix dispatched for iteration {iteration}")
    return "fix-dispatched"


def run_self_review_fix(
    pr_number: int,
    plan_number: int,
    request_number: int,
    iteration: int,
    repo: str,
):
    """Executes fixes for self-review findings in the PR branch.

    Reads the latest findings comment, reverts out-of-scope files, runs the agent
    to fix remaining findings, and dispatches the next review iteration.

    Args:
        pr_number: The pull request number.
        plan_number: The child Plan issue number.
        request_number: The parent Request issue number.
        iteration: Current iteration number (1-based).
        repo: Repository slug (owner/name).
    """
    if checkout_pr_branch(pr_number, repo) is None:
        block_entity(pr_number, repo=repo, is_pr=True)
        return "blocked"
    cwd = WORKSPACE_DIR

    # 1. Read latest PR comment carrying the iteration-N marker
    try:
        comments_res = run_gh(["issue", "view", str(pr_number), "--json", "comments"], repo=repo)
        comments = json.loads(comments_res or "{}").get("comments", []) or []
    except Exception as e:
        print(f"Failed to read comments for PR #{pr_number}: {e}", file=sys.stderr)
        comments = []

    latest_comment_body = None
    for c in reversed(comments):
        cbody = c.get("body", "") if isinstance(c, dict) else str(c)
        m = re.search(
            r"<!--\s*darkfactory-self-review\s+iteration=(\d+)\s+findings=(\d+)\s+digest=([a-zA-Z0-9]+)\s*-->",
            cbody,
        )
        if m and int(m.group(1)) == iteration:
            latest_comment_body = cbody
            break

    if not latest_comment_body:
        # No findings comment found → post a notice and set Blocked; no dispatch.
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Self-Review Fix Notice\n\n"
                f"No self-review findings comment found for iteration {iteration}.",
            ],
            repo=repo,
        )
        block_entity(pr_number, repo=repo, is_pr=True)
        if request_number:
            block_entity(request_number, repo=repo, is_pr=False)
        print(f"No iteration {iteration} findings comment found on PR #{pr_number}; set Blocked.")
        return

    # 2. Parse findings
    findings_items = parse_review_findings(latest_comment_body)

    out_of_scope_files: List[str] = []
    other_findings: List[str] = []

    for item in findings_items:
        match = re.search(r"Out of scope:\s*([^\s(]+)", item, re.IGNORECASE)
        if match:
            out_of_scope_files.append(match.group(1))
        else:
            other_findings.append(item)

    # 3. Out-of-scope file findings: restore those files from the base branch in their own commit
    revert_sha = None
    if out_of_scope_files:
        revert_sha = revert_out_of_scope_files(out_of_scope_files, development_branch(), cwd=cwd)

    # 4. Other findings: one agent fix run on the PR branch with the findings as prompt
    if other_findings:
        formatted_findings = "\n".join(f"{i+1}. {f}" for i, f in enumerate(other_findings))
        fix_prompt = (
            f"Fix the following code review findings in the workspace:\n\n"
            f"{formatted_findings}\n\nMake the necessary changes to resolve all findings."
        )
        checkpoint_ctx = {
            "issue_number": pr_number,
            "repo": repo,
            "is_pr": True,
            "completed_steps": [
                f"Self-review fix iteration {iteration}",
            ],
            "cwd": cwd,
        }
        fix_result = run_agent_prompt(
            fix_prompt,
            timeout="10m0s",
            checkpoint_context=checkpoint_ctx,
            kind="fix",
        )

        if is_quota_exhaustion_notice(fix_result):
            return

        if fix_result.startswith("[DarkFactory Agent Execution Error]"):
            run_gh(
                [
                    "pr",
                    "comment",
                    str(pr_number),
                    "--body",
                    f"<!-- darkfactory-agent -->\n### Self-Review Fix Error (Iteration {iteration})\n\n{fix_result}",
                ],
                repo=repo,
            )
            return

        format_repository(cwd)
        try:
            run_git(["add", "-A"], cwd=cwd)
            status = run_git(["status", "--porcelain"], cwd=cwd)
            if status:
                run_git(
                    [
                        "commit",
                        "-m",
                        f"fix(review): address self-review findings (iteration {iteration})",
                    ],
                    cwd=cwd,
                )
                run_git(["push", "origin", "HEAD"], cwd=cwd)
                print(f"Pushed review fixes for iteration {iteration}")
            else:
                print(f"No changes after fix attempt on iteration {iteration}")
        except subprocess.CalledProcessError as e:
            print(f"Git error during review fix: {e.stderr or e.stdout}", file=sys.stderr)
            run_gh(
                [
                    "pr",
                    "comment",
                    str(pr_number),
                    "--body",
                    f"<!-- darkfactory-agent -->\n### Self-Review Fix Error (Iteration {iteration})\n\n"
                    f"Committing or pushing the fixes failed:\n\n```\n"
                    f"{(e.stderr or e.stdout or str(e)).strip()[:1500]}\n```",
                ],
                repo=repo,
            )
            block_entity(pr_number, repo=repo, is_pr=True)
            return

    # 5. Push, post `### Self-Review fixes — iteration N` summarizing what changed, then dispatch
    summary_parts = []
    if out_of_scope_files:
        sha_str = f" in commit {revert_sha[:7]}" if revert_sha else ""
        summary_parts.append(
            f"Reverted out-of-scope files ({', '.join(out_of_scope_files)}){sha_str}."
        )
    if other_findings:
        summary_parts.append(
            f"Applied fixes for findings:\n" + "\n".join(f"- {f}" for f in other_findings)
        )

    summary_body = f"### Self-Review fixes — iteration {iteration}\n\n" + (
        "\n\n".join(summary_parts) if summary_parts else "No fixes required."
    )

    run_gh(
        [
            "pr",
            "comment",
            str(pr_number),
            "--body",
            f"<!-- darkfactory-agent -->\n{summary_body}",
        ],
        repo=repo,
    )

    payload = {
        "stage": "self-review",
        "pr": pr_number,
        "plan": plan_number,
        "request": request_number,
        "iteration": iteration + 1,
    }
    dispatch_stage(repo, payload)
    print(f"Dispatched self-review iteration {iteration + 1}")


def handle_plan_alignment(pr_number: int, plan_number: int, request_number: int, repo: str):
    """Verifies that the PR implementation matches the plan scope exactly.

    Separate step from self-review. Compares the final PR diff against the Plan
    issue scope (including any scope amendments). Posts Implementation Review on
    the Plan issue and marks PR ready for human review only if aligned.

    Args:
        pr_number: The pull request number.
        plan_number: The child Plan issue number.
        request_number: The parent Request issue number.
        repo: Repository slug (owner/name).
    """
    # Get PR diff
    try:
        diff = run_gh(["pr", "diff", str(pr_number)], repo=repo)
    except Exception as e:
        print(f"Failed to get PR diff for alignment: {e}", file=sys.stderr)
        return

    # Get plan content including scope amendments from comments
    plan_data = json.loads(
        run_gh(
            ["issue", "view", str(plan_number), "--json", "title,body,comments"],
            repo=repo,
        )
    )
    plan_body = plan_data.get("body", "")
    amendments = []
    for c in plan_data.get("comments", []):
        if "Scope Amendment" in c.get("body", ""):
            amendments.append(c["body"])

    full_plan_scope = plan_body
    if amendments:
        full_plan_scope += "\n\n## Scope Amendments\n" + "\n".join(amendments)

    # Run alignment check via agy
    max_diff_len = 60000
    diff_snippet = (
        diff
        if len(diff) <= max_diff_len
        else f"{diff[:max_diff_len]}\n\n[... diff truncated at {max_diff_len} characters ...]"
    )
    alignment_prompt = (
        f"Compare this PR diff against the implementation plan scope.\n\n"
        f"## Full Plan Scope\n{full_plan_scope[:4000]}\n\n"
        f"## PR Diff\n```diff\n{diff_snippet}\n```\n\n"
        f"Determine if the implementation matches the plan scope EXACTLY.\n"
        f"If it matches, respond starting with: MATCHES_PLAN_YES\n"
        f"If there are divergences, list each divergence with details."
    )
    checkpoint_ctx = {
        "issue_number": plan_number,
        "repo": repo,
        "is_pr": False,
        "completed_steps": [
            f"Completed implementation and PR #{pr_number}",
            "Evaluating plan alignment",
        ],
    }
    alignment_result = run_agent_prompt(
        alignment_prompt,
        timeout=REVIEW_TIMEOUT,
        checkpoint_context=checkpoint_ctx,
        kind="review",
    )

    if is_quota_exhaustion_notice(alignment_result):
        return

    if alignment_result.startswith("[DarkFactory Agent Execution Error]"):
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Plan Alignment Error\n\n{alignment_result}",
            ],
            repo=repo,
        )
        fail_agent_run(f"Plan alignment failed on issue #{plan_number}; Execution Error posted.")

    if "MATCHES_PLAN_YES" in alignment_result.upper()[:50]:
        # Post Implementation Review on Plan issue
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                "<!-- darkfactory-agent -->\n### Implementation Review\n\n"
                "**Matches Plan**: Yes\n\nAll changes in the PR align with the plan scope.",
            ],
            repo=repo,
        )
        # Mark PR ready for human review
        try:
            run_gh(["pr", "ready", str(pr_number)], repo=repo)
            print(f"PR #{pr_number} marked ready for review")
        except Exception as e:
            print(f"Failed to mark PR ready: {e}", file=sys.stderr)

        # Unblock entities; alignment success is not completion — stay In Progress until merge.
        unblock_entity(pr_number, repo, is_pr=True, target_status="In Progress")
        unblock_entity(plan_number, repo, is_pr=False, target_status="In Progress")
        if request_number:
            unblock_entity(request_number, repo, is_pr=False, target_status="In Progress")

        # Clear checkpoint on successful completion
        clear_checkpoint(cwd=WORKSPACE_DIR)
    else:
        # Post alignment divergence on Request issue with justification
        run_gh(
            [
                "issue",
                "comment",
                str(request_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Plan Alignment\n\n{alignment_result}",
            ],
            repo=repo,
        )
        # Post on Plan issue
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                f"<!-- darkfactory-agent -->\n### Implementation Review\n\n"
                f"**Matches Plan**: No\n\n{alignment_result}",
            ],
            repo=repo,
        )
        print(f"Plan alignment divergence detected on PR #{pr_number}")


#: One-time hint posted when free text merely mentions a command word.
COMMAND_HINT_BODY = (
    HINT_MARKER
    + "\nThat looks like approval feedback, but only a command on its own line counts as a "
    "decision. Reply with `/df approve` (or `/approve`) to approve, `/df reject` (alias "
    "`/df revise`, or `/reject` / `/revise`) to send the stage back with feedback, or `/df resume` "
    "(or `/resume`) to resume a stopped run. Anything else is answered as ordinary feedback."
)


def post_command_hint_once(issue_number: int, repo: str) -> bool:
    """Posts the command-grammar hint unless it is already on the issue.

    Args:
        issue_number: Issue to hint on.
        repo: Repository slug (owner/name).

    Returns:
        True when a hint was posted.
    """
    try:
        raw = run_gh(["issue", "view", str(issue_number), "--json", "comments"], repo=repo)
    except Exception as exc:  # noqa: BLE001 - an unreadable issue must not fail the run
        print(f"Could not read comments on #{issue_number}: {exc}", file=sys.stderr)
        return False
    try:
        comments = json.loads(raw or "{}").get("comments", []) or []
    except Exception:  # noqa: BLE001 - malformed output means "unknown", so stay silent
        return False
    if any(HINT_MARKER in (c.get("body") or "") for c in comments if isinstance(c, dict)):
        return False
    try_gh(
        ["issue", "comment", str(issue_number), "--body", COMMAND_HINT_BODY],
        repo=repo,
        doing=f"post the command hint on #{issue_number}",
    )
    return True


def _comment_actor(comment: Dict[str, Any]) -> tuple:
    """Extracts the commenter's identity from an `issue_comment` payload.

    Args:
        comment: The ``comment`` object of the webhook payload.

    Returns:
        Tuple of ``(login, author_association, user_type)``.
    """
    user = comment.get("user", {}) or {}
    return (
        user.get("login", "") or "",
        comment.get("author_association", "") or "",
        user.get("type", "") or "",
    )


def dispatch_event(event_path: str, event_name: str):
    """Dispatches the event to the appropriate agent handler."""
    if not os.path.exists(event_path):
        print(f"Event path {event_path} not found.")
        return

    with open(event_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            pass
    if not isinstance(payload, dict):
        payload = {}

    repo_raw = payload.get("repository")
    if isinstance(repo_raw, dict):
        repo = repo_raw.get("full_name") or os.environ.get(
            "GITHUB_REPOSITORY", "marius-patrik/DarkFactory"
        )
    elif isinstance(repo_raw, str) and repo_raw:
        repo = repo_raw
    else:
        repo = os.environ.get("GITHUB_REPOSITORY", "marius-patrik/DarkFactory")

    if event_name == "repository_dispatch":
        action = payload.get("action")
        if action == "agent-dispatch":
            client_payload = payload.get("client_payload", {})
            stage = client_payload.get("stage")
            pr_number = client_payload.get("pr")
            plan_issue = client_payload.get("plan")
            request_issue = client_payload.get("request")
            iteration = client_payload.get("iteration", 1)

            if stage == "self-review":
                run_self_review_iteration(pr_number, plan_issue, request_issue, iteration, repo)
            elif stage == "self-review-fix":
                run_self_review_fix(pr_number, plan_issue, request_issue, iteration, repo)
            elif stage == "pr-feedback-fix":
                # New stage for handling owner feedback on a PR
                feedback = client_payload.get("feedback")
                run_pr_feedback_fix(pr_number, plan_issue, request_issue, feedback, repo)
            elif stage == "resume":
                item = client_payload.get("item")
                is_pr = client_payload.get("is_pr")
                resume_item(item, is_pr, repo)
            return

    if event_name == "issues":
        action = payload.get("action")
        issue = payload.get("issue", {})
        issue_num = issue.get("number")
        labels = [l.get("name") if isinstance(l, dict) else str(l) for l in issue.get("labels", [])]

        if action == "opened" and issue_num:
            lowered = {str(lbl).lower() for lbl in labels}

            # A Plan issue is opened by the pipeline itself, as the child of a Request that has
            # already been interpreted and approved. Interpreting it again asks what a plan means,
            # which is a question nobody posed - and the answer lands on the same issue as the plan
            # that follows moments later, so the issue reads as though two agents disagreed about
            # what it is.
            if "plan" in lowered:
                print(
                    f"Issue #{issue_num} is a Plan; interpretation belongs to its parent Request."
                )
                return

            # A pipeline-failure issue is the pipeline reporting on itself. Interpreting it as a
            # request answers a question nobody asked, and every comment it posts is another event
            # that re-runs the automations whose failure it reports.
            if "pipeline-failure" in lowered:
                print(f"Issue #{issue_num} is a pipeline-failure report; not interpreting it.")
                return

            if not lowered & {"request", "plan"}:
                # Not fatal. An agent that cannot apply a label has still read the issue and can
                # still interpret it; aborting here threw the whole run away and filed a
                # pipeline-failure issue whose only content was a traceback.
                if (
                    try_gh(
                        ["issue", "edit", str(issue_num), "--add-label", "Request"],
                        repo=repo,
                        doing=f"label #{issue_num} as Request",
                    )
                    is not None
                ):
                    print(f"Auto-labeled issue #{issue_num} as Request")
            handle_interpret(issue_num, repo)

    elif event_name == "issue_comment":
        action = payload.get("action")
        comment = payload.get("comment", {})
        comment_body = comment.get("body", "").strip()
        comment_user = comment.get("user", {}).get("login", "")
        issue = payload.get("issue", {})
        issue_num = issue.get("number")
        is_pr = "pull_request" in issue

        # Only process human comments from owner/collaborators, ignore bot/agent comments
        if action == "created" and issue_num:
            if is_bot_or_agent_comment(comment_user, comment_body):
                print(f"Skipping comment on #{issue_num} authored by bot/agent ({comment_user}).")
                return

            labels = [
                l.get("name") if isinstance(l, dict) else str(l) for l in issue.get("labels", [])
            ]
            lowered_labels = {str(lbl).lower() for lbl in labels}

            # A pipeline-failure issue is the pipeline reporting on itself. Comments on it
            # must not run the agent (an LLM call) — unless the comment resumes the run.
            if "pipeline-failure" in lowered_labels:
                if parse_issue_command(comment_body) != "resume":
                    print(
                        f"Skipping comment on pipeline-failure issue #{issue_num}; "
                        "only a resume command resumes it."
                    )
                    return
                unblock_entity(issue_num, repo, is_pr=is_pr)
                handle_respond(issue_num, comment_body, repo=repo, is_pr=is_pr)
                return

            issue_author = ((issue.get("user", {}) or {}).get("login", "")) or ""
            login, association, user_type = _comment_actor(comment)
            allowed = is_allowed_approver(
                login,
                author_association=association,
                issue_author=issue_author,
                user_type=user_type,
            )
            is_request = any(l.lower() == "request" for l in labels)
            is_plan = any(l.lower() == "plan" for l in labels)
            command = parse_issue_command(comment_body)
            if command is not None and not allowed:
                # A stranger's "approve" is feedback, never a gate transition.
                print(
                    f"Ignoring {command} command on #{issue_num} from @{login}: "
                    "not the author nor OWNER/MEMBER/COLLABORATOR."
                )
                command = None
            if command in ("approve", "resume"):
                print(f"Approval comment on #{issue_num} from @{comment_user}.")
                resume_item(issue_num, is_pr, repo, labels)
                return
            elif command == "reject":
                # Owner feedback on a PR or issue. For PRs, dispatch a feedback fix stage.
                print(f"Rejection comment on #{issue_num} from @{comment_user}.")
                feedback = command_feedback(comment_body) or comment_body
                if is_pr:
                    # Find linked plan and request, then dispatch feedback fix
                    plan = find_plan_issue_for_pr(issue_num, repo)
                    if plan:
                        dispatch_stage(
                            repo,
                            {
                                "stage": "pr-feedback-fix",
                                "pr": issue_num,
                                "plan": plan,
                                "request": find_parent_request_number(plan, repo) or plan,
                                "feedback": feedback,
                            },
                        )
                    else:
                        handle_respond(issue_num, comment_body, repo=repo, is_pr=is_pr)
                else:
                    # Non‑PR issues keep previous behaviour
                    if is_request:
                        if has_plan(issue_num, repo):
                            handle_plan(issue_num, issue_num, repo, feedback=feedback)
                        else:
                            handle_interpret(issue_num, repo, feedback=feedback)
                    elif is_plan:
                        request_num = find_parent_request_number(issue_num, repo)
                        if request_num:
                            handle_plan(request_num, issue_num, repo, feedback=feedback)
                        else:
                            print(f"Could not find parent Request for Plan #{issue_num}")
                            handle_respond(issue_num, comment_body, repo=repo, is_pr=is_pr)
                    else:
                        handle_respond(issue_num, comment_body, repo=repo, is_pr=is_pr)
            else:
                if (is_request or is_plan) and is_command_hint(comment_body):
                    post_command_hint_once(issue_num, repo)
                handle_respond(issue_num, comment_body, repo=repo, is_pr=is_pr)

    elif event_name == "pull_request_review_comment":
        action = payload.get("action")
        comment = payload.get("comment", {})
        comment_body = comment.get("body", "").strip()
        comment_user = comment.get("user", {}).get("login", "")
        pr = payload.get("pull_request", {})
        pr_num = pr.get("number")

        if action == "created" and pr_num:
            if is_bot_or_agent_comment(comment_user, comment_body):
                print(
                    f"Skipping PR review comment on #{pr_num} authored by bot/agent ({comment_user})."
                )
                return
            pr_author = ((pr.get("user", {}) or {}).get("login", "")) or ""
            review_user = comment.get("user", {}) or {}
            review_command = parse_pr_command(comment_body)
            if review_command is not None and not is_allowed_approver(
                review_user.get("login", "") or "",
                author_association=comment.get("author_association", "") or "",
                issue_author=pr_author,
                user_type=review_user.get("type", "") or "",
            ):
                print(
                    f"Ignoring {review_command} review comment on #{pr_num}: "
                    "not the author nor OWNER/MEMBER/COLLABORATOR."
                )
                review_command = None
            if review_command in ("approve", "resume"):
                resume_item(pr_num, True, repo)
                return
            print(f"PR review comment on #{pr_num} from @{comment_user}: {comment_body[:80]}...")
            plan = find_plan_issue_for_pr(pr_num, repo) if review_command == "reject" else None
            if plan:
                # A rejection with feedback becomes a code revision on the pull request's branch.
                dispatch_stage(
                    repo,
                    {
                        "stage": "pr-feedback-fix",
                        "pr": pr_num,
                        "plan": plan,
                        "request": find_parent_request_number(plan, repo) or plan,
                        "feedback": command_feedback(comment_body) or comment_body,
                    },
                )
                return
            handle_respond(pr_num, comment_body, repo=repo, is_pr=True)


def development_branch() -> str:
    """Returns the branch pull requests are opened against.

    The stable GitHub default branch may be a release lane rather than the implementation trunk. The failure is not subtle once reached - `pr create --base
    main` against a repository with no `main` simply fails - but it is reached only at the very end
    of an implementation run, after the agent has done all of the work.

    Returns:
        The declared development branch, falling back to `main` for a repository with no manifest.
    """
    try:
        import manifest

        return manifest.load(".").development_branch
    except Exception:  # noqa: BLE001 - a missing manifest must not stop a pull request opening
        return "main"


def _manifest_slug() -> str:
    """Returns `owner/name` from the repository manifest.

    Returns:
        The slug, or an empty string when the manifest cannot be read.
    """
    try:
        import manifest

        loaded = manifest.load(".")
        return f"{loaded.owner}/{loaded.repo}"
    except Exception:  # noqa: BLE001 - a missing manifest must not stop the CLI parsing
        return ""


def resume_item(
    item_number: int, is_pr: bool, repo: str, labels: Optional[List[str]] = None
) -> None:
    """Resume a blocked item (issue or PR) based on its current state.

    This extracts the same behaviour as the approve/resume comment handling:
    - Load the checkpoint.
    - Unblock the item.
    - For a request issue, run plan or implement depending on whether a plan exists.
    - For a plan issue, run implement after unblocking its parent request.
    - For a PR, start self‑review after unblocking the linked plan.
    """
    load_checkpoint(cwd=WORKSPACE_DIR)
    if not is_pr:
        # The comment path already has the labels from its event; a dispatched resume reads them.
        if labels is None:
            # Issue case: fetch labels to decide type
            issue_raw = run_gh(["issue", "view", str(item_number), "--json", "labels"], repo=repo)
            if isinstance(issue_raw, str):
                try:
                    issue_raw = json.loads(issue_raw)
                except Exception:
                    issue_raw = {}
            labels = [
                l.get("name") if isinstance(l, dict) else str(l)
                for l in issue_raw.get("labels", [])
            ]
        is_request = any(l.lower() == "request" for l in labels)
        is_plan = any(l.lower() == "plan" for l in labels)
        if is_request:
            unblock_entity(item_number, repo, is_pr=False, target_status="In Progress")
            if has_plan(item_number, repo):
                handle_implement(item_number, item_number, repo)
            else:
                handle_plan(item_number, item_number, repo)
        elif is_plan:
            unblock_entity(item_number, repo, is_pr=False, target_status="In Progress")
            request_num = find_parent_request_number(item_number, repo)
            if request_num:
                unblock_entity(request_num, repo, is_pr=False, target_status="In Progress")
                handle_implement(item_number, request_num, repo)
            else:
                print(f"Could not find parent Request for Plan #{item_number}")
        else:
            # Only Requests and Plans have stages to resume; anything else is left untouched.
            print(f"Issue #{item_number} is neither a Request nor a Plan; nothing to resume.")
    else:
        # PR case
        unblock_entity(item_number, repo, is_pr=True, target_status="In Progress")
        plan_num = find_plan_issue_for_pr(item_number, repo)
        if plan_num:
            unblock_entity(plan_num, repo, is_pr=False, target_status="In Progress")
            start_self_review(item_number, plan_num, None, repo)
        else:
            print(f"Could not find linked Plan for PR #{item_number}")


def main():
    parser = argparse.ArgumentParser(description="Antigravity CI Agent Runner")
    parser.add_argument(
        "command",
        choices=[
            "dispatch",
            "interpret",
            "plan",
            "implement",
            "self-review",
            "self-review-fix",
            "plan-alignment",
            "respond",
            "token-refresh",
        ],
        nargs="?",
        default="dispatch",
    )
    parser.add_argument("--issue", type=int, help="Issue number")
    parser.add_argument("--request-issue", type=int, help="Parent request issue number")
    parser.add_argument("--plan-issue", type=int, help="Child plan issue number")
    parser.add_argument("--pr-number", type=int, help="Pull request number")
    parser.add_argument("--iteration", type=int, default=1, help="Self-review iteration number")
    # Defaulting to a named repository sends a stray invocation at somebody else's project. The
    # environment says where this is running; the manifest says what the repository calls itself.
    parser.add_argument(
        "--repo",
        default=os.environ.get("GITHUB_REPOSITORY") or _manifest_slug(),
        help="Repository full name; defaults to GITHUB_REPOSITORY, then the manifest",
    )
    parser.add_argument("--comment", help="Comment body for respond command")
    parser.add_argument("--is-pr", action="store_true", help="Flag if comment is on pull request")

    args = parser.parse_args()

    # Every agent call in the pipeline goes through df: configure its accounts from the
    # environment before anything dispatches.
    try:
        setup_df_accounts()
    except Exception as exc:  # noqa: BLE001 - setup must never stop the dispatch itself
        print(f"df setup notice: {exc}", file=sys.stderr)

    if args.command == "token-refresh":
        print("df account setup completed successfully.")

    elif args.command == "interpret" and args.issue:
        handle_interpret(args.issue, args.repo)

    elif args.command == "plan" and args.request_issue and args.plan_issue:
        handle_plan(args.request_issue, args.plan_issue, args.repo)

    elif args.command == "implement" and args.plan_issue and args.request_issue:
        handle_implement(args.plan_issue, args.request_issue, args.repo)

    elif args.command == "self-review" and args.pr_number and args.plan_issue:
        run_self_review_iteration(
            args.pr_number,
            args.plan_issue,
            args.request_issue or args.plan_issue,
            args.iteration,
            args.repo,
        )

    elif (
        args.command == "self-review-fix"
        and args.pr_number
        and args.plan_issue
        and args.request_issue
    ):
        run_self_review_fix(
            args.pr_number, args.plan_issue, args.request_issue, args.iteration, args.repo
        )

    elif (
        args.command == "plan-alignment"
        and args.pr_number
        and args.plan_issue
        and args.request_issue
    ):
        handle_plan_alignment(args.pr_number, args.plan_issue, args.request_issue, args.repo)

    elif args.command == "respond" and args.issue:
        handle_respond(args.issue, args.comment or "", args.repo, is_pr=args.is_pr)

    elif args.command == "dispatch":
        path = os.environ.get("GITHUB_EVENT_PATH", "")
        name = os.environ.get("GITHUB_EVENT_NAME", "")
        dispatch_event(path, name)


if __name__ == "__main__":
    main()
