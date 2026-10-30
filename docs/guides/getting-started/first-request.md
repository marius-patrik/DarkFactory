# First repository and governed Request

The intended [Request lifecycle](../operator/lifecycle.md) is controlled by GitHub issues/PRs, explicit Planning approval and authorization at merge. A green static documentation page does not mean the execution graph is connected.

## Before starting

1. Confirm your repository is in the approved installation scope. App access alone does not authorize fleet installation; see [fleet policy](../administration/fleet.md).
2. Validate the single `repo.dfconfig` (or one accepted alias), default branch and branch protection.
3. Verify GitHub App permissions, user identity and operator authorization.
4. Check required tests, models, quota and capabilities are usable.
5. Open a GitHub Request that states goals, acceptance tests, dependencies and scope without exposing tokens.

## Intended governed flow

Capture Request → unified Planning → independent review/fix → **one owner Planning approval** → implementation → deterministic checks → independent review/fix → final alignment → external checks → explicit merge authorization → merge/reconcile.

Before approving, confirm the Planning revision, base SHA, issue links and scope are current. Material changes invalidate stale approval. The exact approval UI/API and end-to-end behavior remain gated by #2698, #2699 and #2703.

## Verification evidence

Preserve GitHub issue/PR identifiers, approved Planning revision, run identity, expected-old and new SHAs, test results and actual readback. Never accept a model's prose as proof of a GitHub write.
