# Architecture Decision Records

ADRs are numbered, append-only decision history. Current product requirements live in `PRD.md`; current feature-specific behavior lives in Request bodies. ADRs record why durable architecture choices were made and which older choices were superseded.

**Status values:** `Proposed` · `Accepted` · `Superseded by ADR-NNNN`.

A superseded ADR is historical evidence only. Its old paths, package owners, workflow names or implementation details are not current contracts.

The deprecated `architecture_decisions.md` ledger was split into individual records on 2026-09-13 and removed. Recovered F45 records 0006–0016 were restored on 2026-09-20 so the decision sequence is complete.

The current sequence reaches **ADR-0023**; the next new decision is **ADR-0024**.

Current architecture-defining records include:

- ADR-0006 — pipeline execution goes through df;
- ADR-0008 — provider behavior is configuration-driven;
- ADR-0009 — providers support named multi-account credential slots;
- ADR-0011 — quota state is the availability authority;
- ADR-0012 — limit-aware routing uses capability tiers;
- ADR-0013 — df executes the workflow graph;
- ADR-0015 — deterministic steps belong to the engine;
- ADR-0016 — model resolution is live;
- ADR-0017 — root workspace packages and first-class capabilities;
- ADR-0019 — GitHub-backed web control plane and user authentication;
- ADR-0020 — machine keychain and browser auth are separate trust boundaries;
- ADR-0021 — final `.df` declarations and capability-driven detection;
- ADR-0022 — complete the final system directly, with no migration/pre-release phase;
- ADR-0023 — first-party docs use `docs.df` and the shared web renderer.

Superseded records remain in this directory solely to preserve decision provenance.
