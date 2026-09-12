"""Reads harness credentials from this machine and sets them as repository secrets.

Getting a repository authenticated meant knowing, for each harness, where its CLI keeps its
credential, which of several forms is the durable one, and what the secret is called. That is a
page of instructions nobody reads twice, and every one of its steps is a chance to paste the wrong
thing.

It is worth automating rather than documenting because the failure is silent. A short-lived access
token copied instead of a long-lived one works for minutes and then stops, and the run that follows
looks like a broken harness rather than an expired credential.

Nothing is printed. A value read from a keychain is piped into `gh secret set` and never returned
through this process's output, so a credential cannot end up in a terminal scrollback or a log.
"""

import json
import os
import shutil
import subprocess
import sys
from typing import Dict, List, NamedTuple, Optional


class Source(NamedTuple):
    """Where one credential lives on this machine, and what it is called remotely.

    Attributes:
        secret: Repository secret to set.
        describe: What the credential is, for the summary.
        keychain: macOS keychain service holding it, when it lives there.
        json_path: Dotted path into that entry's JSON, when the entry is JSON.
        env: Environment variable to read instead, when one is set.
        file: Path to a file holding it, when it lives on disk.
        advice: What to run when it cannot be found.
        keychain_account: Account attribute in keychain, when needed.
        default: Static default value when not discovered elsewhere.
    """

    secret: str
    describe: str
    keychain: str = ""
    json_path: str = ""
    env: str = ""
    file: str = ""
    advice: str = ""
    keychain_account: str = ""


#: Credentials this can collect, in the order the harness ladder tries them.
#:
#: Claude is read from the environment or a file rather than the keychain on purpose. The keychain
#: entry holds a *short-lived* access token that the CLI refreshes every few hours; copying it
#: produces a secret that works briefly and then fails in a way that looks like a broken harness.
#: `claude setup-token` mints the long-lived one, which is what belongs in a secret.
SOURCES: List[Source] = [
    Source(
        secret="CLAUDE_CODE_OAUTH_TOKEN",
        describe="Claude subscription token",
        env="CLAUDE_CODE_OAUTH_TOKEN",
        advice="run `claude setup-token` and export CLAUDE_CODE_OAUTH_TOKEN with the result",
    ),
    Source(
        secret="ANTHROPIC_API_KEY",
        describe="Anthropic API key",
        env="ANTHROPIC_API_KEY",
        advice="export ANTHROPIC_API_KEY, or prefer CLAUDE_CODE_OAUTH_TOKEN for a subscription",
    ),
    Source(
        secret="ANTIGRAVITY_REFRESH_TOKEN",
        describe="Antigravity refresh token (primary account)",
        file="~/.gemini/antigravity-cli/antigravity-oauth-token",
        keychain="antigravity-cli",
        json_path="token.refresh_token",
        env="ANTIGRAVITY_REFRESH_TOKEN",
        advice="sign in with the Antigravity CLI, or export ANTIGRAVITY_REFRESH_TOKEN",
    ),
    Source(
        secret="ANTIGRAVITY_CLIENT_ID",
        describe="Antigravity client id",
        env="ANTIGRAVITY_CLIENT_ID",
        advice="export ANTIGRAVITY_CLIENT_ID",
    ),
    Source(
        secret="ANTIGRAVITY_CLIENT_SECRET",
        describe="Antigravity client secret",
        env="ANTIGRAVITY_CLIENT_SECRET",
        advice="export ANTIGRAVITY_CLIENT_SECRET",
    ),
    Source(
        secret="ANTIGRAVITY_REFRESH_TOKEN_2",
        describe="Antigravity refresh token (secondary account)",
        keychain="gemini",
        keychain_account="antigravity",
        json_path="token.refresh_token",
        env="ANTIGRAVITY_REFRESH_TOKEN_2",
        advice="sign in with secondary Antigravity account, or export ANTIGRAVITY_REFRESH_TOKEN_2",
    ),
    Source(
        secret="ANTIGRAVITY_CLIENT_ID_2",
        describe="Antigravity client id (secondary account)",
        env="ANTIGRAVITY_CLIENT_ID_2",
        advice="export ANTIGRAVITY_CLIENT_ID_2",
    ),
    Source(
        secret="ANTIGRAVITY_CLIENT_SECRET_2",
        describe="Antigravity client secret (secondary account)",
        env="ANTIGRAVITY_CLIENT_SECRET_2",
        advice="export ANTIGRAVITY_CLIENT_SECRET_2",
    ),
    Source(
        secret="CLAUDE_CODE_OAUTH_TOKEN_2",
        describe="Claude subscription token (secondary account)",
        env="CLAUDE_CODE_OAUTH_TOKEN_2",
        advice="run `claude setup-token` on secondary account and export CLAUDE_CODE_OAUTH_TOKEN_2",
    ),
    Source(
        secret="ANTHROPIC_API_KEY_2",
        describe="Anthropic API key (secondary account)",
        env="ANTHROPIC_API_KEY_2",
        advice="export ANTHROPIC_API_KEY_2",
    ),
    Source(
        secret="OPENAI_API_KEY",
        describe="OpenAI API key",
        env="OPENAI_API_KEY",
        advice="export OPENAI_API_KEY",
    ),
    Source(
        secret="GH_PROJECT_TOKEN",
        describe="GitHub token able to write Projects v2",
        env="GH_PROJECT_TOKEN",
        advice="a token with `project` scope; `gh auth token` has one if you granted it",
    ),
]


