# Recovery-only merge bridge: canonical integration into historical DarkFactory

**NOT A PRODUCTION BRANCH. NOT SEMANTICALLY ACCEPTED. DO NOT OPEN A RELEASE PR FROM THIS BRANCH.**

This bridge is an isolated, auditable two-parent merge designed to inspect recoverable historical functionality without modifying the original `finish/darkfactory`, canonical integration, or protected `main`.

- Common ancestor: `bffdd73ac2cb4819a3cb5456d21af2fb603eba1f`
- First parent (preserved recovery source): `58bb34f50d00287f6bd5164a84434e228aeb0e1f`
- Second parent (canonical integration): `964cf1471c4d10760719ca6823fb3f2852709598`
- Tree policy: choose the canonical tree as the authoritative modern baseline. Preserve selected legacy-only implementation candidates as inert historical source for manual porting. Do **not** restore historical test/config/paper roots or overwritten production implementations.

## Three-way inventory

- 68 identical paths (including jointly absent paths not counted).
- 812 current-integration-only changed paths: retain canonical contents.
- 99 paths modified/deleted differently on both sides: select canonical contents **structurally only**; all require semantic disposition before acceptance.
- 120 legacy-only changed paths: 28 retained as source candidates; 92 omitted from staging tree (still accessible on immutable legacy branch).

**WARNING:** Path overlap is not equal to the number of textual Git merge conflicts; these classifications are Git object comparisons against the shared ancestor. Selecting a canonical blob is NOT evidence that legacy behavior is safely superseded.

## Retained historical candidate files (not wired into production)

- `capabilities/docs/capability.ts` — legacy blob `2842d3a7d565d29b4205ca908a4ede6e17e9ec6a`
- `harness/src/graph/production-composition.ts` — legacy blob `2950916756359077be4733d5ba3aa9d54fdbcea6`
- `harness/src/graph/runtime-composition.ts` — legacy blob `44e67421fab8a2d7eccdb5de2967128768361554`
- `harness/src/hooks/branch-name.ts` — legacy blob `88c9cea443930118f9eff0e9873f930b65c87f3d`
- `harness/src/hooks/conventional-commit.ts` — legacy blob `7803fb1c5406cf15f51e2e71ce45100b57f21dc2`
- `harness/src/hooks/engine.ts` — legacy blob `855d3e7aedbf4eb172105db14fec0acb43c840e6`
- `harness/src/hooks/registry.ts` — legacy blob `57c5af11c84ae079e10be158951b1b2cbcf0babd`
- `harness/src/hooks/tests-touched.ts` — legacy blob `9643426cc55b000f9cd832d7f50e56f788c2ffde`
- `harness/src/hooks/types.ts` — legacy blob `a4c100e667ed3e0132c5d3edb8e22395beedeabb`
- `harness/src/release/notes.ts` — legacy blob `6679265889186ed5d90e7b098edd3497a789f0ff`
- `harness/src/release/versioning.ts` — legacy blob `3f176d6cd8f46b3227758f2106f3641ca777db38`
- `harness/src/workspace/conflict-repair.ts` — legacy blob `0353e027d523f3774376f4944266cd4024983f6b`
- `packages/capability/src/abi-version.ts` — legacy blob `141c195c874ffc24c8dc814e00cf77623aadbbd3`
- `packages/capability/src/registry.ts` — legacy blob `4e33a7b597a7f295e63e313f66df7847c3cff42e`
- `packages/core/src/graph/checks-gate.ts` — legacy blob `edb522182a2734b1c90c2e0718bf65ba2b9e70c1`
- `packages/core/src/graph/effect-journal.ts` — legacy blob `ddcd7ae8e392b7e885f49e3248f2e99f90b6e97d`
- `packages/core/src/graph/events.ts` — legacy blob `05b3883617113a418bbd99f151e55428491071b7`
- `packages/core/src/graph/executor.ts` — legacy blob `70256daae71343baf6d1eea6b98feba9279187c9`
- `packages/core/src/graph/index.ts` — legacy blob `e90ae7c70ce76ebe120abb97a5a5e601daf9e1f3`
- `packages/core/src/graph/loader.ts` — legacy blob `038c6bb9457cad599f17015f350e046fb64bee37`
- `packages/core/src/graph/planner.ts` — legacy blob `638710c7365b696dcffe7ae9ac8bc2ea442fcb23`
- `packages/core/src/graph/planning.ts` — legacy blob `6168069f1b3267da00e3833c3cbcaf4b36d5bc30`
- `packages/core/src/graph/production-handlers.ts` — legacy blob `c6a25a2b96c9132c9adc1f1df8f712535c8fc543`
- `packages/core/src/graph/review-loop.ts` — legacy blob `a08dd6a04fc2319bf560e91b13cbb28b87008911`
- `packages/core/src/graph/types.ts` — legacy blob `df31d92125668ab088fef0f30a582010ca584a65`
- `packages/core/src/graph/validator.ts` — legacy blob `e6be50bbbc17de9c4b10f403f94f54c4b9e3a972`
- `packages/core/src/mutation-evidence.ts` — legacy blob `cc7bba15c52cd00e90c0307840e5ffe7cf744985`
- `packages/protocol/src/mutation-evidence.ts` — legacy blob `e2363248e553e5dfc8a4f3793b6a8607fbf29b30`

