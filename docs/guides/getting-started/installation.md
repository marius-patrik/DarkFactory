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

## Clean developer verification

**Prerequisites:** Git, Bun compatible with the repository lockfile, source checkout and permissions to read the target repository. From the repository root the documented validation sequence is:

```sh
bun install --frozen-lockfile
bun packages/cli/src/cli.ts --help
bun packages/cli/src/cli.ts graph validate
bun run docs
bun run format:check
bun run lint
bun run typecheck
```

Expected documentation result: `bun run docs` invokes strict validation without publishing, and prints a page/navigation count when successful. `graph validate` reports graph version/node/edge count. A missing Bun executable, frozen lockfile mismatch, type error or missing declared document must produce a nonzero exit and block acceptance. These are the exact commands to **execute**, not a claim that they passed on this branch.

For a read-only preview, run `bun scripts/build-docs.ts --docs-only --out site-docs-preview` from the repo root and inspect its `index.html`. This output has no verified unified-site manifest and must not be uploaded to Pages. A missing Web manifest is intentionally fatal to a normal package build.

## Release installation and update acceptance

The source CLI declares `df install --check`, `df install --dry-run`, `df update --check`, and `df update --dry-run` with optional `--prefix DIR`, but the production installer binary is **not accepted**. Do not instruct a new operator to fetch an unverified binary as a substitute. #2709 must publish a specific OS/architecture-compatible digest and demonstrate actual clean install, repeat install, update, state preservation, `df --version`, rollback/repair and failed-check denial. If no signed-off release receipt exists, the correct result is “unavailable”, not a fallback to a development checkout.
