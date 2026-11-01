# DarkFactory → DSH-native convergence, before any fork

**Work branch:** `migration/dsh-stack-consolidation` (based on DarkFactory `integration/v1-2026-11-01` at `7f27835d60e904aed5f2d5e46553c7754afaefbc`).

**Pinned source observations:**
- DarkFactory: `7f27835d60e904aed5f2d5e46553c7754afaefbc`.
- dsh-stack: `8752dad1514cd10966db6859c449f0cba941b57f`.
- Upstream DSH reference: `ce7073d51254c26cd63b22a60835b8f948deb447`.

## Required order of work

1. **Converge in the existing DarkFactory repository.** Make DarkFactory behavior load as native DSH/Cordis plugins, without forking DSH, changing the canonical deployment, or replacing working behavior prematurely.
2. **Consolidate selectively from dsh-stack.** For each capability compare both implementations, preserve unique behavior, choose one owner, and migrate tests and user data before retiring either implementation.
3. **Verify the entire DSH-native DarkFactory composition.** Prove native Host installation, agent execution, workflow durability, plugin teardown, API/CLI/MCP, identity, browser isolation, and standalone installation.
4. **Only then consider the DSH fork.** The fork is an independent architecture change after consolidation, with a separate review, migration, and acceptance gate.
5. **Delete dsh-stack last**, only after an exact inventory shows no unique code, data, packages, releases, dependencies, or consumers remain. First archive/protect the repository and make the preservation/retirement decision explicit. Do not delete it as part of this migration branch.

## Architecture during this phase

DSH's Cordis runtime, agent/session runtime and Host–Client RPC remain upstream dependencies. DarkFactory's graph executor and durable effect journaling remain authoritative for governed code workflows. Native Cordis plugin entrypoints expose DarkFactory services; they must not create a second registry, scheduler, or agent runtime. CLI, MCP and UI are adapters over owning plugin services.

**No directory-wide renaming or DSH fork is permitted in this phase.** The final `packages/core`, `packages/plugins`, and `packages/templates` decomposition is deferred until behavior and authority are reconciled.

## First implementation slice in this branch

- `packages/harness/src/dsh/workflow.ts` exports a native Cordis-compatible `apply(ctx)` service plugin providing the **existing** `runGraph` engine as `ctx.dfWorkflow`; it creates no new executor or automatic mutation path.
- `packages/harness/src/dsh/personas/controller.ts` and `types.ts` stage the precise dsh-stack live-persona selection/recovery logic with provenance and preserved state semantics.
- `.github/tests/harness/dsh-native-migration.test.ts` verifies the canonical graph-service delegation and unit-level persona behavior.

**Integration status:** This is an initial native plugin entrypoint and migrated pure code, not a claimed DSH-host acceptance pass. The plugin has not been installed into a real DSH profile and the persona prompt/session hooks have not yet been wired. Do not mark DarkFactory "DSH-native" or dsh-stack "migrated" based only on these files.

## Ownership ledger — mandatory before continuing

| Capability | Source authority now | Target native owner | Next required proof |
| --- | --- | --- | --- |
| Plugin composition and native lifecycle | DSH/Cordis | DSH Host | Real loader mount/unmount against pinned version |
| Agent loop and session events | DSH | DSH Harness | Agent create/resume and cancellation |
| Personas: runtime selection and session log | dsh-stack agents | DSH-compatible Harness persona plugin | Native session projections, pre-step hook and restart recovery |
| Personas: simple roster registry | dsh-stack personas | **Merge, not duplicate** | Verify whether roster adds unique behavior beyond agents catalog |
| Model provider routing and quotas | DarkFactory + dsh-stack + DSH | Single native Gateway family | Model/account/quota decision and live provider call |
| Credential references and encrypted storage | DSH + DarkFactory + dsh-stack | Single native Keychain | Identity-scoped lossless migration |
| Governed workflow graph and durable journal | DarkFactory | Native workflow plugin backed by existing graph | Production graph run in DSH process with interruption/recovery |
| DSH model-authored workflow scripts | DSH | Harness scripted activity | Keep separate from durable Code graph |
| Git/GitHub effects | DarkFactory + dsh-stack | Single repository/GitHub services | Exact effect readback, no duplicate remote mutation |
| Workspace/terminal/browser | DSH + dsh-stack + RSCode | Native workspace/browser plugins | Live session, filesystem and process isolation |
| DSH web/UI extensions | DSH + dsh-stack | Native browser contributions | Boot and reload in one client composition |
| CLI/MCP/API projections | DarkFactory + DSH | Native service adapters | Same authorized operation from each surface |

## Acceptance gates and rollback

- **G0 — Baseline:** Record complete package, test, state, config, user-data and downstream-consumer inventories for all repositories.
- **G1 — Native mount:** Use DSH's real Cordis loader to activate one DarkFactory service, inject it in another plugin, and dispose it without leaks.
- **G2 — Execution:** Replace the Pi runtime for one `agent` graph-node path with DSH native agent APIs, preserving node result, timeout, cancellation, scope and credentials. Keep the Pi implementation as the proven fallback until equivalent tests pass.
- **G3 — Stack consolidation:** Merge selected Stack capabilities with host lifecycle, session-log fidelity, tests and state migration; reject duplicate registries.
- **G4 — Full behavior:** DSH-native production workflow, regression suite, security boundaries, source-free distribution and end-to-end UI.
- **G5 — Repository retirement:** Only when all manifest, package, data and consumer references to dsh-stack are eliminated and owner-approved.

Each migration must maintain a demonstrable rollback route to the original DarkFactory implementation. No production branches, tags, releases, profile stores or credentials are changed during G0/G1.
