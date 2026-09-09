"""One command for controlling a DarkFactory deployment.

The pipeline is a dozen scripts, each solving one problem well and each needing a different
invocation, a different set of environment variables, and knowledge of which repository it applies
to. Operating a deployment therefore meant remembering not what you wanted to do but where the code
that does it lives.

This is a front door, not a new layer: every subcommand delegates to the module that already
implements it, so there is one implementation of each behaviour and the CLI cannot drift from what
the pipeline actually does.

The subcommands are named for the question being asked - what is this repository made of, is it
authenticated, is it installed - because that is what an operator knows at the point of asking.
"""

import argparse
import json
import os
import subprocess
import sys
from typing import List, Optional


def _repos(args: argparse.Namespace) -> List[str]:
    """Resolves which repositories a command applies to.

    Args:
        args: Parsed arguments.

    Returns:
        Repository slugs, defaulting to the one declared by the manifest here.
    """
    if args.repo:
        return args.repo
    try:
        import manifest

        loaded = manifest.load(".")
    except Exception:  # noqa: BLE001 - a missing manifest is a usage error, not a crash
        return []

    # A manifest that cannot be read still yields an object, with the repository name guessed from
    # the working directory. Acting on that would write credentials at whatever the current folder
    # happens to be called, so both halves must be real before it is used.
    if not loaded.owner or not loaded.repo:
        return []
    return [f"{loaded.owner}/{loaded.repo}"]


def cmd_describe(args: argparse.Namespace) -> int:
    """Reports what the repository in the working directory is made of.

    Args:
        args: Parsed arguments.

    Returns:
        Process exit status.
    """
    import environment

    env = environment.configure(args.path)
    data = env.as_dict()
    if args.json:
        print(json.dumps(data, indent=2))
        return 0

    print(f"domains      {', '.join(data['domains']) or '(none)'}")
    print(f"ecosystems   {', '.join(data['ecosystems']) or '(none)'}")
    print(f"multi-domain {data['is_multi_domain']}")
    for package in data["packages"]:
        version = f" {package['version']}" if package.get("version") else ""
        print(f"  {package['path']:20s} {package['ecosystem']}{version}")
    for label, plan in (("test", env.test_plan()), ("release", env.build_plan())):
        for ecosystem, entry in plan.items():
            if entry.get("command"):
                print(f"{label:8s} {ecosystem:8s} {entry['command']}")
    return 0


def cmd_auth(args: argparse.Namespace) -> int:
    """Sets harness credentials from this machine onto repositories.

    Args:
        args: Parsed arguments.

    Returns:
        Process exit status.
    """
    import credentials

    repos = _repos(args)
    if not repos:
        print("No repository given and no manifest here; pass --repo owner/name.", file=sys.stderr)
        return 2
    credentials.collect(repos, args.only)
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    """Reports whether repositories are configured well enough to run.

    Answers the question an operator actually has - why is nothing happening - by checking the
    things that are silently absent rather than loudly broken.

    Args:
        args: Parsed arguments.

    Returns:
        Process exit status; non-zero when something needed is missing.
    """
    repos = _repos(args)
    if not repos:
        print("No repository given and no manifest here; pass --repo owner/name.", file=sys.stderr)
        return 2

    incomplete = False
    for repo in repos:
        print(f"\n{repo}")
        secrets = _gh_json(["api", f"repos/{repo}/actions/secrets"], {}).get("secrets", [])
        names = {s["name"] for s in secrets}
        variables = _gh_json(["api", f"repos/{repo}/actions/variables"], {}).get("variables", [])
        values = {v["name"]: v["value"] for v in variables}

        harness = names & {
            "CLAUDE_CODE_OAUTH_TOKEN",
            "ANTHROPIC_API_KEY",
            "ANTIGRAVITY_REFRESH_TOKEN",
        }
        checks = [
            ("agent credential", bool(harness), "run `darkfactory auth`"),
            ("board token", "GH_PROJECT_TOKEN" in names, "a token with `project` scope"),
            (
                "agent enabled",
                values.get("AGENT_ENABLED") == "true",
                "gh variable set AGENT_ENABLED --body true",
            ),
            (
                "pipeline installed",
                _has_path(repo, ".github/darkfactory.json"),
                "run the install workflow",
            ),
        ]
        for label, ok, advice in checks:
            print(f"  {'yes' if ok else 'NO ':3s}  {label:20s} {'' if ok else advice}")
            incomplete = incomplete or not ok
    return 1 if incomplete else 0


def _gh_json(args: List[str], default: object) -> object:
    """Runs a ``gh`` command expected to return JSON.

    Args:
        args: Arguments following the ``gh`` executable.
        default: Returned when the command fails.

    Returns:
        Parsed JSON, or `default`.
    """
    try:
        out = subprocess.run(["gh", *args], capture_output=True, text=True, check=True).stdout
        return json.loads(out or "null") or default
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return default


def _has_path(repo: str, path: str) -> bool:
    """Reports whether a repository contains a path.

    Args:
        repo: `owner/name`.
        path: Repository-relative path.

    Returns:
        True when it exists.
    """
    try:
        subprocess.run(
            ["gh", "api", f"repos/{repo}/contents/{path}"],
            capture_output=True,
            check=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def cmd_license(args: argparse.Namespace) -> int:
    """Applies the licence the manifest declares.

    Args:
        args: Parsed arguments.

    Returns:
        Process exit status.
    """
    import licensing

    return 0 if licensing.apply(args.path) is not None or True else 1


def cmd_submodules(args: argparse.Namespace) -> int:
    """Pins and updates submodules.

    Args:
        args: Parsed arguments.

    Returns:
        Process exit status.
    """
    import submodules

    submodules.pin_branches(args.path)
    print(submodules.describe(submodules.update(args.path)))
    return 0


def build_parser() -> argparse.ArgumentParser:
    """Builds the argument parser.

    Returns:
        The parser.
    """
    parser = argparse.ArgumentParser(
        prog="darkfactory", description="Control a DarkFactory deployment."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    describe = sub.add_parser("describe", help="what this repository is made of")
    describe.add_argument("--path", default=".", help="repository root")
    describe.add_argument("--json", action="store_true", help="emit the whole environment as JSON")
    describe.set_defaults(func=cmd_describe)

    auth = sub.add_parser("auth", help="set harness credentials from this machine")
    auth.add_argument("--repo", action="append", help="owner/name; repeatable")
    auth.add_argument("--only", nargs="*", help="limit to these secret names")
    auth.set_defaults(func=cmd_auth)

    status = sub.add_parser("status", help="why is nothing happening")
    status.add_argument("--repo", action="append", help="owner/name; repeatable")
    status.set_defaults(func=cmd_status)

    lic = sub.add_parser("license", help="apply the licence the manifest declares")
    lic.add_argument("--path", default=".", help="repository root")
    lic.set_defaults(func=cmd_license)

    subs = sub.add_parser("submodules", help="pin and update submodules")
    subs.add_argument("--path", default=".", help="repository root")
    subs.set_defaults(func=cmd_submodules)

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    """Entry point.

    Args:
        argv: Arguments, defaulting to the command line.

    Returns:
        Process exit status.
    """
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
