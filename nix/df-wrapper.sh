#!/bin/sh
# The df CLI, as the image exposes it.
#
# There is no compile step: `df` is TypeScript run by Bun, and it resolves its
# assets relative to its own file (harness/src/graph/assets.ts joins
# dirname(import.meta.url) up to assets/), so it runs correctly from any working
# directory as long as its source tree is intact. That is why the image copies
# the tree and executes it in place rather than producing a bundle.
#
# $DF_BUN and $DF_ROOT are supplied by the wrapper in nix/agent-env.nix, which is
# what pins the interpreter: the Bun in the closure, not whatever `bun` is first
# on PATH. `df` is wrapped rather than symlinked so that the harness's own
# subprocesses still find a toolchain through the inherited PATH.
set -eu

exec "$DF_BUN" "$DF_ROOT/harness/src/cli.ts" "$@"
