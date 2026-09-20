# ADR-0004 — The repository environment is detected; declaration is the exception

**Status**: Superseded by ADR-0021 · 2026-09-20

## Context

The pipeline runs in repositories with nothing in common: a Python package, a Rust and TypeScript
desktop application, a template with no build at all. Each workflow had begun re-deriving this for
itself with `hashFiles`, so the answer to "is there Rust here" existed in several places and could
disagree with itself.

## Decision

`.github/scripts/environment.py` answers it once. It walks the repository, identifies every package
manifest, resolves workspace members for npm, Bun, pnpm, Yarn and Cargo, and derives the test,
format and documentation command for each ecosystem from the package manager actually in use. The
manifest's `environment` block overrides or extends any of it.

Detection is the default because it cannot drift: a repository that grows a `Cargo.toml` starts
building Rust with no configuration change. Declaration covers what detection cannot see.

## Alternatives rejected

- **Declare everything.** Accurate the day it is written. The failure mode is silent: a new package
  is simply never built or tested, and nothing reports it.
- **Keep `hashFiles` in each workflow.** Only answers "does this file exist", so it cannot express
  workspace members, monorepo layout, or which package manager is in use.
- **A build-tool abstraction such as Nix or Bazel.** Solves this and much more, at the cost of
  requiring every consumer repository to adopt it.

## Consequences

- Detection heuristics are a maintenance surface; a new ecosystem is a data change to `MANIFESTS`.
- Lockfiles are scoped per ecosystem. A flat lookup reported a Cargo workspace's package manager as
  Bun purely because `bun.lock` sat beside it in a polyglot root.