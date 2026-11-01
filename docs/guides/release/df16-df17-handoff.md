# DF-16 → DF-17: Immutable Release Candidate Handoff

**Status:** contract only. No v1.0.0 candidate, acceptance approval, public tag, or release is asserted here. Ownership: #2708 release gate; #2709 candidate bytes, provenance, and evidence; #2707 explicit final publication. #2070 remains the master plan.

## Immutable identity

The source of production version intent is `repo.dfconfig.repo.versioning` with `mode: semver`, `tag_prefix: v`, `initial: 1.0.0`. Frozen `VERSION`, root private `package.json`, `packages/plugins/package.json`, native embedded build stamp, CLI `df --version`, release notes and installer receipts must agree at `1.0.0`. ABI is **independent**, `CAPABILITY_ABI_VERSION = "1"` in `packages/capability/src/abi.ts`. Existing public `v0.292.4` must remain untouched.

An agent must never treat intended source version metadata as evidence of an already published release. Require the same lockfile bytes, reviewed commit identity and exact Git **tree SHA** on the protected final commit. Differing merge SHAs with identical verified tree hashes are eligible; different trees require fresh review and candidate evidence.

## Required artifact input to promotion

The DF-17 candidate workflow must upload an artifact named **`promotion-evidence`** containing a single **`promotion-evidence.json`**. The explicitly authorized operator supplies its producing **GitHub Actions run ID** and independent SHA-256 over the exact JSON bytes as `candidate_run_id` and `evidence_sha256` to the release workflow. The gate requires a successful source-free job on the reviewed SHA and re-queries all authoritative outcomes via GitHub REST.

Schema `1`, with fields:

- `repository` = `marius-patrik/DarkFactory`; `candidate_id` = immutable, nonempty unique opaque ID; `version` = `1.0.0`; `capability_abi` = `1`.
- `source`: `reviewed_sha`, `reviewed_tree`, `final_sha`, `final_tree`, `lock_sha256` (SHA-256 of `bun.lock`), `pull_request` (reviewed and merged PR into main).
- `candidate`: `run_id` (must equal workflow dispatch input), `head_sha` (reviewed SHA), `conclusion: success`.
- `targets`: exact set `darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`, `win32-x64`.
- `artifacts`: unique `{name, sha256}` objects, each with SHA-256 digest of actual immutable bytes. At minimum all five `df-<target>` executables (Windows `.exe`), all five `.tar.gz` archives; include **every** additional published package, site bundle, plugin, docs, installer, checksums file, SBOM or manifest used for the final release. The candidate builder must preserve byte identity; the gate re-hashes uploaded files and compares GitHub's server-side SHA-256 records before switching draft to public.
- `acceptance`: **exactly one** each of `source-free`, `security`, `fleet`, `web-ux`, `supply-chain`, `governed-e2e`, each as `{name,run_id,head_sha,conclusion}`, with real successful workflow + named job evidence bound to the reviewed SHA. Failed/skipped/pending/absent is a hard block. The release gate does **not** create evidence.
- `independent_review`: `{reviewer, reviewed_sha, state:"APPROVED"}`, with GitHub readback proving a current independent human review of exactly the PR candidate SHA.
- `publication_authorization`: `{state:"pending"|"approved",actor:null|string}`; dispatch must be independently authorized before promotion, and environment protection must actually enforce an external human approval.

## Required GitHub governance

Protected `main` must be covered by enforced branch rules requiring **at least one fresh human reviewer**, stale reviews dismissed on push, and exact-final-head successful checks `quality`, `verify-bound-issue`, `candidate`. Enforced tag rules for `refs/tags/v*` must reject **update and deletion** and allow no bypass actors. A real `production-release` environment must require independent external reviewers and prevention of self-review. Readback requires adequate token scope; denial or absent rules blocks publication. The release workflow is explicitly dispatched by `marius-patrik` only against the exact protected main SHA. No PR, CI, manifest, or commit automatically authorizes publication.

The **resolve/build** jobs are read-only; publication credentials are restricted to the guarded publish job. An authorization failure, duplicate tag, SHA mismatch, digest mismatch, missing independent review, failed acceptance or partial candidate upload must not produce public success. The publisher prepares one nonpublic draft, verifies the complete remote assets and promotion proof, then explicitly publishes; interrupted drafts are not automatically reused.

## DF-17 verification obligations before handoff

Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun run format:check`, `bun run lint`, `bun run test`, focused release negative tests, platform-native clean **source-free** extraction/CLI task tests, Docker/Node/npm tests, browser/auth Web, approved-fleet readback, end-to-end governed GitHub workflow, SBOM/license/security checks. Publish each real GitHub Actions run URL, job name, exact commit SHA, artifact digest and approver. Demonstrate the final protected commit's own successful required checks; never claim an old premerge run proves the final SHA. Do not pre-create public tags, publish npm, deploy Pages or change consumers.
