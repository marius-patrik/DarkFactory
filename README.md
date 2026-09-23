<!-- Generated from .agents/notes/** by @darkfactory/docs. Do not edit README.md directly. -->

# DarkFactory Repository Notes

This README is the generated index of current long-term repository notes under `.agents/notes/**`.
It is not the product specification or active implementation plan.

- Product documentation: [`docs/home.md`](docs/home.md)
- Product requirements and architecture: [`PRD.md`](PRD.md)
- Repository rules: [`AGENTS.md`](AGENTS.md)
- Current repository strategy: [`PLAN.md`](PLAN.md)

## Notes index

| Note | Title | Related rules | Canonical source |
|---|---|---|---|
| `ADR-0006` | The pipeline runs only df | `DF-RULE-014`, `DF-RULE-017` | [`.agents/notes/adr/0006-the-pipeline-runs-only-df.md`](.agents/notes/adr/0006-the-pipeline-runs-only-df.md) |
| `ADR-0008` | Providers are configuration-driven | `DF-RULE-014`, `DF-RULE-017` | [`.agents/notes/adr/0008-providers-are-config-driven.md`](.agents/notes/adr/0008-providers-are-config-driven.md) |
| `ADR-0009` | Accounts have named credential slots | `DF-RULE-014`, `DF-RULE-016` | [`.agents/notes/adr/0009-accounts-have-named-credential-slots.md`](.agents/notes/adr/0009-accounts-have-named-credential-slots.md) |
| `ADR-0011` | The quota engine is the availability authority | `DF-RULE-014`, `DF-RULE-018` | [`.agents/notes/adr/0011-quota-engine-is-the-only-availability-source.md`](.agents/notes/adr/0011-quota-engine-is-the-only-availability-source.md) |
| `ADR-0012` | Routing is limit-aware and capability-tiered | `DF-RULE-014` | [`.agents/notes/adr/0012-limit-aware-router-with-capability-tiers.md`](.agents/notes/adr/0012-limit-aware-router-with-capability-tiers.md) |
| `ADR-0013` | df runs the workflow graph | `DF-RULE-010`, `DF-RULE-011`, `DF-RULE-012`, `DF-RULE-013`, `DF-RULE-014`, `DF-RULE-018` | [`.agents/notes/adr/0013-df-runs-the-workflow-graph.md`](.agents/notes/adr/0013-df-runs-the-workflow-graph.md) |
| `ADR-0015` | The engine owns deterministic steps | `DF-RULE-007`, `DF-RULE-018` | [`.agents/notes/adr/0015-engine-owns-deterministic-steps.md`](.agents/notes/adr/0015-engine-owns-deterministic-steps.md) |
| `ADR-0016` | Model resolution is live | `DF-RULE-014` | [`.agents/notes/adr/0016-live-model-resolution.md`](.agents/notes/adr/0016-live-model-resolution.md) |
| `ADR-0017` | Modular packages and first-class capabilities | `DF-RULE-014`, `DF-RULE-017` | [`.agents/notes/adr/0017-modular-packages-and-capabilities.md`](.agents/notes/adr/0017-modular-packages-and-capabilities.md) |
| `ADR-0019` | GitHub backs the web control plane | `DF-RULE-009`, `DF-RULE-011`, `DF-RULE-016`, `DF-RULE-018` | [`.agents/notes/adr/0019-github-backed-web-auth-and-control-plane.md`](.agents/notes/adr/0019-github-backed-web-auth-and-control-plane.md) |
| `ADR-0020` | Browser auth and machine keychain are separate trust boundaries | `DF-RULE-016`, `DF-RULE-018` | [`.agents/notes/adr/0020-auth-keychain-separation.md`](.agents/notes/adr/0020-auth-keychain-separation.md) |
| `ADR-0021` | Repository declarations, runtime detection and capability-resolved actions | `DF-RULE-003`, `DF-RULE-006`, `DF-RULE-015` | [`.agents/notes/adr/0021-final-repository-declarations-and-capability-detection.md`](.agents/notes/adr/0021-final-repository-declarations-and-capability-detection.md) |
| `ADR-0022` | Complete the final system directly | `DF-RULE-003`, `DF-RULE-013`, `DF-RULE-017`, `DF-RULE-019` | [`.agents/notes/adr/0022-complete-the-final-system-directly.md`](.agents/notes/adr/0022-complete-the-final-system-directly.md) |
| `ADR-0023` | First-party docs use docs.df and one renderer | `DF-RULE-002` | [`.agents/notes/adr/0023-first-party-docs-and-one-renderer.md`](.agents/notes/adr/0023-first-party-docs-and-one-renderer.md) |
| `ADR-0024` | Effects are serializable and authoritative state is crash-consistent | `DF-RULE-018` | [`.agents/notes/adr/0024-serializable-effects-and-crash-consistent-state.md`](.agents/notes/adr/0024-serializable-effects-and-crash-consistent-state.md) |
| `ADR-0025` | Each delivery branch has one integration authority | `DF-RULE-005`, `DF-RULE-007`, `DF-RULE-019` | [`.agents/notes/adr/0025-single-integration-authority.md`](.agents/notes/adr/0025-single-integration-authority.md) |
| `ADR-0026` | Verification proves invariants and fails closed | `DF-RULE-001`, `DF-RULE-006`, `DF-RULE-008` | [`.agents/notes/adr/0026-invariant-based-verification.md`](.agents/notes/adr/0026-invariant-based-verification.md) |

History that is no longer current belongs in Git and GitHub, not in the live notes index.
