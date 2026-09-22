# Backlog

This file is a parking lot for requests that are not part of the active thesis plan or the IDE workstream.

## Rules

- `PLAN.md` is the active thesis execution plan.
- `web/PLAN.md` is the separate generic IDE workstream plan.
- `SCHOOL_RULES.md` is the recovered Odborná-práce compliance contract.
- Items here are inactive until explicitly promoted.

## Requests

### DarkFactory integration and implementation-evidence pinning

Deferred intentionally until the user promotes it.

This backlog item includes the full previously prepared next-phase intent. It is not active work.

Mission:
- complete Chapter 3 / §3.1 **DarkFactory** as the practical architecture/implementation chapter;
- pin the exact canonical DarkFactory revision used by the thesis;
- generate and capture canonical DarkFactory documentation from that exact revision;
- verify architecture/system-description claims against actual merged source, tests, workflows, and reproducible evidence;
- prepare the implementation/evaluation evidence package needed by Chapter 4.

Required evidence discipline:
- treat generated/current DarkFactory documentation as the authority for architecture terminology and intended ownership;
- distinguish documented/final architecture from implementation truth at the pinned revision;
- do not treat `README.md`, `PRD.md`, `PLAN.md`, generated docs, or open PRs as proof that a mechanism is implemented;
- use merged/default-branch source, tests, workflow runs, and reproducible execution evidence for implementation claims;
- record important open PRs as in-flight/non-canonical evidence only;
- do not modify the DarkFactory repository as part of the thesis phase.

When promoted, refresh both repositories before work. At the last coordinator inspection:
- DarkFactory repository: `marius-patrik/DarkFactory`;
- default branch: `darkfactory`;
- observed canonical head: `9f79c5b7ac71160b27d2e29f6dcf1812ed30c0a5`;
- notable open/nonterminal work included PRs #894 and #899;
- remaining `harness/` ownership, `docs.df` targeting `harness/tsconfig.json`, and root quality scripts delegating to `harness` were concrete signs that target architecture and current implementation were not yet identical.

Canonical-docs/evidence work when promoted:
- inspect `README.md`, `PRD.md`, `PLAN.md`, `AGENTS.md`, `docs.df`, `package.json`, `docs/home.md`, `scripts/build-docs.ts`, `packages/docs/`, relevant `packages/web/`, source packages/capabilities, tests, and workflows;
- resolve the default branch dynamically and pin one exact merged/default-branch commit;
- record repository stable identity, branch, SHA, commit date, docs provenance, workflow/run IDs, source paths, test paths, and excluded in-flight PRs;
- generate docs from a disposable checkout/worktree at the exact pinned revision;
- capture a reproducible docs snapshot under `paper/data/` when reasonably sized;
- create a compact machine-readable evidence manifest under `paper/data/` containing provenance, SHAs, workflow IDs, source/test paths, target repositories, evidence type/status, and intended Results/RQ mapping;
- do not create another authored manuscript source or hidden manuscript generator.

§3.1 DarkFactory requirements when promoted:
- fill the currently empty Practical / §3.1 DarkFactory without moving generic Agentic Engineering back out of Theory;
- treat §2.3 Agentické inženýrství as stable unless a concrete factual/source defect is found;
- derive the exact `3.1.x` subsection structure from the pinned canonical DarkFactory architecture rather than stale plans or product taxonomy;
- explain only architecture/implementation boundaries that materially realize the theoretical mechanisms: runtime/state ownership, capability/environment boundaries, GitHub control-plane role, lifecycle execution, recovery/effect handling, repo/config/docs contracts, credential/auth boundaries, documentation generation, and relevant CLI/web surfaces;
- keep the chapter architectural rather than package-by-package unless package boundaries are themselves architecturally important;
- do not smooth over incomplete cutover or describe target architecture as already shipped;
- where implementation differs from documented architecture, explicitly distinguish current implementation from intended/final ownership.

