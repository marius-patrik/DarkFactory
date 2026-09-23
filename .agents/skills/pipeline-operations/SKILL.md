---
name: pipeline-operations
description: Operate the governed DarkFactory Request/Planning/review/merge lifecycle through canonical GitHub and df command surfaces.
---

# DarkFactory pipeline operations

DarkFactory runs one governed lifecycle:

```text
Request/context
  -> reviewed Planning
  -> one owner Planning Approval
  -> implementation
  -> deterministic verification
  -> implementation review/fix loop
  -> optional scope-amendment approval
  -> final alignment
  -> required checks/review/merge
  -> deterministic reconciliation
```

There is no separate Interpretation approval and no mandatory child Plan issue.

## Approval commands

Use only the current command grammar exposed by the df command registry/generated help. Approval-like free text never advances a gate. Common governed actions include approval, revision/rejection feedback and resume after a durable quota/provider interruption; authorization is revalidated from current GitHub identity/association evidence.

Do not preserve undocumented legacy spellings or aliases merely because an older implementation accepted them.

## Resume and retries

Quota/provider interruption checkpoints the persisted run. Resume continues from durable state without repeating completed deterministic effects. Duplicate/out-of-order GitHub events are reconciled against current state rather than replayed blindly.

## Review and merge

Implementation review iterates findings -> fixes -> fresh review until clean. Material scope changes require the lighter scope-amendment approval. Final alignment is against the approved Planning artifact plus approved amendments.

Merge readiness requires the exact current head/base/stack, all required applicable quality actions, authorized final review/merge state, and mutation evidence. Model prose cannot substitute for these signals.

## Operator checks

Use the canonical `df status`, `df doctor`, `df ci`, audit and GitHub-backed surfaces. Do not depend on Python scripts, harness paths or workflow-specific parser constants.