## Dual-changed paths: canonical selection pending behavior audit

- `.agents/AGENTS.md` — canonical DELETED, legacy d0f74872af9c
- `.agents/PRD.md` — canonical DELETED, legacy f6e7b7bd0f88
- `.agents/skills/darkfactory-auth/SKILL.md` — canonical DELETED, legacy bafafa270f76
- `.github/ISSUE_TEMPLATE/decision.yml` — canonical 138e5f2ff045, legacy DELETED
- `.github/ISSUE_TEMPLATE/epic.yml` — canonical 67e6a4e00447, legacy 07efc9470b70
- `.github/ISSUE_TEMPLATE/request.yml` — canonical 99a6fd2750a8, legacy 08a5472357af
- `.github/scripts/agent_runner.py` — canonical DELETED, legacy ea152c681d98
- `.github/scripts/install.py` — canonical DELETED, legacy f92bde5810dd
- `.github/scripts/repo_settings.py` — canonical DELETED, legacy 992b7199882e
- `.github/workflows/branch-policy.yml` — canonical 612267142832, legacy 40bac6e6c154
- `.github/workflows/ci.yml` — canonical c1b5268742f4, legacy 87baeaa9dffa
- `.github/workflows/install.yml` — canonical 038e423885e7, legacy 22e5f39b661a
- `.github/workflows/project-automation.yml` — canonical eca2fd38497c, legacy 5aba7e470086
- `.github/workflows/release.yml` — canonical 2da2553fceb3, legacy ed1442856331
- `.github/workflows/verify-pr-issue.yml` — canonical 3d8a2e766de0, legacy ff47dbc7c251
- `README.md` — canonical 45a6111dae9c, legacy fa67a2d3e2ab
- `biome.json` — canonical 0bf376a9ab12, legacy a1fe9311ba38
- `bun.lock` — canonical 2a0e5d526972, legacy 1f9d1c089664
- `capabilities/code/capability.ts` — canonical DELETED, legacy ffed91eb2fe7
- `capabilities/code/package.json` — canonical DELETED, legacy 1d04adecef17
- `capabilities/math/package.json` — canonical DELETED, legacy d67f44fd6459
- `capabilities/paper/package.json` — canonical DELETED, legacy 1040b69b453a
- `docker/Dockerfile.agent` — canonical 75350884e92b, legacy 4966a2bb4258
- `harness/assets/graph.darkfactory.json` — canonical DELETED, legacy 0af75300da22
- `harness/assets/workflows/ci.yml.tmpl` — canonical DELETED, legacy 56ee609d5b90
- `harness/biome.json` — canonical DELETED, legacy b90bf257d76a
- `harness/scripts/package-assets.ts` — canonical DELETED, legacy 3d9fea76a6c6
- `harness/src/ci/guard.ts` — canonical DELETED, legacy e11940ccab25
- `harness/src/ci/installer.ts` — canonical DELETED, legacy f774a6da2806
- `harness/src/cli.ts` — canonical DELETED, legacy 2e764bc47137
- `harness/src/config.ts` — canonical DELETED, legacy e6c0c8ce2f54
- `harness/src/github/repository.ts` — canonical DELETED, legacy 27b4b9b4112e
- `harness/src/graph/dispatch.ts` — canonical DELETED, legacy dd8765630e06
- `harness/src/limits/quota-engine.ts` — canonical DELETED, legacy 0359f502013c
- `harness/src/router/router.ts` — canonical DELETED, legacy ebbeecfa1a76
- `harness/test/ci/guard.test.ts` — canonical DELETED, legacy 9a561b5b78ae
- `harness/test/ci/skills-assets.test.ts` — canonical DELETED, legacy 64adc178d03b
- `harness/test/credentials.test.ts` — canonical DELETED, legacy 5ea16c11d333
- `harness/test/docs-package.test.ts` — canonical DELETED, legacy 54ce59640315
- `harness/test/fixtures/store-writer.ts` — canonical DELETED, legacy e830769fd215
- `harness/test/google-failover.test.ts` — canonical DELETED, legacy e84022a3164d
- `harness/test/graph/checks-gate.test.ts` — canonical DELETED, legacy a9563a4ed4e8
- `harness/test/graph/dispatch.checks-gate.test.ts` — canonical DELETED, legacy fcd618ed6025
- `harness/test/graph/dispatch.test.ts` — canonical DELETED, legacy c7cb5d567569
- `harness/test/graph/events.test.ts` — canonical DELETED, legacy b1c06b21f82c
- `harness/test/graph/executor.test.ts` — canonical DELETED, legacy cda41dda1ba3
- `harness/test/graph/loader.test.ts` — canonical DELETED, legacy 37bf7e09b652
- `harness/test/graph/planner.test.ts` — canonical DELETED, legacy e481ee744dab
- `harness/test/graph/planning-review.test.ts` — canonical DELETED, legacy d7be61489ffb
- `harness/test/graph/validator.schema.test.ts` — canonical DELETED, legacy d94690fd092f
- `harness/test/graph/validator.test.ts` — canonical DELETED, legacy da51a7e8aaf7
- `harness/test/limits.test.ts` — canonical DELETED, legacy 5e1d2f5f3cb4
- `harness/test/packaging.test.ts` — canonical DELETED, legacy 9ea0de99f746
- `harness/test/quota-engine.test.ts` — canonical DELETED, legacy b45a5b0d512d
- `harness/test/repository-actions.test.ts` — canonical DELETED, legacy d216664a2371
- `harness/test/result-capture.test.ts` — canonical DELETED, legacy 7b73731b2f39
- `harness/test/workspace-boundaries.test.ts` — canonical DELETED, legacy 8c80aa65a9d4
- `package.json` — canonical 4ded40608070, legacy 02d56c8fcb0a
- `packages/auth/src/broker.ts` — canonical 696279a95a46, legacy 57aa86c1a9a1
- `packages/auth/test/broker.test.ts` — canonical DELETED, legacy ee290dacb301
- `packages/capability/package.json` — canonical DELETED, legacy 80fbcd320b8c
- `packages/capability/src/abi.ts` — canonical a8cc07ad2491, legacy 5223ef7ace69
- `packages/capability/src/actions.ts` — canonical cf35fa225686, legacy 8f9dd5432137
- `packages/capability/src/adapters.ts` — canonical b500abcb2a40, legacy 1d06599cdb6d
- `packages/capability/src/compatibility.ts` — canonical e167440a2dc8, legacy DELETED
- `packages/capability/src/index.ts` — canonical b83ddccbaaf9, legacy 9f434542c6e4
- `packages/capability/src/loader.ts` — canonical 6d0652e0819b, legacy 4c3e710d2a05
- `packages/capability/test/abi.test.ts` — canonical DELETED, legacy bba700f1572f
- `packages/core/package.json` — canonical DELETED, legacy 5b7c77747854
- `packages/core/src/index.ts` — canonical DELETED, legacy 078244bbcd16
- `packages/core/src/repository-evidence.ts` — canonical 0391540c83ba, legacy 5f960f7e215b
- `packages/core/src/result-capture.ts` — canonical 9cf3edb31880, legacy 577bd69ed937
- `packages/docs/src/agents.ts` — canonical DELETED, legacy 3a6d3ed42b85
- `packages/docs/src/content.ts` — canonical 084723f1d137, legacy a3f75b7b81a6
- `packages/docs/src/current.ts` — canonical 24b55bda5088, legacy 1916f8314cc3
- `packages/docs/src/impact.ts` — canonical c7033a1f8f7d, legacy 1faa3ae5efe4
- `packages/docs/src/readme.ts` — canonical 284f22f6bcd4, legacy DELETED
- `packages/docs/src/relations.ts` — canonical 8eab2277e610, legacy b2aceb436fd7
- `packages/docs/test/agents.test.ts` — canonical DELETED, legacy 1cc8118e882f
- `packages/docs/test/current.test.ts` — canonical DELETED, legacy 57555c81f20f
- `packages/docs/test/impact.test.ts` — canonical DELETED, legacy 467ee96f0d92
- `packages/docs/test/metadata.test.ts` — canonical DELETED, legacy e3ff45584394
- `packages/docs/test/relations.test.ts` — canonical DELETED, legacy e8571f83b2ac
- `packages/github/package.json` — canonical DELETED, legacy 2b285d709a6d
- `packages/github/src/types.ts` — canonical c1137cd34bba, legacy fb03fb48a030
- `packages/protocol/src/index.ts` — canonical 3e1834c070a5, legacy 5d0b4402f709
- `packages/protocol/src/workflow.ts` — canonical 8c6bb2e12a8a, legacy 3979b4210898
- `packages/web/package.json` — canonical DELETED, legacy 7e6d73369adb
- `packages/web/src/index.ts` — canonical 7463299db811, legacy 1575453fa75d
- `packages/web/src/web-shell.tsx` — canonical df3ca1202c18, legacy 2a2f4f6fd4b0
- `packages/web/test/web-shell.test.tsx` — canonical DELETED, legacy 531cd30919af
- `repo.dfconfig` — canonical 09938a907a52, legacy 0a72b7865ea5
- `scripts/build-docs.ts` — canonical eb746cf6a452, legacy 481550ad1241
- `tests/test_agent_runner.py` — canonical DELETED, legacy e033af7f5e7f
- `tests/test_df_harness.py` — canonical DELETED, legacy 7d40c4d299bc
- `tests/test_environment.py` — canonical DELETED, legacy ef5dd8931f91
- `tests/test_pipeline_config.py` — canonical DELETED, legacy 4add2cd9ab20
- `tests/test_workflows.py` — canonical DELETED, legacy d9685b5019ea
- `tsconfig.json` — canonical 1fcface6f8e5, legacy 5c4468cb8ec4