Target-repository/evaluation preparation when promoted:
- resolve target repositories by stable GitHub identity rather than display name;
- reconcile historical `OdbornaPrace-*` names with current repositories such as `DarkFactory-Paper`;
- pin each usable target repository SHA and relevant workflow run;
- record exactly what each artifact can establish and whether it is current, renamed, archived, unavailable, or limited;
- inventory existing Chapter 4 evidence pins and mark supersession/currentness without substantively rewriting Results;
- preserve bibliography entries still needed by current Chapter 4;
- produce an evidence map for 4.1 implementation/system verification, 4.2 repository verification, 4.3 research-question answers, and 4.4 discussion/limitations;
- distinguish architecture/docs evidence, source-code evidence, automated tests, CI/workflow evidence, live/integration evidence, and missing evidence.

Validation when promoted:
- run `make all BOOK=DarkFactory`;
- run `make ci BOOK=DarkFactory`;
- run `make site BOOK=DarkFactory`;
- inspect final/review PDF, HTML, Markdown, site/content index, and affected Chapter 3 boundary pages;
- verify the manuscript keeps the final level-1/2/3 hierarchy and does not recreate per-term semantic headings;
- verify bibliography and evidence snapshots are reproducible.

Exit when promoted:
- exact canonical DarkFactory revision pinned;
- canonical docs from that revision captured reproducibly;
- Practical / §3.1 DarkFactory complete;
- implementation claims verified against actual merged implementation evidence;
- target repository/workflow evidence pinned;
- evidence map ready for Chapter 4;
- limitations explicit;
- no premature Results rewrite.

### Evidence-aligned research frame + Results refresh

Blocked behind the DarkFactory integration/evidence item above.

The active coherence pass already establishes the final Introduction structure and rewrites the current Results presentation. This backlog item is therefore an evidence refresh, not another structural rewrite.

When promoted:
- adjust 1.2 Cíl práce a výzkumné otázky and 1.3 Metodika only where the newly pinned DarkFactory evidence requires factual alignment;
- keep the three-section Introduction hierarchy;
- ensure every RQ maps to pinned evidence;
- refresh 4.1–4.4 from the new evidence manifest;
- answer RQs explicitly;
- separate observed results from interpretation and limitations;
- do not use Chapter 4 to re-explain architecture;
- preserve the concise prose contract established by the active rewrite.

Exit when promoted:
- objectives, methodology, evidence, and evaluation are mutually consistent;
- every RQ is answerable and answered from pinned evidence.

### Thesis-wide closure

Deferred final manuscript-content pass after the evidence/results path is complete.

Scope:
- deduplicate across Introduction / Theory / Practical / DarkFactory / Results;
- audit factual claims and citations;
- remove unused bibliography records;
- finalize Chapter 5 Závěr;
- finalize Czech/English annotation material as required by the verified school contract;
- finalize keywords;
- verify that the already-promoted encyclopedia/term-index removal remains complete;
- finalize remaining back matter;
- verify terminology and cross-references;
- ensure no new factual material appears only in Conclusion.

Exit when promoted:
- manuscript content is substantively final;
- only publication/school-format defects remain.

### Odborná-práce publication QA

Deferred final publication/compliance phase.

Prerequisite:
- the active direct-text school-guide audit has completed and `SCHOOL_RULES.md` is reconciled.

Then:
- apply exact title-page, declaration, annotation, bibliography, pagination, typography, figures/tables, appendices, and submission rules;
- validate source/output paths;
- generate every required submission artifact confirmed by the guide;
- run final PDF/HTML/Markdown/review/site builds;
- inspect the final PDF page by page;
- fix presentation-only defects;
- require CI, Deploy Documentation, and Release green on the same final head.

Exit when promoted:
- school compliance is verified against the directly audited Odborná-práce guide;
- all canonical artifacts and publication workflows are green on one final commit.
