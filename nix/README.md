# DarkFactory Nix agent image

The production agent container is a reproducible Nix image from `flake.nix`.
The resolved Bun dependencies come from the root `bun.lock`, and there is
one TypeScript CLI implementation at `packages/cli/src/cli.ts`.

## Build and execute

```sh
nix flake check -L
nix build .#agentImage -L
docker load -i result
docker run --rm darkfactory-agent:nix --help
docker run --rm darkfactory-agent:nix --version
docker run --rm darkfactory-agent:nix providers
```

The producer's protected `quality` check runs the native x86-64 and ARM64 image-build
matrix on every pull request, regardless of changed paths, through the single
`.github/scripts/verify-nix-agent.sh` verification script. Consumer repositories
skip this producer-only matrix. The production agent workflow loads the same Nix
output and invokes `dispatch` on the image. The verification exercises the real
`df run` model execution path with the built-in `DF_FAUX` provider; only external
GitHub network calls are mocked.
The image uses UID/GID 1001, a writable bind-mounted `/workspace`, an isolated
D-Bus session, and the Nix-managed Git, GitHub CLI and keychain dependencies.

Update the committed `flake.lock` only through a reviewed toolchain change.
Never resolve Bun dependencies at container startup. Only a successful image
build plus executable `df dispatch` verification counts as validation.
