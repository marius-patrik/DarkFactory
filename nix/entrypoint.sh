#!/bin/sh
# The agent entrypoint.
#
# This line is the reason the old image was `FROM python:3.12-slim-bookworm`. The
# old entrypoint was `dbus-run-session -- python3 /usr/local/bin/darkfactory-agent-runner`,
# and the interpreter was there to satisfy it -- nothing else in the image needed
# Python. So the interpreter goes when the entrypoint stops needing one, and the
# toolchain moves into this flake.
#
# What is NOT settled here: `docker run darkfactory-agent dispatch` is what
# .github/workflows/agent.yml does, and today that argument reaches
# .github/scripts/agent_runner.py, a 4969-line runner. `df` has no top-level
# `dispatch` subcommand -- harness/src/cli.ts's command switch has no such case --
# so passing it here makes `df` report an unknown command and exit non-zero. The
# nearest thing in `df` is `graph dispatch` (harness/src/graph/dispatch.ts), which
# is 181 lines and prints a JSON plan; it does not run the agent. This script
# therefore does not translate `dispatch` into `graph dispatch`: a shim that made
# the image look compatible while printing a plan and exiting 0 would turn a loud
# failure into a silent one, and the agent run would be skipped instead of
# reported. This image is sequenced after #1148 for exactly this reason, and
# docker/Dockerfile.agent is left in place until then.
#
# What belongs here is environment, not application logic. The keyring unlock,
# the credential staging and the event handling were all inside agent_runner.py
# and move with it; this image only has to make the tools they call resolvable,
# which it does by putting gnome-keyring, dbus and libsecret on PATH.
set -eu

: "${HOME:=/home/agent}"
export HOME

# secret-tool is a D-Bus client and needs a session bus to reach the Secret
# Service. The image's Entrypoint runs this script under dbus-run-session, which
# is where that comes from; the check is here so the script is also correct when
# invoked directly (a `docker run --entrypoint` override, or the same environment
# from nix develop).
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && command -v dbus-run-session > /dev/null 2>&1; then
    exec dbus-run-session -- "$0" "$@"
fi

exec "$DF_ENTRYPOINT" "$@"
