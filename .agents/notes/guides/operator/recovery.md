# Recovery and incident handling

The production contract requires serializable execution by durable run identity, an external-effect journal and crash-consistent state commits. See [runtime architecture](../architecture/system.md) and #2698 for the current acceptance status.

## Safe operator procedure

1. Record repository, Request, run identity, graph node and latest observed checkpoint.
2. Classify the failure: cancelled, provider quota, authentication, timeout, transport ambiguity, failed verification, stale base or conflict.
3. Do **not** re-trigger a write just because a response timed out. Inspect GitHub for the effect identity and expected state; reconcile before retrying.
4. Reconfirm Planning/approval freshness and remote branch SHA.
5. Use documented current CLI surfaces (for example `df resume` is documented in source as quota-run resume; do **not** assume it resumes every graph failure).
6. Capture post-recovery execution logs and external readback. Escalate irreconcilable effect ambiguity for explicit human resolution.

## Invariants

Same run must not execute its node concurrently. Same external effect must not be applied twice. Neither process restart nor quota failover permits repeating a completed external mutation. A callback/webhook is an event trigger, never an authoritative snapshot.

**Important:** This page documents safety policy; the full fault-injection acceptance is pending #2698 and #2706. Do not assert recovered success without executable evidence.

## Decision table

| Observation | Do first | Retry permitted only when |
| --- | --- | --- |
| HTTP timeout after PR/branch write | Query remote branch/PR by stable effect identity and expected SHA | External readback proves no successful effect or journals reconcile it |
| Process crash/restart | Inspect persisted run identity and last committed node/effect | Single active owner reacquires run with lease and idempotency evidence |
| Quota exhausted | Inspect model/provider/account reset and reservation ledger | Original blocked run becomes eligible; completed effects are not replayed |
| Expired/revoked token | Stop authenticated calls, correct identity/secret on trusted boundary | Fresh user/App permission readback succeeds |
| Required check missing/stale | Compare check run SHA and required action list | All required actions execute on exact current head |
| Stale Planning/merge approval | Inspect actual revision and head SHA | Fresh review and authorized approval are recorded |
| Conflicting remote push | Read actual remote head before planning a lease-safe write | New expected-old SHA and reviewed scope are agreed |
| Uncertain duplicate event | Compare event ID, run ID and external effect journal | Deduplication and readback prove a safe next transition |

## Limited CLI resumption

The source CLI help declares `df resume [--repo owner/name]` for **quota-blocked runs whose models have reset**. It is not a general force-retry, cancellation undo or magic crash recovery command. After authentication and repository eligibility are verified, use that command only for its named case and inspect the resulting run identity, quota state and remote effects. Any other stalled graph requires the runtime's documented recovery mechanism and durable checkpoint inspection; general operational acceptance is pending #2698 and #2706.

## Incident receipt

Record timestamp in UTC, repo stable ID, Request, run ID, effect ID, expected and observed remote SHA, identity class (user/App/provider), error category, check/approval revision, actions taken and final external readback. Keep tokens, raw provider payloads and private secrets out of the incident. Escalate uncertain duplicate writes rather than guessing “safe retry”.
