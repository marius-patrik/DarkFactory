# DarkFactory production agent image (Nix)

The production agent container is a reproducible Nix image from `flake.nix`.
The resolved Bun dependencies come from the root `bun.lock`, and there is
one TypeScript CLI implementation at `packages/cli/src/cli.ts`. The image runs
the **same compiled executable** and accompanying assets produced by
`packages/harness/scripts/build.ts` for native releases; no source-tree
interpreter or runtime `node_modules` installation is involved.

## Build and execute

```sh
nix flake check -L
nix build .#agentImage -L
docker load -i result
docker run --rm darkfactory-agent:nix --help
docker run --rm darkfactory-agent:nix --version
docker run --rm darkfactory-agent:nix providers
docker run --rm darkfactory-agent:nix __packaging-smoke
```

The producer's protected `quality` check runs the native x86-64 and ARM64 image-build
matrix on every pull request, regardless of changed paths, through the single
`.github/scripts/verify-nix-agent.sh` verification script. Consumer repositories
skip this producer-only matrix. The production agent workflow loads the same Nix
output and invokes `dispatch` on the image's packaged binary. The verification exercises the real
`df run` model execution path with the built-in `DF_FAUX` provider; only external
GitHub network calls are mocked.
The image uses UID/GID 1001, a writable bind-mounted `/workspace`, an isolated
D-Bus session, and the Nix-managed Git, GitHub CLI and keychain dependencies.

Update the committed `flake.lock` only through a reviewed toolchain change.
Never resolve Bun dependencies at container startup. Only a successful image
build plus executable `df dispatch` verification counts as validation.

## Canonical image authority and Dockerfile retirement

This Nix derivation is the **production image definition**. Root `flake.nix`
and `flake.lock` are required discovery and reproducibility entrypoints.
Docker remains the execution runtime; the standalone `docker/Dockerfile.agent`
was a second image recipe for candidate/integration validation, not the
production `agent.yml` image.

`.github/scripts/verify-agent-image.sh` validates source-free execution,
non-root identity, bundled assets and required CLI/keychain tools against the
Nix-built image. `.github/scripts/verify-nix-agent.sh` additionally exercises
the actual dispatch pipeline through an isolated fake provider and validates
a malformed event fails safely.

The Nix source filter admits only `.github/scripts/` beneath `.github/`,
allowing build scripts to migrate there without bundling workflows or test
fixtures. Nix source relocation requires both architecture builds and a real
agent dispatch acceptance test.
