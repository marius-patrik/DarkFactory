# Installation and verification

**Release status:** a production-complete v1.0.0 binary and installer are not yet accepted. Do not substitute a source checkout for a tested source-free install.

## Developer checkout

1. Obtain the repository from its canonical GitHub source.
2. Install an appropriate Bun runtime.
3. In the repository root run `bun install --frozen-lockfile`.
4. Execute `bun run typecheck`, `bun run lint`, and `bun run test`. Some tests depend on supported local tooling and credentials; a skipped required acceptance action is not a pass.
5. Read `bun packages/cli/src/cli.ts --help` or the [generated CLI reference](../../../packages/cli/src/cli.ts). Verify actual help in your build.

## Native release installation

The CLI source advertises `df install [--prefix DIR] [--check|--dry-run]` and `df update ...`, but publishing/installer equivalence must be proven on clean environments by #2709. Only use a manifest-verified, maintainer-promoted release. Verify the version with `df --version` and the release digest against published checksums; do not assume the root package.json version is the installed release.

## Prerequisites

GitHub repo permissions, a properly configured GitHub App and broker for browser user authorization, and explicit provider credentials are distinct prerequisites. Consult [GitHub setup](../administration/github.md) and [credentials](../configuration/credentials.md). Never paste secrets into a repository config or the static Pages site.

## Installation acceptance

Record the exact binary digest, installed version, OS/architecture, exit status and first real governed run. If any are unknown, classify the installation unverified rather than complete.
