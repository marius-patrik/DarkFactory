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

## Repeatable GitHub-side intake (without assuming automation)

**Permissions:** a GitHub user permitted to create Issues and read Actions/branch protection, plus an App installation limited to this approved repository. A repository operator may create the Request through GitHub's **Issues → New issue** UI. Before submission record repository owner/name, target branch, requested behavior, out-of-scope files, acceptance checks and any downstream dependency. Avoid adding credentials or private incident payloads to public issues. A created Issue URL/number proves intake only; it does not prove a graph run started.

Verify that the issue remains in the intended repository, references the correct default branch and has the configured Request tracking/ownership. If the App is absent, the organization approval policy rejects installation, or an automation does not create Planning, stop here. Do not manufacture a Planning record or open an unreviewed PR to simulate the missing transition.

## Planning review and approval checklist

Inspect Planning before applying an owner approval: immutable Request source, exact repository ID, base/head references, scope and file ownership, independent review comments, required skills/capabilities, quality actions, dependency DAG, failure recovery and estimated provider usage. Any revision invalidating those facts must be reviewed again. **No arbitrary GitHub comment saying “approved” is automatically a valid Planning approval**; the canonical graph (#2698) must demonstrate its accepted authenticated approval event and receipt. If the official approval UI/event is not present, record it as blocked rather than guessing an endpoint.

## First real-run acceptance record

Capture Request issue URL, Planning artifact URL/revision, authenticated reviewer, approval receipt, graph run ID, initial durable checkpoint, bot PR URL, required check suites with exact SHA, final human merge decision and remote merge SHA. Test unauthorized/stale approval denial, not just the happy path. First-request completion remains blocked on #2698/#2699/#2703/#2706 until those observations exist.
