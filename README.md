<!-- Generated from docs/home.md by @darkfactory/docs. Do not edit README.md directly. -->

# DarkFactory

**Autonomous, governed software delivery built around a self-hosting `df` engine, versioned capabilities and GitHub as the durable control plane.**

> **Status:** the final DarkFactory architecture is settled and implementation is being completed directly against it. `PRD.md` defines the product; `PLAN.md` defines the shortest safe path to final release and fleet acceptance.

## Product model

A DarkFactory Request moves through one governed lifecycle:

```text
verbatim Request + context
        ↓
unified Planning
        ↓
independent Planning review/fix until clean
        ↓
owner Planning Approval
        ↓
implementation
        ↓
deterministic verification
        ↓
implementation review/fix
        ↓
scope amendment only if required
        ↓
final alignment + checks + review
        ↓
merge/reconciliation
```

The final production system does not rely on separate interpretation/plan approval gates or model claims about repository mutations.

## Architecture

The final DarkFactory architecture is a root Bun workspace:

| Package | Responsibility |
|---|---|
| `@darkfactory/protocol` | Browser/runtime-safe schemas, serialized state and shared contracts |
| `@darkfactory/core` | Execution kernel, graph/run state, routing/provider mechanisms and capability loading |
| `@darkfactory/capability` | Capability ABI, loader and generated adapter/build tooling |
| `@darkfactory/github` | Typed GitHub REST/GraphQL substrate |
| `@darkfactory/keychain` | Machine/harness credentials, OAuth, tokens, refresh, secure storage and GitHub App credentials |
| `@darkfactory/auth` | Human/browser GitHub App authentication and web sessions |
| `@darkfactory/docs` | Headless documentation compiler and content graph |
| `@darkfactory/cli` | `df` CLI, command composition and TUI |
| `@darkfactory/web` | Shared React web application for docs and operator UI |

Any remaining code under `harness/` is deletion-bound implementation source, not a public package or documented architecture boundary.

## Capabilities

Core contains mechanisms. Agentic/product behavior is implemented as versioned first-party capabilities under `capabilities/`.

The initial set includes:

```text
code        paper       math        docs
git         github      planning    review
ci          release     recovery    hooks
epics       stacks      ...
```

One canonical TypeScript capability definition can be built into native DarkFactory/Pi integration, an MCP server, and supported Claude/Codex/agent skill/plugin forms. Official capabilities ship with standard df while third-party capabilities use the same ABI/loader.

### Domains are not capabilities

DarkFactory keeps ecosystem/package/domain classification separate from behavior.

A single repository may contain, for example:

- a TypeScript implementation in the `code` domain;
- a Typst/LaTeX thesis in the `paper` domain;
- Lean/proof work in the `math` domain.

Capabilities such as docs, git, review and CI can apply across several domains.

## Configuration

Final configuration is split by concern:

- `repo.df` — repository/product declaration;
- `config.df` — runtime/user/provider configuration;
- `docs.df` — native documentation configuration.

For repo/config, the final #340 contract accepts either `.darkfactory/<name>.df` or root `<name>.df`; both-present is an error. `.df` is a filename extension, never a directory.

`docs.df` is the only DarkFactory documentation configuration contract.

## Credentials and GitHub authentication

Two packages deliberately separate trust boundaries.

### `@darkfactory/keychain`

Owns all machine/harness credential custody: provider keys/OAuth, refresh tokens, multi-account slots, imported CLI credentials, GitHub App private-key/JWT/installation tokens, local user credentials, redaction and secret scanning.

Capabilities declare credential requirements rather than reading raw environment variables or keychains themselves.

### `@darkfactory/auth`

Owns human authentication for DarkFactory Web through the existing DarkFactory GitHub App.

The Pages application uses user authorization; a minimal confidential broker handles token exchange/refresh only. GitHub remains the authorization authority and durable control plane. The broker is not a DarkFactory project/state/execution backend.

## Documentation

`@darkfactory/docs` is the first-party headless documentation compiler; `@darkfactory/web` is the sole renderer.

The final compiler combines:

- root Markdown/product docs;
- ADRs and rules;
- actual TypeScript/TSDoc API documentation;
- capability-contributed docs;
- repository/graph/workflow metadata;
- supported API extraction from other ecosystems.

TypeDoc may be used internally for TypeScript extraction.

The docs homepage and this README will be rendered from the same semantic content graph so they cannot drift independently.

## DarkFactory Web

Every consumer uses the same prebuilt `@darkfactory/web` release artifact. Consumer repositories compile their own content/data but do **not** rebuild the React application.

The application is hosted on GitHub Pages and reads live GitHub state directly through browser-safe GitHub/auth interfaces.

Target UI stack:

- React + TypeScript;
- shadcn/ui;
- lucide-animated;
- Motion;
- Dagre;
- Wouter;
- Dockview where useful.

The web application is intended to replace normal day-to-day use of the GitHub website for DarkFactory operations while keeping GitHub itself as the durable issue/PR/check/project/event/authorization layer.

## Self-hosting and completion strategy

The completion program builds the final system directly; there is no supported legacy-to-df migration phase.

The critical path is:

```text
bootstrap routing
      ↓
final package/capability foundations
      ↓
repo/config/state + runtime/lifecycle
      ↓
routing + natural-stop result capture
      ↓
production graph handlers + branch repair
      ↓
#359: final df production engine complete
      ↓
remaining features completed through df itself
```

Recovered September work is reconciled in parallel into its final package/capability homes rather than regenerated from scratch.

See [PLAN.md](PLAN.md) for the authoritative execution program and recovery map.

## Distribution

First-party packages and capabilities are intended to publish under the `darkfactory` GitHub organization.

Initial first-party releases use one lockstep DarkFactory SemVer plus a separately versioned capability ABI.

Final releases include the CLI/runtime, official capabilities and generated adapters, checksums/provenance, and the prebuilt web bundle.

## Fleet acceptance

The final released system is proved across six repositories:

1. DarkFactory
2. omnis
3. ChessWithQuests
4. OdbornaPrace-paper
5. template-OdbornaPrace
6. OdbornaPrace-mono

Final acceptance produces `audit.df`, proves source-free install/update and df-only lifecycle/resume, accounts for every recovery source, validates docs/web/auth/capabilities, and then re-runs the original #68 declarable-graph contract.

## Normative references

- [PRD.md](PRD.md) — product requirements and architecture
- [PLAN.md](PLAN.md) — optimized final-completion and recovery plan
- [AGENTS.md](AGENTS.md) — projection of canonical contribution/governance rules
- [ADRs](.agents/notes/adr/) — accepted architecture decisions

## License

GPL-3.0. See [LICENSE](LICENSE).
