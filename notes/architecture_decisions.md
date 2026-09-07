# Architecture Decision Records

Numbered, append-only. An ADR is added when an open decision from `ARCHITECTURE.md` §7 is resolved,
or when any deviation from `ARCHITECTURE.md` is approved (rule 3 in `AGENTS.md`).

Each record states the decision, the alternatives that were rejected **and why**, and what the
decision forecloses. "We chose X because it is better" is not an ADR.

**Status values:** `Proposed` (awaiting the maintainer's approval) · `Accepted` · `Superseded by
ADR-NNNN`. An ADR only binds the implementation once it is `Accepted`.

| # | Title | Status | Resolves |
|---|---|---|---|
| [0001](#adr-0001--the-agent-pipeline-is-harness-agnostic) | The agent pipeline is harness-agnostic | Accepted | — |
| [0002](#adr-0002--repository-identity-is-data-not-code) | Repository identity is data, not code | Accepted | — |
| [0003](#adr-0003--the-repository-environment-is-detected-declaration-is-the-exception) | The repository environment is detected; declaration is the exception | Accepted | — |
| [0004](#adr-0004--the-versioning-scheme-is-a-per-repository-choice) | The versioning scheme is a per-repository choice | Accepted | — |

---

## ADR-0001 — The agent pipeline is harness-agnostic

- **Status**: Accepted
- **Date**: 2026-09-06

### Context

The delivery pipeline was hardcoded to Google Antigravity's `agy`, with fallback only *between
models within that one CLI*. During this repository's first real run, Antigravity exhausted both
fallback tiers mid-implementation and two approved plans stalled at `Blocked` with nothing else to
try — a single vendor's quota halted delivery entirely.

### Decision

Coding-agent CLIs are described declaratively in `.github/scripts/harnesses.py`: a binary, an argv
template, a model chain, and credential keys. Antigravity, Claude Code, Codex, Kimi, Grok, Cursor,
and opencode ship in the registry.

- Fallback escalates **across harnesses**, not only across models.
- Harnesses whose binary is absent from `PATH`, or whose credentials are unset, are **skipped, not
  failed**.
- `AGENT_HARNESS_CHAIN` and `AGENT_HARNESS_CONFIG` override order and every field at runtime.
- Prompts are passed as argv elements, never through a shell.

### Alternatives rejected

- **Stay single-vendor.** Demonstrated to halt delivery on one provider's quota. Not hypothetical —
  it happened during the run that motivated this ADR.
- **`if`/`elif` per CLI in the runner.** Every new CLI edits the core retry loop, and each upstream
  flag rename becomes a code change, a review, and a container rebuild.
- **A wrapper shell script per CLI in the image.** Moves invocation into shell — where prompt
  quoting becomes an injection risk — and puts it beyond the reach of unit tests.
- **An LLM API abstraction instead of CLIs.** These tools are agents, not completions endpoints:
  they carry their own tool loops, permissions, and repository awareness. Reimplementing that is the
  project, not a dependency.

### Consequences

- Invocation flags are a maintenance surface. Mitigated by making every field overridable from a
  repository variable, so upstream drift never requires a code change.
- The container is larger and its build tolerates per-CLI failure, printing a manifest of what
  actually landed rather than pretending.
- Harness behaviour differs — output verbosity, tool permissions, repository conventions. Prompts
  must not assume any one CLI's habits.

---

## ADR-0002 — Repository identity is data, not code

- **Status**: Accepted
- **Date**: 2026-09-07

### Context

This repository was seeded from omnis, and inherited its identity wholesale. The area labels
described a terminal cell-grid renderer and an embedded browser engine; the ADR file recorded
omnis's decisions about scene trees and PGlite; a docstring looked up "the Omnis project number";
the argument parser announced itself as omnis's. None of it was detectable by review, because each
string was individually plausible.

The pipeline is meant to be distributed to many repositories. Anything hardcoded is either wrong in
every repository but one, or becomes a merge conflict on every update.

### Decision

Everything repository-specific lives in `.github/darkfactory.json` and is read through
`.github/scripts/manifest.py`. The shared workflows and scripts are then byte-identical across
every consumer, so a pipeline update is a fast-forward rather than a merge.

The area taxonomy is the clearest case: labels, permitted commit scopes, and the agent's request
classifier all read the one declaration, so the three cannot drift apart.

### Alternatives rejected

- **Environment variables per repository.** Invisible to review, unversioned, and absent when a
  script is run locally.
- **A Python module of constants.** What exists today. It is code, so consumers must edit a shared
  file, which guarantees a conflict on the next update.
- **Template substitution at adoption time.** Produces a copy that has forked on day one; there is
  no path back to receiving upstream fixes.

### Consequences

- A manifest key added later must default, or it breaks repositories that have not adopted it. Every
  accessor in `manifest.py` therefore has a fallback, and a missing or malformed manifest still
  yields a working object rather than an import error.
- Identity leaks are now a test failure rather than a discovery: `tests/test_manifest.py` asserts
  that no other project's identifiers appear in the shared scripts.

---

## ADR-0003 — The repository environment is detected; declaration is the exception

- **Status**: Accepted
- **Date**: 2026-09-07

### Context

The pipeline runs in repositories with nothing in common: a Python package, a Rust and TypeScript
desktop application, a template with no build at all. Each workflow had begun re-deriving this for
itself with `hashFiles`, so the answer to "is there Rust here" existed in several places and could
disagree with itself.

### Decision

`.github/scripts/environment.py` answers it once. It walks the repository, identifies every package
manifest, resolves workspace members for npm, Bun, pnpm, Yarn and Cargo, and derives the test,
format and documentation command for each ecosystem from the package manager actually in use. The
manifest's `environment` block overrides or extends any of it.

Detection is the default because it cannot drift: a repository that grows a `Cargo.toml` starts
building Rust with no configuration change. Declaration covers what detection cannot see.

### Alternatives rejected

- **Declare everything.** Accurate the day it is written. The failure mode is silent: a new package
  is simply never built or tested, and nothing reports it.
- **Keep `hashFiles` in each workflow.** Only answers "does this file exist", so it cannot express
  workspace members, monorepo layout, or which package manager is in use.
- **A build-tool abstraction such as Nix or Bazel.** Solves this and much more, at the cost of
  requiring every consumer repository to adopt it.

### Consequences

- Detection heuristics are a maintenance surface; a new ecosystem is a data change to `MANIFESTS`.
- Lockfiles are scoped per ecosystem. A flat lookup reported a Cargo workspace's package manager as
  Bun purely because `bun.lock` sat beside it in a polyglot root.

---

## ADR-0004 — The versioning scheme is a per-repository choice

- **Status**: Accepted
- **Date**: 2026-09-07

### Context

Releases are automated on merge to `main`, but what a version number *means* is not a property of
the pipeline. A library makes compatibility promises; a continuously-delivered application does
not; some projects deliberately never leave `0.x`.

### Decision

`.github/scripts/versioning.py` implements five modes, selected in the manifest: `semver`,
`zerover` (the major never leaves zero), `pridever` (`PROUD.DEFAULT.SHAME`), `calver`
(`YYYY.MM.PATCH`), and `manual` (a `VERSION` file is the decision).

Automatic modes derive the bump from Conventional Commits, which rule 15 already mandates and CI
already enforces, so the metadata is present without new ceremony. An explicit request always
overrides the derivation — necessary for PrideVer, where PROUD is a human judgement no commit log
can express, and useful everywhere else.

### Alternatives rejected

- **SemVer for everything.** Imposes a compatibility promise on projects that do not make one.
- **A version file per repository, bumped by hand.** Retained as `manual` mode rather than made
  universal; as a default it drifts from the tags and forgets releases.
- **Deriving the mode from the ecosystem.** Cargo and npm both expect SemVer-shaped strings, but
  the shape is not the policy, and one repository can be both.

### Consequences

- Five modes is five behaviours to keep tested; the suite asserts that the same commit log produces
  genuinely different versions under each.
- ZeroVer and PrideVer produce version strings that SemVer-consuming registries will parse but
  misinterpret. That is inherent to those schemes, and is the repository's choice to make.
