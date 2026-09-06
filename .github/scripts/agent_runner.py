"""Runner for the containerized, harness-agnostic CI agent.

Drives whichever coding-agent CLI is available - Antigravity, Claude Code, Codex, Kimi, Grok,
Cursor, or opencode - through the declarative registry in :mod:`harnesses`. Nothing below knows
which CLI is running.

Handles credential refresh, stage dispatching (interpret, plan, implement, self-review,
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
import random
import uuid
from typing import Any, Dict, List, Optional, Tuple

ANTIGRAVITY_CLIENT_ID = os.environ.get("ANTIGRAVITY_CLIENT_ID", "")
ANTIGRAVITY_CLIENT_SECRET = os.environ.get("ANTIGRAVITY_CLIENT_SECRET", "")
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

_CANDIDATE_DIRS = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.environ.get("GITHUB_WORKSPACE", "/workspace"), ".github", "scripts"),
    "/usr/local/share/darkfactory-scripts",
    "/usr/local/share/omnis-scripts",
    "/workspace/.github/scripts",
]
for _d in _CANDIDATE_DIRS:
    if os.path.isdir(_d) and _d not in sys.path:
        sys.path.insert(0, _d)

import harnesses
from harnesses import Harness, resolve_attempts

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
    re.compile(r"\b(?:model|service|endpoint)\s*(?:is\s*)?unavailable\b", re.IGNORECASE),
    re.compile(r"\b(?:model|server|service)\s*(?:is\s*)?overloaded\b", re.IGNORECASE),
]

TYPE_LABELS = ["feat", "bug", "chore", "refactor", "test", "ci", "docs"]
AREA_LABELS = [
    "area:core",
    "area:ui",
    "area:term",
    "area:agents",
    "area:browser",
    "area:data",
    "area:ext",
    "area:ci",
    "area:docs",
]


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

    Args:
        text: Title and body text to inspect.

    Returns:
        Tuple of (type_label, area_label).
    """
    lower = text.lower()

    # Determine type label
    t_label = "feat"
    if re.search(r"\b(fix|bug|error|crash|broken|fail)\b", lower):
        t_label = "bug"
    elif re.search(
        r"\b(docs?|document|documents|documenting|documentation|docstrings?|mkdocs|readme)\b", lower
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

    # Determine area label. Ordered most-specific first: a request naming both "terminal" and
    # "renderer" belongs to area:term, not area:ui.
    a_label = "area:ci"
    if re.search(r"\b(terminal|cell[- ]?grid|ansi|sixel|braille|pty|tui|glyph|monospace)\b", lower):
        a_label = "area:term"
    elif re.search(r"\b(browser|chromium|cdp|axtree|webview|screencast|devtools)\b", lower):
        a_label = "area:browser"
    elif re.search(r"\b(agent|harness|persona|provider|llm|prompt|approval)\b", lower):
        a_label = "area:agents"
    elif re.search(r"\b(extension|plugin|addon|sandbox|shim)\b", lower):
        a_label = "area:ext"
    elif re.search(r"\b(schema|migration|persistence|storage|database|sync|drizzle)\b", lower):
        a_label = "area:data"
    elif re.search(
        r"\b(daemon|omnisd|kernel|microkernel|ipc|bus|substrate|socket|process|topology"
        r"|config|settings|capability)\b",
        lower,
    ):
        a_label = "area:core"
    elif re.search(
        r"\b(ui|gui|window|titlebar|chrome|theme|brand|icon|layout|dockview|typography"
        r"|vibrancy|render|display|screen|palette)\b",
        lower,
    ):
        a_label = "area:ui"
    elif re.search(r"\b(doc|docs|documentation|mkdocs|material)\b", lower):
        a_label = "area:docs"
    elif re.search(r"\b(ci|action|workflow|pipeline|docker|runner|automation)\b", lower):
        a_label = "area:ci"

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
    """
    cmd = ["gh"] + args
    if repo:
        cmd.extend(["--repo", repo])
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return res.stdout.strip()


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
            if hasattr(client, "set_status"):
                client.set_status(entity_url, "Blocked")
            else:
                item_id = client.add_item(entity_url)
                if item_id:
                    client.edit_status(item_id, "Blocked")
                    print(f"Updated project board status to Blocked for {entity_url}")
        except Exception as e:
            print(f"Notice: Failed to update project status: {e}", file=sys.stderr)


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

    # 2. Update Project status
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

    comment_body = (
        "<!-- omnis-agent -->\n"
        "### ⚠️ Omnis Agent Quota Exhaustion Notice\n\n"
        "Execution has paused because API quota was exhausted across every configured "
        "harness and model:\n"
        f"{models_formatted}\n\n"
        "#### Completed Steps\n"
        f"{steps_formatted}\n\n"
        "#### Checkpoint Information\n"
        f"- **Branch**: `{branch_name or 'N/A'}`\n"
        "- **Checkpoint**: Progress preserved in `.antigravity_checkpoint.json`\n"
        "- **Project Status**: Updated to `Blocked`\n\n"
        "#### Instructions to Resume\n"
        "When quota limits reset or additional quota is provisioned:\n"
        "1. Verify that quota is available on at least one configured harness.\n"
        "2. Comment `approve` or `/resume` on this issue/PR to resume execution.\n"
        "3. The agent resumes from the checkpoint on whichever harness is available.\n"
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

    return checkpoint_data


def run_agent_prompt(
    prompt: str,
    model: Optional[str] = None,
    timeout: str = "5m0s",
    max_retries: int = 2,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
    fallback_models: Optional[List[str]] = None,
    checkpoint_context: Optional[Dict[str, Any]] = None,
) -> str:
    """Executes a prompt non-interactively against the first harness that succeeds.

    Walks the resolved harness chain (see :mod:`harnesses`), trying each harness and each of its
    models in order. Transient quota errors are retried with exponential backoff; a persistent quota
    error falls through to the next attempt; any other failure returns immediately, because falling
    through on a genuine bug would burn every harness on the same broken prompt.

    Args:
        prompt: Instruction prompt to execute.
        model: Optional model pinned onto the first available harness.
        timeout: Print-mode timeout as a Go duration string.
        max_retries: Transient retry attempts per attempt before escalating.
        base_delay: Initial retry delay in seconds.
        backoff_factor: Exponential backoff multiplier.
        fallback_models: Optional explicit model chain, overriding the first harness's own.
        checkpoint_context: Optional context for checkpointing when every attempt is exhausted.

    Returns:
        Agent text output, or an explicit error description prefixed
        ``[Omnis Agent Execution Error]``.
    """
    chain = fallback_models or ([model] if model else None)
    attempts = resolve_attempts(model_chain=chain)

    if not attempts:
        err = (
            "[Omnis Agent Execution Error]: No usable harness. "
            "No CLI from AGENT_HARNESS_CHAIN is on PATH with credentials."
        )
        print(err, file=sys.stderr)
        return err

    env = os.environ.copy()
    env.setdefault("TERM", "xterm-256color")
    last_error_detail = ""
    tried: List[str] = []

    for harness, current_model in attempts:
        label = f"{harness.name}" + (f"/{current_model}" if current_model else "")
        tried.append(label)
        argv = harness.build_argv(prompt, current_model, timeout)

        for attempt in range(max_retries + 1):
            try:
                res = subprocess.run(argv, capture_output=True, text=True, check=True, env=env)
                if len(tried) > 1:
                    print(f"Succeeded on {label} after {len(tried) - 1} exhausted attempt(s).")
                return res.stdout.strip()
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
                last_error_detail = detail

                if not is_quota_exhausted(detail):
                    err = (
                        f"[Omnis Agent Execution Error]: `{harness.binary}` invocation failed "
                        f"(exit code {e.returncode}): {detail}"
                    )
                    print(err, file=sys.stderr)
                    return err

                if attempt < max_retries:
                    delay = calculate_backoff(
                        attempt, base_delay=base_delay, backoff_factor=backoff_factor
                    )
                    print(
                        f"Transient rate limit on {label} "
                        f"(attempt {attempt + 1}/{max_retries + 1}): {detail}. "
                        f"Retrying in {delay:.2f}s...",
                        file=sys.stderr,
                    )
                    time.sleep(delay)
                    continue

                print(
                    f"Quota exhausted on {label} after {max_retries + 1} attempts. "
                    f"Escalating to the next harness/model in the chain...",
                    file=sys.stderr,
                )
                break
            except Exception as e:  # noqa: BLE001 - surface anything unexpected verbatim
                err = f"[Omnis Agent Execution Error]: Unexpected failure executing {label}: {e}"
                print(err, file=sys.stderr)
                return err

    err = (
        f"[Omnis Agent Execution Error]: Quota exhausted across every harness and model "
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


def handle_interpret(issue_number: int, repo: str):
    """Generates and posts an interpretation comment on a Request issue."""
    raw_issue = run_gh(
        ["issue", "view", str(issue_number), "--json", "title,body,labels"], repo=repo
    )
    data = json.loads(raw_issue)
    title = data.get("title", "")
    body = data.get("body", "")

    t_label, a_label = classify_type_and_area(f"{title} {body}")
    run_gh(["issue", "edit", str(issue_number), "--add-label", f"{t_label},{a_label}"], repo=repo)

    prompt = (
        f"Analyze this user request issue:\nTitle: {title}\nBody: {body}\n\n"
        "Draft a structured Interpretation comment containing:\n"
        "1. Verbatim Request Summary\n"
        "2. Architectural Scope & Breakdown\n"
        "3. Proposed Verification Plan\n"
        "Keep it concise and clear."
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
    interpretation = run_agent_prompt(prompt, checkpoint_context=checkpoint_ctx)

    if is_quota_exhausted(interpretation):
        return

    if interpretation.startswith("[Omnis Agent Execution Error]"):
        comment = (
            "<!-- omnis-agent -->\n" f"### Omnis Agent Execution Error\n\n" f"{interpretation}\n"
        )
    else:
        comment = (
            "<!-- omnis-agent -->\n"
            f"### Omnis Agent Interpretation\n\n"
            f"{interpretation}\n\n"
            f"---\n*Assigned Labels: `{t_label}`, `{a_label}`. Waiting for user approval (`approve`) to create branch and plan.*"
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


def handle_plan(request_number: int, plan_number: int, repo: str):
    """Generates and posts an implementation plan on the child Plan issue."""
    req_data = json.loads(
        run_gh(["issue", "view", str(request_number), "--json", "title,body"], repo=repo)
    )
    prompt = (
        f"Draft a detailed, step-by-step Implementation Plan for Request #{request_number}:\n"
        f"Title: {req_data.get('title')}\nDetails: {req_data.get('body')}\n\n"
        "Include Scope, Architectural & Code Changes, and Verification Steps."
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
    plan_body = run_agent_prompt(prompt, checkpoint_context=checkpoint_ctx)

    if is_quota_exhausted(plan_body):
        return

    if plan_body.startswith("[Omnis Agent Execution Error]"):
        comment = (
            "<!-- omnis-agent -->\n"
            f"### Omnis Agent Execution Error\n\n"
            f"- **Parent Request**: #{request_number}\n\n"
            f"{plan_body}\n"
        )
    else:
        comment = (
            "<!-- omnis-agent -->\n"
            "### Implementation Plan (Autogenerated by the Omnis Agent)\n\n"
            f"- **Parent Request**: #{request_number}\n\n"
            f"{plan_body}\n\n"
            "---\n*Comment `approve` to begin autonomous implementation on branch.*"
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
        "Provide a direct, helpful, and concise response addressing the feedback and detailing next actions."
    )
    response = run_agent_prompt(prompt, checkpoint_context=checkpoint_ctx)
    if is_quota_exhausted(response):
        return

    if response.startswith("[Omnis Agent Execution Error]"):
        body = f"<!-- omnis-agent -->\n### Omnis Agent Execution Error\n\n{response}"
    else:
        body = f"<!-- omnis-agent -->\n### Antigravity Agent Response\n\n{response}"

    if is_pr:
        run_gh(["pr", "comment", str(issue_or_pr_num), "--body", body], repo=repo)
    else:
        run_gh(["issue", "comment", str(issue_or_pr_num), "--body", body], repo=repo)
    print(f"Responded to comment on #{issue_or_pr_num}")


MAX_REVIEW_ITERATIONS = 3


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


def format_repository(cwd: str) -> List[str]:
    """Runs every formatter whose toolchain is present in the repository.

    Formatting is never a review topic (AGENTS.md rule 8), so the agent normalizes the tree itself
    before committing. Each formatter is skipped silently when its manifest is absent, which keeps
    the pipeline green while the repository is still a scaffold.

    Args:
        cwd: Repository working directory.

    Returns:
        Human-readable names of the formatters that actually ran.
    """
    ran: List[str] = []
    for name, manifest, cmd in (
        ("black", "pyproject.toml", ["black", "."]),
        ("cargo fmt", "Cargo.toml", ["cargo", "fmt", "--all"]),
        ("web formatter", "package.json", ["npm", "run", "--if-present", "format"]),
    ):
        if not os.path.exists(os.path.join(cwd, manifest)):
            continue
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        if result.returncode == 0:
            ran.append(name)
        else:
            print(f"Formatter {name} notice: {result.stderr[-500:]}", file=sys.stderr)
    return ran


def verify_repository(cwd: str) -> subprocess.CompletedProcess:
    """Runs every test suite whose toolchain is present in the repository.

    Returns on the first failing suite so the agent's fix prompt receives the output that actually
    matters instead of a concatenation of every suite.

    Args:
        cwd: Repository working directory.

    Returns:
        The completed process of the first failing suite, or of the last suite that ran. A synthetic
        successful result is returned when no suite is present at all.
    """
    last = subprocess.CompletedProcess(args=["true"], returncode=0, stdout="", stderr="")
    for manifest, cmd in (
        ("pyproject.toml", ["python3", "-m", "pytest", "tests/", "-q"]),
        ("Cargo.toml", ["cargo", "test", "--workspace", "--quiet"]),
        ("package.json", ["npm", "test", "--if-present"]),
    ):
        if not os.path.exists(os.path.join(cwd, manifest)):
            continue
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
    try:
        subprocess.run(["git", "config", "--global", "--add", "safe.directory", "*"], check=False)
        subprocess.run(
            ["git", "config", "--global", "user.name", "github-actions[bot]"], check=False
        )
        subprocess.run(
            [
                "git",
                "config",
                "--global",
                "user.email",
                "41898282+github-actions[bot]@users.noreply.github.com",
            ],
            check=False,
        )
        run_git(["config", "user.name", "github-actions[bot]"], cwd=cwd)
        run_git(
            [
                "config",
                "user.email",
                "41898282+github-actions[bot]@users.noreply.github.com",
            ],
            cwd=cwd,
        )
    except Exception as e:
        print(f"Git config notice: {e}", file=sys.stderr)

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
                run_git(["checkout", "-b", branch_name, "origin/main"], cwd=cwd)
    except subprocess.CalledProcessError as e:
        err_msg = f"Failed to create/checkout branch {branch_name}: {e.stderr or e.stdout}"
        print(err_msg, file=sys.stderr)
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                f"<!-- omnis-agent -->\n### Omnis Agent Execution Error\n\n{err_msg}",
            ],
            repo=repo,
        )
        return

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
                "main",
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
        handle_self_review(pr_number, plan_number, repo)
        handle_plan_alignment(pr_number, plan_number, request_number, repo)
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
            implement_prompt, timeout="15m0s", checkpoint_context=checkpoint_ctx
        )
        if is_quota_exhausted(impl_result):
            return

        if impl_result.startswith("[Omnis Agent Execution Error]"):
            run_gh(
                [
                    "issue",
                    "comment",
                    str(plan_number),
                    "--body",
                    f"<!-- omnis-agent -->\n### Omnis Agent Execution Error\n\n{impl_result}",
                ],
                repo=repo,
            )
            return
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
            fix_prompt, timeout="10m0s", checkpoint_context=checkpoint_ctx
        )
        if is_quota_exhausted(fix_result):
            return
        if not fix_result.startswith("[Omnis Agent Execution Error]"):
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
                    "<!-- omnis-agent -->\n### Antigravity Agent Notice\n\n"
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
                f"<!-- omnis-agent -->\n### Omnis Agent Execution Error\n\n{err_msg}",
            ],
            repo=repo,
        )
        return

    # 9. Open Draft PR via workflow dispatch
    pr_body = (
        f"## Summary of Changes\n\n"
        f"{impl_result[:2000]}\n\n"
        f"Closes #{request_number}\n"
        f"Closes #{plan_number}\n"
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
                "base=main",
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
                    "main",
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
                    "main",
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

    # 11. Self-review loop
    handle_self_review(pr_number, plan_number, repo)

    # 12. Plan alignment gate
    handle_plan_alignment(pr_number, plan_number, request_number, repo)


def handle_self_review(pr_number: int, plan_number: int, repo: str):
    """Runs a general PR code review loop via agy.

    Reviews the PR diff for code quality issues. Posts findings and fixes as
    comments on the PR. If fixes require out-of-scope changes, posts a Plan
    Deviation comment with justification on the parent Request issue before
    updating the Plan issue scope.

    Args:
        pr_number: The pull request number.
        plan_number: The child Plan issue number.
        repo: Repository slug (owner/name).
    """
    cwd = WORKSPACE_DIR

    for iteration in range(1, MAX_REVIEW_ITERATIONS + 1):
        print(f"Self-review iteration {iteration}/{MAX_REVIEW_ITERATIONS}")

        # Get PR diff
        try:
            diff = run_gh(["pr", "diff", str(pr_number)], repo=repo)
        except Exception as e:
            print(f"Failed to get PR diff: {e}", file=sys.stderr)
            return

        # Get plan content for scope awareness
        plan_data = json.loads(
            run_gh(["issue", "view", str(plan_number), "--json", "body"], repo=repo)
        )
        plan_body = plan_data.get("body", "")

        # Review via agy
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
            f"If you find issues, list each finding with a description and suggested fix. "
            f"For each finding, mark it WITHIN_SCOPE or OUT_OF_SCOPE relative to the plan."
        )
        checkpoint_ctx = {
            "issue_number": pr_number,
            "repo": repo,
            "is_pr": True,
            "completed_steps": [
                f"Completed implementation and opened PR #{pr_number}",
                f"Self-review iteration {iteration}/{MAX_REVIEW_ITERATIONS}",
            ],
            "cwd": cwd,
        }
        review_result = run_agent_prompt(review_prompt, checkpoint_context=checkpoint_ctx)

        if is_quota_exhausted(review_result):
            return

        if review_result.startswith("[Omnis Agent Execution Error]"):
            run_gh(
                [
                    "pr",
                    "comment",
                    str(pr_number),
                    "--body",
                    f"<!-- omnis-agent -->\n### Self-Review Error (Iteration {iteration})\n\n{review_result}",
                ],
                repo=repo,
            )
            return

        # Check if clean
        if "NO_FINDINGS" in review_result.upper()[:50]:
            run_gh(
                [
                    "pr",
                    "comment",
                    str(pr_number),
                    "--body",
                    f"<!-- omnis-agent -->\n### Self-Review Findings (Iteration {iteration})\n\n"
                    f"✅ No actionable findings. Code review passed.",
                ],
                repo=repo,
            )
            print(f"Self-review passed clean on iteration {iteration}")
            return

        # Post findings on PR
        run_gh(
            [
                "pr",
                "comment",
                str(pr_number),
                "--body",
                f"<!-- omnis-agent -->\n### Self-Review Findings (Iteration {iteration})\n\n{review_result}",
            ],
            repo=repo,
        )

        # Handle out-of-scope findings: post deviation on Request issue
        if "OUT_OF_SCOPE" in review_result.upper():
            request_number = find_parent_request_number(plan_number, repo)
            if request_number:
                deviation_prompt = (
                    f"The self-review found out-of-scope findings that need fixing. "
                    f"Generate a concise Plan Deviation comment explaining what needs "
                    f"to change and WHY it is necessary (justification), based on:\n\n"
                    f"{review_result}"
                )
                deviation_text = run_agent_prompt(
                    deviation_prompt, checkpoint_context=checkpoint_ctx
                )
                if is_quota_exhausted(deviation_text):
                    return
                if not deviation_text.startswith("[Omnis Agent Execution Error]"):
                    run_gh(
                        [
                            "issue",
                            "comment",
                            str(request_number),
                            "--body",
                            f"<!-- omnis-agent -->\n### Plan Deviation\n\n{deviation_text}",
                        ],
                        repo=repo,
                    )
                    run_gh(
                        [
                            "issue",
                            "comment",
                            str(plan_number),
                            "--body",
                            f"<!-- omnis-agent -->\n### Scope Amendment\n\n{deviation_text}",
                        ],
                        repo=repo,
                    )

        # Fix findings via agy
        fix_prompt = (
            f"Fix the following code review findings in the workspace:\n\n"
            f"{review_result}\n\nMake the necessary changes to resolve all findings."
        )
        fix_result = run_agent_prompt(
            fix_prompt, timeout="10m0s", checkpoint_context=checkpoint_ctx
        )

        if is_quota_exhausted(fix_result):
            return

        if fix_result.startswith("[Omnis Agent Execution Error]"):
            run_gh(
                [
                    "pr",
                    "comment",
                    str(pr_number),
                    "--body",
                    f"<!-- omnis-agent -->\n### Self-Review Fix Error (Iteration {iteration})\n\n{fix_result}",
                ],
                repo=repo,
            )
            return

        # Format, commit, push
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
                run_gh(
                    [
                        "pr",
                        "comment",
                        str(pr_number),
                        "--body",
                        f"<!-- omnis-agent -->\n### Self-Review Fix (Iteration {iteration})\n\n{fix_result[:2000]}",
                    ],
                    repo=repo,
                )
                print(f"Pushed review fixes for iteration {iteration}")
            else:
                print(f"No changes after fix attempt on iteration {iteration}")
                return
        except subprocess.CalledProcessError as e:
            print(f"Git error during review fix: {e.stderr or e.stdout}", file=sys.stderr)
            return

    print(f"Self-review loop exhausted after {MAX_REVIEW_ITERATIONS} iterations")


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
    alignment_result = run_agent_prompt(alignment_prompt, checkpoint_context=checkpoint_ctx)

    if is_quota_exhausted(alignment_result):
        return

    if alignment_result.startswith("[Omnis Agent Execution Error]"):
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                f"<!-- omnis-agent -->\n### Plan Alignment Error\n\n{alignment_result}",
            ],
            repo=repo,
        )
        return

    if "MATCHES_PLAN_YES" in alignment_result.upper()[:50]:
        # Post Implementation Review on Plan issue
        run_gh(
            [
                "issue",
                "comment",
                str(plan_number),
                "--body",
                "<!-- omnis-agent -->\n### Implementation Review\n\n"
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

        # Unblock entities and move status to Done
        unblock_entity(pr_number, repo, is_pr=True, target_status="Done")
        unblock_entity(plan_number, repo, is_pr=False, target_status="Done")
        if request_number:
            unblock_entity(request_number, repo, is_pr=False, target_status="Done")

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
                f"<!-- omnis-agent -->\n### Plan Alignment\n\n{alignment_result}",
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
                f"<!-- omnis-agent -->\n### Implementation Review\n\n"
                f"**Matches Plan**: No\n\n{alignment_result}",
            ],
            repo=repo,
        )
        print(f"Plan alignment divergence detected on PR #{pr_number}")


def dispatch_event(event_path: str, event_name: str):
    """Dispatches the event to the appropriate agent handler."""
    if not os.path.exists(event_path):
        print(f"Event path {event_path} not found.")
        return

    with open(event_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    repo = payload.get("repository", {}).get("full_name", "marius-patrik/DarkFactory")
    refresh_tok = os.environ.get("ANTIGRAVITY_REFRESH_TOKEN")

    if refresh_tok:
        try:
            tok_res = refresh_google_oauth_token(refresh_tok)
            setup_antigravity_credentials(tok_res["access_token"], refresh_tok)
            print("Successfully refreshed Antigravity Google OAuth token!")
        except Exception as e:
            print(f"Token refresh notice: {e}", file=sys.stderr)

    if event_name == "issues":
        action = payload.get("action")
        issue = payload.get("issue", {})
        issue_num = issue.get("number")
        labels = [l.get("name") if isinstance(l, dict) else str(l) for l in issue.get("labels", [])]

        if action == "opened" and issue_num:
            # Auto-tag as Request if unlabelled
            if not any(lbl.lower() in ("request", "plan") for lbl in labels):
                run_gh(["issue", "edit", str(issue_num), "--add-label", "Request"], repo=repo)
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
            is_request = any(l.lower() == "request" for l in labels)
            is_plan = any(l.lower() == "plan" for l in labels)
            if re.search(
                r"(?i)^\s*(?:/approve|approve|good|lgtm|/resume|resume)\s*$", comment_body
            ):
                print(f"Approval comment on #{issue_num} from @{comment_user}.")
                load_checkpoint(cwd=WORKSPACE_DIR)
                if is_request:
                    unblock_entity(issue_num, repo, is_pr=False, target_status="In Progress")
                    plan_num = create_child_plan_issue(issue_num, repo)
                    handle_plan(issue_num, plan_num, repo)
                elif is_plan:
                    unblock_entity(issue_num, repo, is_pr=False, target_status="In Progress")
                    request_num = find_parent_request_number(issue_num, repo)
                    if request_num:
                        unblock_entity(request_num, repo, is_pr=False, target_status="In Progress")
                        handle_implement(issue_num, request_num, repo)
                    else:
                        print(f"Could not find parent Request for Plan #{issue_num}")
                elif is_pr:
                    unblock_entity(issue_num, repo, is_pr=True, target_status="In Progress")
                    # Retrieve linked plan issue and resume self-review or plan alignment
                    plan_num = find_plan_issue_for_pr(issue_num, repo)
                    if plan_num:
                        unblock_entity(plan_num, repo, is_pr=False, target_status="In Progress")
                        handle_self_review(issue_num, plan_num, repo)
                    else:
                        print(f"Could not find linked Plan for PR #{issue_num}")
            else:
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
            if re.search(
                r"(?i)^\s*(?:/approve|approve|good|lgtm|/resume|resume)\s*$", comment_body
            ):
                unblock_entity(pr_num, repo, is_pr=True, target_status="In Progress")
                plan_num = find_plan_issue_for_pr(pr_num, repo)
                if plan_num:
                    unblock_entity(plan_num, repo, is_pr=False, target_status="In Progress")
                    handle_self_review(pr_num, plan_num, repo)
                    return
            print(f"PR review comment on #{pr_num} from @{comment_user}: {comment_body[:80]}...")
            handle_respond(pr_num, comment_body, repo=repo, is_pr=True)


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
    parser.add_argument("--repo", default="marius-patrik/omnis", help="Repository full name")
    parser.add_argument("--comment", help="Comment body for respond command")
    parser.add_argument("--is-pr", action="store_true", help="Flag if comment is on pull request")

    args = parser.parse_args()

    # Automatically refresh Google OAuth token and configure Antigravity credentials
    # whenever ANTIGRAVITY_REFRESH_TOKEN is present in the environment
    refresh_tok = os.environ.get("ANTIGRAVITY_REFRESH_TOKEN")
    if refresh_tok:
        try:
            tok_res = refresh_google_oauth_token(refresh_tok)
            setup_antigravity_credentials(tok_res["access_token"], refresh_tok)
            print("Successfully refreshed Antigravity Google OAuth token!")
        except Exception as e:
            print(f"Token refresh notice: {e}", file=sys.stderr)

    if args.command == "token-refresh":
        if not refresh_tok:
            print("ANTIGRAVITY_REFRESH_TOKEN not set.", file=sys.stderr)
            sys.exit(1)
        print("Token refresh and credentials configuration completed successfully.")

    elif args.command == "interpret" and args.issue:
        handle_interpret(args.issue, args.repo)

    elif args.command == "plan" and args.request_issue and args.plan_issue:
        handle_plan(args.request_issue, args.plan_issue, args.repo)

    elif args.command == "implement" and args.plan_issue and args.request_issue:
        handle_implement(args.plan_issue, args.request_issue, args.repo)

    elif args.command == "self-review" and args.pr_number and args.plan_issue:
        handle_self_review(args.pr_number, args.plan_issue, args.repo)

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
