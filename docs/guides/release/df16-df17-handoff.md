# DF-19 — Two-stage source-free release evidence lifecycle (DF-16 → DF-17)

**Status:** executable producer-side gate contract; **not** proof of an existing passing v1.0.0 candidate or permission to publish. Ownership #2708; native builder + Stage A producer #2709; release acceptance #2707/#2706; master #2070.

## Root cause

The former schema 1 required `source.final_sha`, `source.pull_request`, `independent_review` and `publication_authorization` inside the **premerge** producer's uploaded evidence. These facts do not exist when the candidate bytes must be built. At the same time, the old release workflow rebuilt binaries in its publication run and compared them to the unrelated candidate-run evidence, so a valid producer could neither seal its evidence honestly nor guarantee the published bytes were its tested bytes.

## Canonical state machine

```text
reviewed source SHA + tree + bun.lock
   | (unprivileged DF-17 multi-platform run; NO publication token)
   v
A: technical-candidate.json + source-free candidate-* bundles
   | (immutable hash pinned by human in release workflow_dispatch)
   | (independent PR review; protected-main merge; exact tree equality)
   v
resolve: live GitHub readback of merge, reviews, checks, rules, run and bundles
   | (no draft/tag mutations, no approval asserted by candidate)
   v
production-release protected environment / different human approver
   |
   v
B: promotion-evidence.json sealed inside guarded publish job
   | A SHA-256, actual merge commit, PR+review, final checks, run approval
   | (gate independently verifies all GitHub facts again)
   v
exact original A run bundles -> locally hash and compare inventory
   |
   v
new nonpublic DRAFT -> remote SHA-256 and inventory verification
   | (recheck protected branch, tag, human auth and final checks)
   v
public release -> authoritative GitHub readback -> success OR fail closed
```

A is never modified by B. JSON assertions cannot authorize publication. No source-free binary is rebuilt during the producer's release workflow: its prior candidate run is an explicit provenance root. Same SHA-1 commit ID is not necessary across review and squash/merge; **identical Git tree SHA** is necessary. The final protected HEAD must be exactly the PR's actual `merge_commit_sha` and must remain current (no subsequent unrelated commits, even if those commits produced equivalent trees).

## Stage A technical-candidate.json (schema 2)

GitHub Actions producer artifact: **`technical-candidate`**, containing exactly **`technical-candidate.json`** (not Stage B). Required structure:

```json
{
  "schema": 2, "kind": "technical-candidate",
  "repository": "marius-patrik/DarkFactory",
  "candidate_id": "df17-v1-run123-attempt1", "version": "1.0.0", "capability_abi": "1",
  "source": {
    "sha": "<40 hex reviewed source commit>", "tree": "<40 hex Git tree>",
    "lock_sha256": "<64 hex SHA-256 of bun.lock>"
  },
  "build": {
    "run_id": 123, "run_attempt": 1,
    "workflow": ".github/workflows/candidate-release.yml"
  },
  "targets": ["darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64", "win32-x64"],
  "artifacts": [
    { "name": "df-linux-x64", "sha256": "<64 hex>",
      "bundle": "candidate-linux-x64" },
    { "name": "df-linux-x64.tar.gz", "sha256": "<64 hex>",
      "bundle": "candidate-linux-x64" }
  ],
  "acceptance": [
    { "name": "source-free", "run_id": 123, "head_sha": "<reviewed source SHA>", "conclusion": "success" },
    { "name": "security", "run_id": 124, "head_sha": "<reviewed source SHA>", "conclusion": "success" },
    { "name": "fleet", "run_id": 125, "head_sha": "<reviewed source SHA>", "conclusion": "success" },
    { "name": "web-ux", "run_id": 126, "head_sha": "<reviewed source SHA>", "conclusion": "success" },
    { "name": "supply-chain", "run_id": 127, "head_sha": "<reviewed source SHA>", "conclusion": "success" },
    { "name": "governed-e2e", "run_id": 128, "head_sha": "<reviewed source SHA>", "conclusion": "success" }
  ],
  "provenance": { "provider": "github-actions", "repository": "marius-patrik/DarkFactory",
    "source_sha": "<reviewed source SHA>" }
}
```

Example inventory shows only **two of ten mandatory binaries/archives**; it is deliberately incomplete and **not a valid manifest to upload**. The producing workflow must include all ten assets for all five targets (Windows binary: `df-win32-x64.exe`). Additional published assets (checksums.txt, SBOM, docs, installers, npm bundle) **must** be built and hashed premerge and included with `bundle: "candidate-extra"`; upload them under `candidate-extra`. Nothing may be derived or appended after stage A and silently treated as approved.

The five native artifact bundles use names `candidate-darwin-arm64`, `candidate-darwin-x64`, `candidate-linux-arm64`, `candidate-linux-x64`, `candidate-win32-x64`. Only these, optionally `candidate-extra`, and `technical-candidate` may exist in the candidate run. The producer must finish the source-free aggregate job and verify all six acceptance outcomes before writing its manifest; the producing workflow itself may still be running. The `acceptance[].conclusion` values must all be `success` and are independently re-queried after the run completes. The producer must upload exact files flat under the bundle (per-target `.sha256` build receipts are allowed but are not release assets). Each candidate bundle is downloaded **from Stage A's original GitHub run ID**, never the sealing/publishing run. Upload-artifact V4 run artifact objects are unique and cannot silently be replaced within a completed run. Runner/asset build execution must conclude successfully before publication; the manifest can be uploaded while the run itself is executing and therefore must not claim its own final conclusion.