def _dig(data: object, path: str) -> Optional[str]:
    """Follows a dotted path into parsed JSON.

    Args:
        data: Parsed JSON.
        path: Dotted path, e.g. `token.refresh_token`.

    Returns:
        The value as text, or `None` when the path does not resolve to one.
    """
    for key in path.split("."):
        if not isinstance(data, dict) or key not in data:
            return None
        data = data[key]
    return data if isinstance(data, str) and data else None


def read(source: Source) -> Optional[str]:
    """Finds one credential on this machine.

    The environment wins over the keychain: an operator who exported something meant it.

    Args:
        source: Where to look.

    Returns:
        The credential, or `None` when it is not present.
    """
    if source.env and os.environ.get(source.env):
        return os.environ[source.env]

    if source.file and os.path.isfile(os.path.expanduser(source.file)):
        with open(os.path.expanduser(source.file), encoding="utf-8") as handle:
            value = handle.read().strip()
        if value:
            if source.json_path:
                try:
                    parsed = _dig(json.loads(value), source.json_path)
                    if parsed:
                        return parsed
                except json.JSONDecodeError:
                    pass
            else:
                return value

    if source.keychain and sys.platform == "darwin" and shutil.which("security"):
        account_args = ["-a", source.keychain_account] if source.keychain_account else []
        try:
            raw = subprocess.run(
                ["security", "find-generic-password", "-s", source.keychain, *account_args, "-w"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
        except subprocess.CalledProcessError:
            raw = ""
        if raw.startswith("go-keyring-base64:"):
            try:
                import base64

                raw = base64.b64decode(raw.split(":", 1)[1]).decode("utf-8")
            except Exception:
                pass
        if raw:
            if not source.json_path:
                return raw
            try:
                parsed = _dig(json.loads(raw), source.json_path)
                if parsed:
                    return parsed
            except json.JSONDecodeError:
                pass
    return None


def set_secret(repo: str, name: str, value: str) -> bool:
    """Sets one repository secret without the value passing through this process's output.

    Args:
        repo: `owner/name` of the repository.
        name: Secret name.
        value: Secret value.

    Returns:
        True when it was set.
    """
    try:
        subprocess.run(
            ["gh", "secret", "set", name, "--repo", repo],
            input=value,
            text=True,
            capture_output=True,
            check=True,
        )
        return True
    except subprocess.CalledProcessError as exc:
        print(f"  {name}: could not set ({exc.stderr.strip()[:80]})", file=sys.stderr)
        return False


def collect(repos: List[str], only: Optional[List[str]] = None) -> Dict[str, List[str]]:
    """Sets every credential this machine can offer, on every named repository.

    Args:
        repos: Repositories to set secrets on.
        only: Secret names to limit to, or `None` for all.

    Returns:
        Mapping of repository to the secrets set on it.
    """
    wanted = [s for s in SOURCES if not only or s.secret in only]
    found = [(s, read(s)) for s in wanted]

    for source, value in found:
        if value is None:
            print(f"  {source.secret}: not found — {source.advice}")

    results: Dict[str, List[str]] = {}
    for repo in repos:
        applied = []
        for source, value in found:
            if value and set_secret(repo, source.secret, value):
                applied.append(source.secret)
        results[repo] = applied
        print(f"{repo}: set {len(applied)} secret(s) — {', '.join(applied) or 'none'}")
    return results


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Entry point: sets credentials on the repositories named on the command line."""
    import argparse

    parser = argparse.ArgumentParser(description=__doc__.split("\n", maxsplit=1)[0])
    parser.add_argument("repos", nargs="+", help="Repositories as owner/name")
    parser.add_argument("--only", nargs="*", help="Limit to these secret names")
    args = parser.parse_args()
    collect(args.repos, args.only)


if __name__ == "__main__":
    main()
