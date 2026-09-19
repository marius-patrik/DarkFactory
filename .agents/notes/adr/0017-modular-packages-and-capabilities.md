# ADR-0017 — Modular packages and first-class capabilities

**Status**: Accepted  
**Date**: 2026-09-19  
**Resolves**: Final TypeScript package boundaries and extensibility model

## Context

DarkFactory's TypeScript runtime has grown inside one private `@darkfactory/harness` package. At the same time, recovered work spans routing, result capture, docs, hooks, quality, git and other product areas. Landing that work into the monolith and moving it again would create unnecessary churn.

The repository already distinguishes ecosystems from semantic domains and supports multi-domain repositories. That abstraction is useful and should not be replaced.

## Decision

DarkFactory becomes a root Bun workspace with publishable first-party packages:

- `@darkfactory/protocol`
- `@darkfactory/core`
- `@darkfactory/capability`
- `@darkfactory/github`
- `@darkfactory/keychain`
- `@darkfactory/auth`
- `@darkfactory/docs`
- `@darkfactory/cli`
- `@darkfactory/web`

`@darkfactory/harness` may exist only as a migration shim and is not a final public package.

Core owns mechanisms: execution, graph/run persistence, provider/router machinery, config resolution and capability loading. Agentic/product behavior is implemented as versioned capability modules under root `capabilities/`.

Initial first-party capabilities include code, paper, math, docs, git, github, planning, review, ci, release, recovery, hooks, epics and stacks. Additional agentic behavior follows the same rule.

A canonical TypeScript capability definition is the only implementation source. Build tooling deterministically produces supported adapters/artifacts such as native DarkFactory, Pi ExtensionAPI, MCP server and supported Claude/Codex/agent skill/plugin forms.

Domains remain semantic classifications such as `code`, `paper` and `math`. Capabilities are orthogonal and can apply across domains. Multi-domain projects remain first-class.

Official packages/capabilities use lockstep DarkFactory SemVer initially, while the capability ABI has its own compatibility version.

## Rejected alternatives

### Keep one harness package

Rejected because it makes unrelated runtime, UI, docs, GitHub and secret-bearing code share one ownership boundary and forces recovered work through another later migration.

### Replace domains with capabilities

Rejected because domains answer “what kind of project/package is this?” while capabilities answer “what can DarkFactory do?”. They are different axes and multi-domain repositories need both.

### Hand-write one integration per agent harness

Rejected because behavior would drift across Pi, MCP, Claude and Codex forms. Adapters are generated from one capability source.

## Consequences

- Bulk recovery reconciliation should happen after package/capability boundaries exist.
- #341 evolves from central command tables toward detection + capability resolution.
- CLI/TUI/web/docs surfaces consume the same capability metadata.
- Third-party capabilities can extend project support without modifying core.
