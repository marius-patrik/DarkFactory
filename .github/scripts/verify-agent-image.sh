#!/usr/bin/env bash
# Production Nix-built image contract, shared with candidate and integration checks.
set -euo pipefail
image="${1:-darkfactory-agent:nix}"

docker image inspect "$image" >/dev/null
docker run --rm "$image" --help >/dev/null
docker run --rm "$image" --version | grep -q '^df '
docker run --rm "$image" providers >/dev/null
docker run --rm "$image" __packaging-smoke >/dev/null

docker run --rm --entrypoint /bin/sh "$image" -ec '
  set -eu
  test "$(id -u)" = 1001
  test "$(id -g)" = 1001
  test "$HOME" = /home/agent
  test "$PWD" = /workspace
  bin="$(command -v df)"
  test -x "$bin"
  test "$(od -An -tx1 -N4 "$bin" | tr -d " \\n")" = 7f454c46
  bundle="$(dirname "$bin")"
  test -d "$bundle/assets"
  test -d "$bundle/plugins"
  test -f "$bundle/photon_rs_bg.wasm"
  test ! -e /src
  test ! -e /opt/darkfactory/packages
  test ! -e /packages
  command -v gh >/dev/null
  command -v git >/dev/null
  command -v secret-tool >/dev/null
  command -v dbus-run-session >/dev/null
  command -v tmux >/dev/null
'

# Bun is an intentional Nix-managed auxiliary tool, so it may be in PATH.
# Source independence is proven by the compiled ELF and absence of source files.
