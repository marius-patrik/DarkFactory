# Backlog

This file contains **accepted work that is intentionally deferred**.

Items move to `TODO.md` when their prerequisite is satisfied or they become the next actionable work. Do not implement backlog items opportunistically in unrelated PRs.

## DarkFactory evidence and Practical

Prerequisite: paper foundation accepted and a stable DarkFactory revision selected.

- pin the `darkfactory` submodule to the canonical evaluated revision;
- replace phase-labelled evidence data with a stable evidence manifest;
- validate implementation-specific architecture figures against the pinned revision;
- write the practical DarkFactory chapter from source/docs/tests/workflows/configuration;
- rebuild Results and discussion from that evidence;
- ensure manuscript, evidence manifest, submodule SHA, and CI provenance agree.

## School-guide reconciliation

Prerequisite: stable paper body and direct access to the authoritative guide.

Resolve from the guide itself:
- title-page requirements;
- declaration wording;
- annotation/abstract and keyword requirements;
- bibliography heading;
- pagination;
- length/work-range rules;
- figure/table lists;
- appendices;
- submission artifacts;
- similarity/plagiarism requirements;
- typography details.

Explicit conflict to resolve:
- current working school contract says **no first-line indent** and **8 pt paragraph spacing**;
- current authorial presentation target requests a visible first-line indent and substantially larger inter-paragraph spacing.

## Publication pipeline

Can move to TODO when file ownership does not conflict with active manuscript/web work.

- simplify Makefile and publication scripts around `paper/PAPER.typ`;
- remove unnecessary review-publication machinery if no real consumer remains;
- keep HTML/Markdown exports deterministic;
- simplify site metadata/content indexing around actual headings;
- replace phase-numbered evidence/figure generation with stable naming;
- align validation with durable product invariants;
- align CI/Pages/Release with the final artifact contract.

## Final delivery

Prerequisite: manuscript, evidence, web workbench, and publication pipeline accepted.

- final end-to-end manuscript edit;
- page-by-page PDF inspection;
- complete citation/evidence provenance audit;
- clean-checkout build validation;
- Pages validation;
- release artifact validation from the same accepted commit;
- remove unused assets/data/scripts/workflows;
- publish the canonical final release.
