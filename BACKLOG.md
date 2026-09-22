# Backlog

This file contains thesis work intentionally scheduled after the active coherence rewrite in `PLAN.md`.

## DarkFactory architecture and evidence phase

Goal:
- pin one canonical merged DarkFactory revision;
- generate/read canonical documentation for that revision;
- verify architecture claims against source, tests, workflows, and reproducible execution evidence;
- define and write the final Practical / §3.1 DarkFactory structure from the verified implementation;
- prepare the evidence package used by Chapter 4.

### Evidence contract

Use:
- merged/default-branch source;
- tests;
- workflow runs;
- reproducible execution evidence;
- generated/current architecture documentation for terminology and intended ownership.

Record:
- repository identity;
- branch;
- exact SHA;
- commit date;
- documentation provenance;
- workflow/run IDs;
- relevant source/test paths;
- evidence type/status;
- target-repository identity;
- Results/RQ mapping.

Distinguish documented architecture from implementation evidence wherever they differ.

### Practical / §3.1 DarkFactory

Derive the exact `3.1.x` structure from the pinned implementation.

Cover only architecture and implementation boundaries that materially realize the theoretical model:
- runtime/state ownership;
- capability/environment boundaries;
- GitHub control plane where applicable;
- lifecycle execution;
- recovery/effect handling;
- repository/configuration/documentation contracts;
- credential/auth boundaries;
- relevant CLI/web surfaces.

Use architectural sections rather than a package catalogue unless a package boundary itself explains the system.

### Evidence package

Create a compact reproducible manifest under `paper/data/` when appropriate.

Map evidence to:
- 4.1 implementation/system verification;
- 4.2 repository verification;
- 4.3 research-question answers;
- 4.4 discussion/limitations.

### Validation

Run:
- `make all BOOK=DarkFactory`
- `make ci BOOK=DarkFactory`
- `make site BOOK=DarkFactory`

Inspect the Chapter 3 boundary and canonical generated outputs.

### Exit

- canonical DarkFactory revision pinned;
- §3.1 DarkFactory complete;
- implementation claims evidence-backed;
- target repositories/workflows pinned;
- evidence map ready for Chapter 4.

## Evidence-aligned Results refresh

After the DarkFactory phase:
- align 1.2 Cíl práce a výzkumné otázky and 1.3 Metodika with the pinned evidence where necessary;
- refresh 4.1–4.4 from the evidence manifest;
- answer each RQ from explicit evidence;
- separate observed results, interpretation, and limitations;
- keep Chapter 4 focused on evaluation rather than architecture explanation.

## Thesis closure

After evidence and Results are final:
- perform one cross-chapter coherence pass;
- verify terminology and cross-references;
- audit factual claims and citations;
- prune bibliography records that no longer support final text;
- finalize annotations/keywords against the completed body;
- finalize Chapter 5;
- ensure front/back matter matches the completed manuscript.

## Publication QA

After the direct school-guide reconciliation:
- apply exact title-page/declaration/annotation/bibliography/pagination/typography/figure/table/appendix rules;
- generate every confirmed submission artifact;
- validate PDF/HTML/Markdown/site/release outputs;
- inspect the final PDF page by page;
- require canonical CI, documentation deployment, and release publication to be green on one final head.
