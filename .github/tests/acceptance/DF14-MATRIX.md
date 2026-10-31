# DF-14 — Independent production acceptance evidence matrix

This is an adversarial **release-blocker report**, not implementation-owner sign-off. The independent branch is
`agent/2706-independent-acceptance-df14`, created from
`8b9d05df8c6dd53f8209e76d74f37bbc70d9c9bc`. Do not promote or publish this branch.

## Evidence categories

- **Inspection**: source/workflow inspection only; does not establish executable correctness.
- **Mock boundary**: deterministic negative test with a controlled HTTP/external response.
- **Local execution**: Bun test or a real separate Bun process, real OS files and real temporary Git fixtures.
- **Artifact execution**: actual native `df` built, detached and run without the source tree, with SHA-256 checks.
- **Live external**: real GitHub App/PR/Pages, credentials, protected environment or consumer fleet. **None authorized or performed.**

## Issue-by-issue acceptance

| Issue | Release invariant | Inspection | Mock boundary | Local execution | Artifact execution | Live external | Assessment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #2696 | Single owner for graph, GitHub and release mutations | Graph composition/dispatch read | — | Existing architectural tests via full Bun suite | — | — | Architectural source proof only |
| #2697 | Missing/failing checks cannot pass an aggregate quality gate | CI and check-gate code read | SEC-CHECKS-01 | Full repo tests, standalone Web/Docs | Linux native quality smoke | — | Local proof; real consumers not sampled |
| #2698 | Crash/replay cannot duplicate external mutations; only one local lock owner | Journal, executor and graph code read | — | FAULT-01/02/03/04 with separate processes, stale/torn state; SEC-MERGE-01 | — | — | Local pass; distributed runners and every checkpoint not proven |
| #2699 | Exact-head review, GitHub transport, webhook subject and immutable check evidence | Event translator and dispatch inspected | SEC-GH-01, SEC-CHECKS-01 | SEC-GH-01 **fails**: multi-PR suite maps to first PR only | — | — | **Reject** pending multi-PR ingress correction and live GitHub exercise |
| #2700 | OAuth PKCE/CSRF, confidential token custody and hard session lifetime | Auth broker/client inspected | SEC-AUTH-01 | SEC-AUTH-01 **fails**: refresh moves a maximum expiry forward | — | — | **Reject** until broker lifespan bound is enforced |
| #2701 | Capability dispatch exercises real required operations | Existing CI capability suites inspected | — | Full Bun suite | Detached native consumer quality command | — | Local subset, live providers unverified |
| #2702 | Usable CLI/TUI must work without source checkout | CLI and build contract inspected | — | Full Bun CLI suites | Native `df --version`, help, packaging smoke and `ci quality` | — | Linux x64 artifact pass; interactive TUI not live |
| #2703 | Operator Web is complete, cannot leak secrets or serve unmanifested files | Browser and manifest source inspected | SUPPLY-02/03/04 | Actual Web/Docs manifest browser smoke via local HTTP | Compiled JS and unified content | — | Local packaging/browser pass, authenticated operator unproven |
| #2704 | Docs are source-backed, complete and do not silently deploy | Docs source and Pages build inspected | — | Full docs/site integration | 61-page unified site smoke via existing test | — | Source/local artifact only |
| #2705 | Only explicitly approved consumer scope may receive fleet mutation | Fleet scripts/workflows inspected | Existing repo tests | Full test suite | — | — | Fleet rollout intentionally **not** performed |
| #2706 | Negative fault/security evidence precedes candidate acceptance | Full owned test inventory inspected | SEC-* and SUPPLY-* | 12 new probes: 10 pass, 2 fail (at initial run) | Separate native and site jobs | — | **Reject**; failing invariant proofs preserved |
| #2707 | v1.0.0 publication requires authorized protected release | Release workflow inspected | Existing release tests | Full repo suites | Candidate smoke only | — | No release, no publish, no tags |
| #2708 | Version transition requires exact release metadata | Versioning source/workflow inspected | Existing release tests | Full repo suite | Native version readback | — | No protected-branch tag transition |
| #2709 | Artifact SHA, origin and source-free runtime must match | Release targets, checksum & artifact packager inspected | SUPPLY-01/02/03/04 | Actual site build + Web manifest verification | Linux x64 detached `df` and archive SHA-256 | — | Pass on one platform; 5-target release not approved |
| #2070 | All upstream gates must pass before promotion | Integrated issue/workflow inventory inspected | — | Evidence above | Candidate only | — | **Reject production acceptance** |

