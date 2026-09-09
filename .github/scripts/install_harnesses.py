"""Installs the declared harnesses into the agent image, and says which ones failed.

Every install line in the Dockerfile ended `|| true`, so a harness whose installer broke produced
a green build and an image quietly missing it. That is not hypothetical: the image currently ships
four of seven, because `@moonshot-ai/kimi-cli` 404s on npm and two install scripts return 404 - and
nothing said so. At dispatch the runner skips the missing harness, which reads as "not configured"
rather than "never installed".

Two things follow. The harness list is data rather than a sequence of RUN lines, so adding one is a
single declaration beside the rest of what that harness needs. And the result is checked against
the declaration: an installer that fails is reported by name, and the build fails when a harness the
deployment depends on is absent.

`REQUIRED` is deliberately short. Failing the build for every optional harness would make the image
unbuildable whenever any vendor's installer had a bad day, which is how `|| true` came to be there
in the first place.
"""

import os
import shutil
import subprocess
import sys
from typing import Dict, List, Tuple

import harnesses

#: Harnesses whose absence fails the build.
#:
#: The ladder needs at least one that works. Claude is required because it is the harness the
#: deployment falls back to when a metered provider is exhausted, so an image without it can be
#: stopped by one vendor's quota.
REQUIRED: List[str] = ["claude"]


def install_one(name: str) -> Tuple[bool, str]:
    """Runs one harness's declared installer.

    Args:
        name: Harness name.

    Returns:
        Whether the binary is present afterwards, and any error output.
    """
    harness = harnesses.get_harness(name)
    if harness is None or not harness.install:
        return False, "no installer declared"

    result = subprocess.run(
        ["bash", "-o", "pipefail", "-c", harness.install],
        capture_output=True,
        text=True,
    )
    if shutil.which(harness.binary):
        return True, ""
    detail = (result.stderr or result.stdout or "").strip().split("\n")[-1][:160]
    return False, detail or f"exit {result.returncode}"


def install_all(names: List[str] = None) -> Dict[str, str]:
    """Installs every declared harness and reports the failures.

    Args:
        names: Harnesses to install, defaulting to every one in the registry order.

    Returns:
        Mapping of harness name to the reason it failed; empty when all succeeded.
    """
    failures: Dict[str, str] = {}
    for name in names or harnesses.ORDER:
        ok, detail = install_one(name)
        if ok:
            print(f"  installed  {name}")
        else:
            failures[name] = detail
            print(f"  FAILED     {name}: {detail}", file=sys.stderr)
    return failures


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Entry point: installs the harnesses and fails when a required one is missing."""
    failures = install_all()
    present = [n for n in harnesses.ORDER if n not in failures]
    print(f"\n{len(present)} of {len(harnesses.ORDER)} harnesses installed: {', '.join(present)}")

    missing_required = [n for n in REQUIRED if n in failures]
    if missing_required:
        print(
            f"\nRequired harness(es) missing: {', '.join(missing_required)}. "
            "The image would ship unable to run the fallback the ladder depends on.",
            file=sys.stderr,
        )
        raise SystemExit(1)
    if failures:
        print(
            f"\n{len(failures)} optional harness(es) unavailable: {', '.join(failures)}. "
            "The image is usable; the ladder is shorter than declared.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