Use `sha256sum technical-candidate.json` independently to capture `evidence_sha256`. The operator supplies this hash, plus producing `candidate_run_id`, in explicit `workflow_dispatch` on protected `main`. The exact digest must match the downloaded manifest; rerun/replaced artifacts require a new independently pinned digest and fresh verification. The semantic product version authority remains `repo.dfconfig.repo.versioning`, `VERSION`, package metadata and release versioning resolver; ABI comes from `CAPABILITY_ABI_VERSION`, not a duplicated version policy.

## Stage B promotion-evidence.json (same schema 2 family)

Sealed **after** the PR is merged and the protected `production-release` environment has approved the *current publication workflow run*, not uploaded by the Stage A producer:

```json
{
  "schema": 2, "kind": "promotion-evidence",
  "repository": "marius-patrik/DarkFactory",
  "candidate_id": "<identical Stage A ID>",
  "technical_sha256": "<exact independently supplied SHA-256 of Stage A bytes>",
  "source": {
    "reviewed_sha": "<A.source.sha>", "reviewed_tree": "<A.source.tree>",
    "final_sha": "<actual merged main commit>", "final_tree": "<actual main tree>",
    "pull_request": 77
  },
  "review": { "id": 90, "reviewer": "<independent human login>",
    "commit_sha": "<A.source.sha>" },
  "final_checks": ["quality", "verify-bound-issue", "candidate"],
  "authorization": { "run_id": 701, "approver": "<independent human>",
    "environment": "production-release" }
}
```

The sealing implementation re-queries GitHub to discover the merged PR/reviewer/environment approver and **reconstructs** the seal. A provided B file must exactly match this freshly reconstructed record. Merely putting `approved` or a username in a manifest never authorizes a release. Only the live GitHub environment approval endpoint for **this exact run** is accepted.

## GitHub readback and immutable identity

- `GET /branches/main`, `/git/commits/{sha}`: verified protected HEAD and exact reviewed/final tree.
- `GET /commits/{final_sha}/pulls`, `/pulls/{n}`, `/pulls/{n}/reviews`: exactly one merged PR targeting main, `head.sha == A.source.sha`, `merge_commit_sha == final_sha`, latest current independent human `APPROVED` review on exact reviewed SHA. Author and explicit dispatcher may not self-approve.
- `GET /rulesets`, `/rulesets/{id}`: active protected-main rule with fresh review and required named final-head checks, and immutable nonbypassable `v*` tag update/deletion ban.
- `GET /commits/{final_sha}/check-runs`: completed successful **actual final-head** `quality`, `verify-bound-issue`, `candidate`; skip/pending/failure is blocked.
- `GET /actions/runs/{run_id}`, `/jobs`: completed successful premerge source-free `candidate` job and six named technical acceptance jobs on A's SHA; require actual producing workflow path and run attempt. `/actions/runs/{candidate_run}/artifacts`: complete, nonexpired exact bundle set, no extras.
- `GET /environments/production-release`, `/actions/runs/{publication_run}/approvals`: required independent reviewers, prevent-self-review and actual external approval for the exact publication run.
- `GET /git/ref/tags/v{version}`, `/releases/tags/v{version}`: no existing tag or draft before first write. The concurrent release workflow uses a single repository-wide concurrency group and forbids duplicate/repeated dispatch publishing.
- `GET /releases/{id}/assets`: only approved release asset names, complete cardinality, uploaded state and exact server `sha256:` digest. Verify before and after public promotion. An uncertain GitHub response is a failure requiring explicit authoritative reconciliation, never automatic retry.

## Required DF-17 handoff and remaining external gates

1. DF-17 must emit the exact **Stage A schema 2** and artifact bundles above from `.github/workflows/candidate-release.yml` (or explicitly coordinate a reviewed change to the declared workflow path). The existing baseline candidate workflow does **not yet** upload `technical-candidate`, aggregate six acceptance records or candidate-extra. **This interface is not satisfied until DF-17 implements it.**
2. DF-17 must ensure all five native builds execute from the exact same reviewed head source and record Git tree, source lock and every artifact SHA-256. Do not use the current release's newly rebuilt binaries; never upload a Stage B manifest premerge.
3. Acceptance owners must supply real successful job runs for all six acceptance names; the final-main source must also independently acquire the required final-head checks. The GitHub branch, tag rulesets and production-release environment must actually exist and be readable to the release token; no branch/protection configuration has been changed by DF-19.
4. Operator supplies **`candidate_run_id`** for Stage A run and **`evidence_sha256`** for `technical-candidate.json`. The **publication run ID** comes from `GITHUB_RUN_ID`, is intentionally distinct and binds Stage B's external approval. No separate sealing run ID is required because the protected publish job seals inside the publication run.
5. No real release, tag, npm publication, production web deployment or main merge is authorized by this document. Passing mocked tests cannot substitute for live GitHub acceptance.

Failures remain nonpublic or fail closed; a partial draft is *not* silently recovered or treated as success. Immutable tags prevent republishing a version; a GitHub API timeout, stale approval, digest discrepancy, partial draft or duplicate dispatch requires explicit owner investigation.
