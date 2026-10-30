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
