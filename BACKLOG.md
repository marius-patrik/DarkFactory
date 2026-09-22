# Backlog

This file is a parking lot for requests that are not part of the active thesis plan or the IDE workstream.

## Rules

- `PLAN.md` is the active thesis execution plan.
- `web/PLAN.md` is the separate generic IDE workstream plan.
- `SCHOOL_RULES.md` is the recovered Odborná-práce compliance contract.
- Items here are inactive until explicitly promoted.

## Requests

### Remove encyclopedia / term index

- Remove the **Encyklopedie / rejstřík pojmů** section from the thesis entirely.
- The final manuscript should not contain a standalone encyclopedia/glossary/index-of-terms section.
- Remove its heading, generated entries, navigation/index references, and any back-matter plumbing used only for it.
- Preserve ordinary front-matter keywords and normal term usage in the manuscript.
- Do not replace it with another glossary unless explicitly requested.
- Reconcile TOC/web structure/back matter and validators when promoted.

### Thesis-wide closure

Deferred final manuscript-content pass after the active plan reaches its current-plan exit.

Scope:
- deduplicate across Introduction / Theory / Practical / DarkFactory / Results;
- audit factual claims and citations;
- remove unused bibliography records;
- finalize Chapter 5 Závěr;
- finalize Czech/English annotation material as required by the school contract;
- finalize keywords;
- **remove the encyclopedia / term-index section rather than finalizing it**;
- finalize remaining back matter;
- verify terminology and cross-references;
- ensure no new factual material appears only in Conclusion.

Exit when promoted:
- manuscript content is substantively final;
- only publication/school-format defects remain.

### Odborná-práce publication QA

Deferred final publication/compliance phase.

Before implementation:
- complete the direct-text audit of the actual Odborná-práce school guide;
- reconcile `SCHOOL_RULES.md` with the verified guide text.

Then:
- apply exact title-page, declaration, annotation, bibliography, pagination, typography, figures/tables, appendices, and submission rules;
- validate source/output paths;
- generate every required submission artifact confirmed by the guide;
- run final PDF/HTML/Markdown/review/site builds;
- inspect the final PDF page by page;
- fix presentation-only defects;
- require CI, Deploy Documentation, and Release green on the same final head.

Exit when promoted:
- school compliance is verified against the actual Odborná-práce guide;
- all canonical artifacts and publication workflows are green on one final commit.