## New reproducible findings

**SEC-AUTH-01 — #2700, auth owner.** `packages/auth/src/broker.ts::sessionFromRecord` constructs
`now + sessionTtlMs` on every refresh. Create a session at `now=10000` with
`sessionTtlMs=1000`; initial expiry `11000`. Refresh at `10900`, observed expiry
`11900`, violating an absolute maximum browser-session lifetime. Reproduce:
`bun test ./.github/tests/acceptance/security-boundaries.test.ts`.
Fail the check until the server tracks absolute original session expiry across refresh.

**SEC-GH-01 — #2698 graph ingress owner; related #2699 transport.**
`packages/harness/src/graph/events.ts::translateCheckSuite` reads only
`check_suite.pull_requests[0]`. A completed check-suite with PRs `101` and `202`
silently emits a single PR `101` subject instead of explicitly handling all subjects or rejecting
an ambiguous delivery. Reproduce with the same focused command. The safe acceptance outcome is
fan-out with distinct authenticated/observed PR bindings, or fail-closed until supported.

Neither defect is patched here: production source is read-only to DF-14.

## Local fault and artifact executions

- `FAULT-01`: separate Bun process exits inside a filesystem lock; dead-owner recovery succeeds.
- `FAULT-02`: three concurrent Bun processes share one key and serialize the exact appended record.
- `FAULT-03`: actual child process exits after remote write, leaving pending intent; restarted journal
  reads independent remote evidence, does not re-execute the mutation and commits completion.
- `FAULT-04`: torn JSON remains an error, never treated as absent intent.
- `SEC-MERGE-01`: review fingerprint rejects modified SHA/evidence.
- `SEC-CHECKS-01`: absent/pending/failed required checks cannot be transformed to all-green.
- `SUPPLY-01/02/03/04`: candidate stage succeeds with a complete manifest, but refuses wrong SHA,
  tampered digest, traversal path, symlink and credential-like contents.
- Actual Web/Docs unified-site local HTTP smoke and actual Linux x64 source-free CLI build, extraction,
  consumer action discovery/failure and archive digests are exercised separately in the acceptance workflow.

## Verification and operating boundaries

Initial proof run: [GitHub Actions #41199080380](https://github.com/marius-patrik/DarkFactory/actions/runs/41199080380)
at `d2a4efd784eb430dce87753958942a3bfa2fbf33`.
At that initial head, 3,020 Bun tests passed, 2 failed, 1 skipped; source-free and real Web/Docs jobs
passed. The two failures are the defects above. The initial run also exposed acceptance-test-only
TypeScript/format errors, which were subsequently corrected in acceptance-owned files; final-head
verification must be read independently. The unmodified production source is not claimed safe merely
because 3,020 older tests pass.

Final-head commands to run under the read-only, reusable workflow:
`bun install --frozen-lockfile`; `bun test --timeout 30000 ./.github/tests/acceptance/*.test.ts`;
`bun run typecheck`; `bun run format:check`; `bun run lint`; `bun run test`;
`bun test --timeout 180000 ./.github/tests/web/manifest-acceptance.test.ts`;
`bun run build --target=linux-x64`;
`bun packages/harness/scripts/verify-target.ts --target linux-x64`.

**Unexecuted and release-blocking:** real external GitHub App + OAuth callbacks, a disposable protected
GitHub Request-to-merge repository, two machines with a shared durable store, simultaneous GitHub
merge mutation outcomes, multi-platform native targets at this final head, human-reviewed Web
accessibility, Pages environment approval, deployment, consumer fleet authorization or release tags.
No tokens, deploy permissions, write scopes or production secrets are provided to DF-14.
