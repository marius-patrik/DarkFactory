# TODO

This file is the **live current/next work queue**.

Keep it short and current. Durable product requirements belong in `PRD.md`; roadmap and sequencing belong in `PLAN.md`; deferred accepted work belongs in `BACKLOG.md`.

## In flight

### Paper foundation — PR #151

Wait for the active worker to finish its current pass, then review the resulting PR against the latest `main`, `GOAL.md`, `PRD.md`, and `PLAN.md`.

Do not move the branch underneath the worker while it is active.

Queued review requirements if the active pass does not already satisfy them:
- pull/rebase from latest `main` before the next dispatch;
- every level-1 and level-2 section starts on a new page;
- use a visible first-line paragraph indent and noticeably larger inter-paragraph spacing, subject to direct school-guide reconciliation;
- tokenization remains conceptual; remove BPE-specific exposition;
- keep the embedding treatment to one concise king/queen example plus `paper/img/vector-embedding-queen.svg`;
- do not use the 3D embedding diagram;
- keep Gradually;
- keep ReAct;
- keep the school logo;
- keep Vibe Coding absent;
- keep Prompt Injection absent;
- keep DAG absent;
- workflow graphs may remain for agent workflow planning;
- keep validators independent from exact level-2/3 editorial structure.

### Generic IDE

Wait for the independently dispatched web worker to finish the remaining `web/PLAN.md` lane.

Review its PR separately from manuscript work.

## Next after paper foundation acceptance

1. Pin the canonical DarkFactory revision.
2. Build the stable evidence manifest.
3. Inspect source, generated docs, tests, workflows, configuration, and architecture from that exact revision.
4. Write the DarkFactory practical chapter from implementation truth.
5. Rebuild Results/discussion and research-question answers from the pinned evidence.
6. Reconcile the Introduction/Conclusion/abstract/keywords against the now-complete body.
7. Perform the direct school-guide audit, including the current first-line-indent and paragraph-spacing conflict.
8. Continue publication-pipeline cleanup and final integration according to `PLAN.md`.

## Coordination hygiene

After each worker or review cycle:
- remove completed items from this file;
- promote newly actionable items from `BACKLOG.md`;
- update `PRD.md` when a durable requirement changes;
- update `PLAN.md` when sequencing or workstream ownership changes;
- keep `README.md` and `AGENTS.md` aligned with the document model.
