# DarkFactory

**Autonomous, governed software delivery built around a self-hosting `df` engine, versioned capabilities and GitHub as the durable control plane.**

> **Status:** the final DarkFactory architecture is settled and is being completed through one active Request/Planning contract and one integration PR. `PRD.md` defines the product; `PLAN.md` records the high-level dependency spine; live implementation steps and proof stay in GitHub.

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
| `@darkfactory/core` | Execution kernel, graph/run state, routing/provider mechanisms and configuration resolution |
| `@darkfactory/capability` | Capability ABI, discovery/loader/resolution and generated adapter/build tooling |
| `@darkfactory/github` | Typed GitHub REST/GraphQL substrate |
| `@darkfactory/keychain` | Machine/runtime credentials, OAuth, tokens, refresh, secure storage and GitHub App credentials |
| `@darkfactory/auth` | Human/browser GitHub App authentication and web sessions |
| `@darkfactory/docs` | Headless documentation compiler and content graph |
| `@darkfactory/cli` | `df` CLI, command composition and TUI |
| `@darkfactory/web` | Shared web renderer and operator UI package |

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

For repo/config, either `.darkfactory/<name>.df` or root `<name>.df` is accepted; both-present is an error. `.df` is a filename extension, never a directory.

`docs.df` is the only DarkFactory documentation configuration contract.

## Credentials and GitHub authentication

Two packages deliberately separate trust boundaries.

### `@darkfactory/keychain`

Owns all machine/runtime credential custody: provider keys/OAuth, refresh tokens, multi-account slots, imported CLI credentials, GitHub App private-key/JWT/installation tokens, local user credentials, redaction and secret scanning.

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

`docs/home.md` is the product homepage. Root `README.md` is instead generated as an index of current long-term `.agents/notes/**`, while `AGENTS.md` projects canonical `.agents/rules/**`. The compiler validates each projection against its own canonical source.

## DarkFactory Web

`@darkfactory/web` owns first-party web rendering. The documentation renderer consumes the canonical `@darkfactory/docs` content graph and emits the static GitHub Pages artifact without a second documentation engine or theme runtime.

The broader GitHub-backed operator application shares the same package boundary and browser-safe protocol/GitHub/auth contracts. GitHub remains the durable issue/PR/check/project/event/authorization layer rather than a duplicated DarkFactory state database.

## Self-hosting and completion strategy

The completion program builds the final system directly rather than maintaining transitional production architectures.

The active integration follows one dependency spine:

```text
classified consolidated baseline
      ↓
executable capability ownership
      ↓
one graph + git/GitHub runtime
      ↓
relocate useful TypeScript
      ↓
direct df cutover; delete harness/Python
      ↓
finish operator/governance/web surfaces
      ↓
current-truth docs + source-free release candidate
      ↓
exact-head fleet proof + cleanup
```

[PLAN.md](../PLAN.md) records this high-level strategy. The current GitHub Request/Planning record is the executable checklist and validation ledger. Intermediate red checks confined to code already scheduled for deletion/relocation are classified against that work rather than polished into a transitional architecture; the exact final merge head must be fully green.

## Distribution

First-party packages and capabilities are intended to publish under the `darkfactory` GitHub organization.

Initial first-party releases use one lockstep DarkFactory SemVer plus a separately versioned capability ABI.

Final releases include the CLI/runtime, official capabilities and generated adapters, checksums, source/version metadata, and the prebuilt web bundle.

## Fleet acceptance

Before the final integration merge, an unpublished source-free candidate from the exact PR head is proved across six repositories:

1. DarkFactory
2. omnis
3. ChessWithQuests
4. OdbornaPrace-paper
5. template-OdbornaPrace
6. OdbornaPrace-mono

Pre-merge acceptance produces `audit.df`, proves source-free install/update and df-only lifecycle/resume, validates docs/web/auth/capabilities, and re-runs the declarable-graph product contract. After merge, final publication from canonical may change provenance metadata but must not introduce behavioral source changes.

## Normative references

- [PRD.md](../PRD.md) — product requirements and architecture
- [PLAN.md](../PLAN.md) — repository-wide completion strategy; concrete active steps/evidence live in the GitHub Request/Planning record
- [AGENTS.md](../AGENTS.md) — projection/index of canonical contribution/governance rules
- [README.md](../README.md) — generated index of current long-term repository notes
- [ADRs](../.agents/notes/adr/) — accepted architecture decisions

## License

GPL-3.0. See [LICENSE](../LICENSE).