## Legacy-only paths not carried into staging tree (inspect original branch if relevant)

- `.agents/README.md` — legacy-only
- `.agents/adr/0006-the-pipeline-runs-only-df.md` — legacy-only
- `.agents/adr/0008-providers-are-config-driven.md` — legacy-only
- `.agents/adr/0009-accounts-have-named-credential-slots.md` — legacy-only
- `.agents/adr/0011-quota-engine-is-the-only-availability-source.md` — legacy-only
- `.agents/adr/0012-limit-aware-router-with-capability-tiers.md` — legacy-only
- `.agents/adr/0013-df-runs-the-workflow-graph.md` — legacy-only
- `.agents/adr/0015-engine-owns-deterministic-steps.md` — legacy-only
- `.agents/adr/0016-live-model-resolution.md` — legacy-only
- `.agents/adr/0017-modular-packages-and-capabilities.md` — legacy-only
- `.agents/adr/0019-github-backed-web-auth-and-control-plane.md` — legacy-only
- `.agents/adr/0020-auth-keychain-separation.md` — legacy-only
- `.agents/adr/0021-final-repository-declarations-and-capability-detection.md` — legacy-only
- `.agents/adr/0022-complete-the-final-system-directly.md` — legacy-only
- `.agents/adr/0023-first-party-docs-and-one-renderer.md` — legacy-only
- `.agents/adr/0024-serializable-effects-and-crash-consistent-state.md` — legacy-only
- `.agents/adr/0025-single-integration-authority.md` — legacy-only
- `.agents/adr/0026-invariant-based-verification.md` — legacy-only
- `.agents/adr/0027-repository-authored-artifacts-use-english.md` — legacy-only
- `.agents/adr/0028-integrate-paper-as-a-repository-domain.md` — legacy-only
- `.agents/notes/overview.md` — legacy-only
- `.agents/notes/paper.md` — legacy-only
- `.agents/rules/001-unit-tests.md` — legacy-only
- `.agents/rules/002-inline-docs-and-generated-documentation.md` — legacy-only
- `.agents/rules/003-product-requirements-and-adrs.md` — legacy-only
- `.agents/rules/004-english-language.md` — legacy-only
- `.agents/rules/005-commit-granularity.md` — legacy-only
- `.agents/rules/006-ci-readiness.md` — legacy-only
- `.agents/rules/007-branches-and-pull-requests.md` — legacy-only
- `.agents/rules/008-formatting-and-linting.md` — legacy-only
- `.agents/rules/009-issue-binding-and-board-status.md` — legacy-only
- `.agents/rules/010-approved-delivery-plan.md` — legacy-only
- `.agents/rules/011-review-approval-and-governed-merge.md` — legacy-only
- `.agents/rules/012-request-capture-and-planning.md` — legacy-only
- `.agents/rules/013-specification-and-work-tracking.md` — legacy-only
- `.agents/rules/014-agent-runtime-and-resilience.md` — legacy-only
- `.agents/rules/015-repository-taxonomy.md` — legacy-only
- `.agents/rules/016-security-and-secrets.md` — legacy-only
- `.agents/rules/017-final-architecture-dry-and-deletion.md` — legacy-only
- `.agents/rules/018-concurrency-atomicity-and-idempotency.md` — legacy-only
- `.agents/rules/019-orchestrated-integration-and-worker-isolation.md` — legacy-only
- `.agents/rules/020-paper-authorship-and-publication.md` — legacy-only
- `.agents/skills/df-operator/SKILL.md` — legacy-only
- `.agents/skills/pipeline-operations/SKILL.md` — legacy-only
- `.gitattributes` — legacy-only
- `.github/ISSUE_TEMPLATE/configure.yml` — legacy-only
- `AGENTS.md` — legacy-only
- `PAPER.pdf` — legacy-only
- `PRD.md` — legacy-only
- `capabilities/code/capability.test.ts` — legacy-only
- `capabilities/docs/capability.test.ts` — legacy-only
- `capabilities/docs/package.json` — legacy-only
- `capabilities/math/capability.test.ts` — legacy-only
- `capabilities/paper/capability.test.ts` — legacy-only
- `harness/test/github/repository-invariants.test.ts` — legacy-only
- `harness/test/hooks/commit-branch.test.ts` — legacy-only
- `harness/test/hooks/engine.test.ts` — legacy-only
- `harness/test/hooks/tests-touched.test.ts` — legacy-only
- `harness/test/limit-ledger.test.ts` — legacy-only
- `harness/test/notes.test.ts` — legacy-only
- `harness/test/router-preferences.test.ts` — legacy-only
- `harness/test/versioning.test.ts` — legacy-only
- `harness/test/workspace/conflict-repair.test.ts` — legacy-only
- `harness/test/workspace/mutation-evidence.test.ts` — legacy-only
- `packages/core/test/production-graph.test.ts` — legacy-only
- `packages/github/test/types.test.ts` — legacy-only
- `packages/protocol/test/workflow.test.ts` — legacy-only
- `packages/web/src/views/DocsView.tsx` — legacy-only
- `packages/web/src/views/HomeView.tsx` — legacy-only
- `packages/web/src/views/NotFoundView.tsx` — legacy-only
- `packages/web/src/views/PlaceholderView.tsx` — legacy-only
- `packages/web/src/views/StatusView.tsx` — legacy-only
- `paper/bib/gjkt-iso690-numeric-cs.csl` — legacy-only
- `paper/bib/references.bib` — legacy-only
- `paper/fonts/Caladea-Bold.ttf` — legacy-only
- `paper/fonts/Caladea-BoldItalic.ttf` — legacy-only
- `paper/fonts/Caladea-Italic.ttf` — legacy-only
- `paper/fonts/Caladea-Regular.ttf` — legacy-only
- `paper/img/darkfactory-architecture.svg` — legacy-only
- `paper/img/darkfactory-pipeline.svg` — legacy-only
- `paper/img/gradually-ai-usage-2026.svg` — legacy-only
- `paper/img/logo.jpeg` — legacy-only
- `paper/img/react-loop.svg` — legacy-only
- `paper/img/vector-embedding-queen.svg` — legacy-only
- `paper/index.typ` — legacy-only
- `paper/package.json` — legacy-only
- `paper/tsconfig.json` — legacy-only
- `paper/types/turndown.d.ts` — legacy-only
- `paper/typst.toml` — legacy-only
- `scripts/paper/publication.ts` — legacy-only
- `scripts/paper/watch.ts` — legacy-only
- `tests/paper/publication.test.ts` — legacy-only

## Required before promoting any code from this branch

1. DF-01 independently reconciles the historical #2509–#2512 semantic differences on its own branch.
2. DF-02 reviews the runtime code here against canonical package ownership and ports useful mechanisms into one harness/graph implementation.
3. The orchestrator reviews and integrates narrowly scoped, tested ports into the canonical `finish/production-release-2026-10-23` branch.
4. Repository-owned tests must reside only in `.github/tests/`, not under historical `harness/test` or `packages/*/test`.
5. No discarded legacy behavior may be declared superseded without call-site and behavioral evidence.
6. This bridge itself is not a candidate for direct merge into protected `main` or the canonical release branch.
