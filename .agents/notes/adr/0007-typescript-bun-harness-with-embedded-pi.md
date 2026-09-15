# ADR-0007 — TypeScript/Bun harness with embedded pi

**Status**: Accepted · 2026-09-15

## Context

From the decision record of 2026-09-13 (prompts/_decisions.md, orchestrator workspace):

> "DarkFactory becomes a **TypeScript** codebase; runtime/toolchain **Bun** (bun test, `bun build --compile` cross-platform single binaries, npm publishing; published packages stay Node-compatible). The Python pipeline scripts will be ported, not extended — plan changes as the TS target design first, with only minimal stop-gap fixes to Python where production is broken today." — 2026-09-13

> "The harness **embeds pi** (github.com/earendil-works/pi, MIT: `@earendil-works/pi-ai` unified LLM API with subscription OAuth and cross-provider mid-session hand-off, `pi-agent-core`, `pi-tui`, `chord`, experimental `pi-server`/`pi-protocol`/`pi-client`). In-flight provider/model failover on quota is built on pi-ai hand-off." — 2026-09-13

## Decision
Adopt a TypeScript/Bun based harness that embeds the pi framework, moving away from legacy Python pipeline scripts.

## Alternatives rejected
- Continue extending the Python pipeline scripts as the primary harness.
- Use a different runtime (Node.js without Bun) for the harness.

## Consequences
- The Python pipeline scripts will be ported, not extended; future work focuses on the TypeScript target.
- The df TypeScript code lives in a `harness/` folder in the DarkFactory repo.
- The harness embeds pi, enabling in‑flight provider/model failover on quota.
