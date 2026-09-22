# TODO

This file is the **live current/next work queue**.

Keep it short and current. Durable product requirements belong in `PRD.md`; roadmap and sequencing belong in `PLAN.md`; deferred accepted work belongs in `BACKLOG.md`.

## In flight

### Evidence correction before finalizing Practical

- Select and inspect the historical Python pipeline revision requested by the author. The earlier editorial pass labelled `e9c10221` as that baseline without verifying the boundary; it also contains TypeScript components. Reconcile the submodule, manifest, Practical, abstracts and Results after selection, and do not attribute TypeScript test evidence to the Python pipeline.
- Complete the methodology with exact source/test paths, commands and run provenance from that selected revision. Its current procedural description is not yet a complete reproduction protocol.
- The objective now replaces O1–O3; methodology belongs under Practical, as verified directly in `SCHOOL_RULES.md`.

### Paper foundation — PR #151

Wait for the active worker to finish its current pass, then review the resulting PR against the latest `main`, `GOAL.md`, `PRD.md`, and `PLAN.md`.

Do not move the branch underneath the worker while it is active.

Queued review requirements after reviewing the completed worker pass:
- pull/rebase from latest `main` before the next dispatch;
- explicitly distinguish a chatbot from a coding agent and use that boundary to strengthen the Gradually motivation;
- use the IDE → completion → chat → agent → agent-first/ADE history to introduce what real coding agents can do;
- reframe Agentic Engineering specifically as the engineering practices that make AI-assisted software engineering efficient, controlled, repeatable, and scalable;
- cover prompt engineering, context engineering, explicit goals/specifications/acceptance criteria, goal loops, verification feedback, tool/harness engineering, and human review/integration;
- cover multi-agent orchestration beyond simple subagents: parallel workers, coordinator patterns, swarms, and graph/workflow-based execution where these materially help explain scalable agentic work;
- explain Tools, Skills, Hooks, and MCP concisely as capabilities supplied/integrated by the harness, alongside state/context, verification, and orchestration;
- use PRD heading pagination; parent-only Theory and Practical headings share a page with their first subsection;
- use a visible first-line paragraph indent and noticeably larger inter-paragraph spacing, subject to direct school-guide reconciliation;
- tokenization remains conceptual; BPE-specific exposition is already absent and must stay absent;
- restore the embedding treatment to one concise king/queen example plus `paper/img/vector-embedding-queen.svg`;
- do not use the 3D embedding diagram;
- keep Gradually;
- keep ReAct;
- keep the school logo;
- keep Vibe Coding absent;
- keep Prompt Injection absent;
- keep DAG absent;
- workflow graphs may remain for agent workflow planning;
- keep validators independent from exact level-2/3 editorial structure;
- remove the current future-work/process paragraph from `3.1 DarkFactory` and keep the section as a clean boundary until the evidence phase;
- do not treat the current provisional Results as final: the revised O1/O2/O3 no longer map cleanly to the existing result paragraphs and must be rebuilt from pinned evidence in Phase 2;
- update the PR description after the next pass; it is currently stale relative to the actual manuscript and visual set.

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
