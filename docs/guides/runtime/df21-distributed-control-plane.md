# DF-21 distributed control plane — integration and unsatisfied guarantees

**Status: partial implementation; not a production-distribution acceptance.** This document describes the actual source on the DF-21 branch, not a simulated GitHub lock.

## Coordination and atomicity

`PostgresGraphLease` uses PostgreSQL's unique-key `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE expires_at <= clock_timestamp() RETURNING generation` as the linearization point for acquisition and expiry handover. Its owner UUID and monotonically increasing generation are stored in `darkfactory_graph_leases`. Renewal, ownership assertions and release match **both** identity and generation and use the database clock. The table must be migrated once using `packages/harness/sql/graph-leases.sql`; never delete expired rows and reset generations.

GitHub's REST update-ref contract offers fast-forward enforcement (`force: false`), **not a documented expected-old-SHA compare-and-swap**. Read-then-update, annotations, issues, repository variables, workflow concurrency and comments do not establish a safely expiring distributed lock. No GitHub-native lease is supplied.

A PostgreSQL owner check immediately before an HTTP call is **cooperative fencing**, not atomic fencing of the remote effect. GitHub does not accept the lease generation on PR/comment/issue mutations. An in-flight stale-owner HTTP request may still reach GitHub after lease expiry. A queued merge may complete after its initiating runner has lost ownership. The independent central effect dispatcher, mutation-level transaction serialization and crash/ambiguity reconciliation required to close this gap are **not implemented** by this branch. The production platform must not advertise exactly-once arbitrary GitHub effects.

## Existing runtime composition for DF-13

```typescript
import { PostgresGraphLease } from "./packages/harness/src/graph/postgres-lease.ts";
import { createProductionRuntimeFactory } from "./packages/harness/src/graph/runtime-composition.ts";

const distributedLease = new PostgresGraphLease({
  connectionString: process.env.DF_POSTGRES_URL!,
  namespace: "owner/repository:environment",
  runKey: (runDir) => canonicalRequestKeyForRun(runDir),
  ttlMs: 30000,
  renewMs: 5000,
  acquireTimeoutMs: 30000,
});

const runtime = createProductionRuntimeFactory({
  repoDir,
  repository: gitHubAppRepository,
  model,
  loadPlanningContext,
  automation: observedBoardAndQuotaAdapters,
  workRoot,
  distributedLease,
  localOnly: false,
});
// dispatch(argv, { runtime, deliveryId }) uses the existing executor.
```

The example deliberately leaves `canonicalRequestKeyForRun`, the GitHub App installation client, and the model/board adapters to DF-13. Their implementations must be based on the actual user's configured repository and authorization. Never derive the key from an absolute host-local path. The mapping must be stable across machines and must be scoped to the exact repository and Request.

**Durable state prerequisite:** `runDir` and its `state.df`, `events.df`, `checkpoints/` and `effects/` must be the *same crash-safe, consistently visible storage* for every runner. Separate machine-local run directories do not become shared merely because PostgreSQL grants a lease. The current factory still constructs a local file journal; a validated shared durable substrate is a deployment dependency, not something this adapter provides.

**GitHub merge:** `createProductionRuntimeFactory` uses `createGovernedGitHubMergeBoundary(repository)` unless an explicit test override is given. The graph must pass the reviewed PR number, exact head SHA, trusted default branch, and the exact human actor from merge authorization. The adapter rechecks independent native approval, required checks, protection and downstack, initiates an SHA-conditional asynchronous request, and uses `confirmMerged` for readback and protected-base ancestry. Pending/enqueued results are not completion; timed-out/ambiguous requests are not replayed blindly.

**GitHub App permissions:** repository Metadata:read; Pull requests:read (and write where PR creation/updates are enabled); Contents:write for merge and scoped source push; Checks:read and Commit statuses:read for required checks; Issues:write for comments and authorized issue closure. Repository ruleset visibility and independent current-head human approval are mandatory. GitHub Projects v2 writes use the separately authorized board token. A token must belong to the configured installation; an arbitrary consumer or production repository must never be a test target.

**PostgreSQL permissions:** apply schema once as a migration with DDL authority; the runtime role requires `SELECT`, `INSERT`, and `UPDATE` only on `darkfactory_graph_leases`. Deploy PostgreSQL with durable storage, stable trusted time, TLS, backups and appropriate connection limits. A test DB or SQLite substitute cannot establish this property.

## Recovery and failures

`runGraph` remains the one executor. The `DistributedGraphLease` contract is unchanged. The injected claim's `assertOwned()` is checked at transitions and within journaled mutation observers and executors, including externally visible gate/comment actions. `FencedGraphLeaseError` must abort the graph rather than selecting a normal failure-repair edge.

`IndeterminateEffectError` identifies an uncertain remote mutation; `StaleEffectError` indicates external evidence no longer matches the durable journal. These are **operator-visible blocked states**, not success. Do not retry a pending effect with a different ID. After a crash, use the same Request key, same durable run directory, same ingress delivery identity and the existing recovery path. A replacement must reconcile pending effects by authoritative GitHub readback before progressing. Some ambiguities cannot be resolved automatically and require operator investigation.

The current adapter provides no general-purpose remote PR body/update effect and no atomic issuance of GitHub comments or new PRs across lease transitions. The `github.pr.ensure`, comment and closure observers protect replay of *already recorded pending intent* but do not establish transactional exactly-once remote mutation.

## Verification and outstanding acceptance

An isolated GitHub Actions workflow, `.github/workflows/df21-verification.yml`, provisions actual PostgreSQL and exercises independent Bun worker processes. It also runs typecheck, Biome, focused GitHub/graph tests and the entire suite. A workflow run must be inspected against the *final commit SHA*; an earlier green run is insufficient.

Outstanding before ACCEPT:

1. Verify exact-head complete workflow, independent-process expiry/crash takeover, stale-owner denial and the entire existing graph/journal acceptance.
2. Implement an externally serialized/fenced effect dispatcher or establish and enforce GitHub-native atomic/idempotent semantics **for every** mutating effect; cooperative preflight assertions alone do not suffice.
3. Give all runners one verified shared durable journal and subject-key mapping; demonstrate crash recovery after an ambiguous remote mutation without duplicate effects.
4. Exercise the exact production GitHub App permission matrix and merge queue/conditional merge against a disposable, explicitly authorized test repository.
5. Validate real GitHub 403/404/409/422/429/5xx, token expiry, approval loss, stale head and delayed queue outcomes through readback.
6. Independently accept DF-13 composition and DF-14 live Request-to-merge trace. No protected main merge, public release or production mutation is authorized by this document.

**Recommendation: REPAIR, not ACCEPT**, until the remaining effect-level fencing and integration requirements are completed.
