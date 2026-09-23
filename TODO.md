# TODO

This file is the **live current/next work queue**.

Keep it short and current. Durable product requirements belong in `PRD.md`; roadmap and sequencing belong in `PLAN.md`; deferred accepted work belongs in `BACKLOG.md`.

## In flight

### Evidence correction before finalizing Practical

- Select and inspect the historical Python pipeline revision requested by the author. The earlier editorial pass labelled `e9c10221` as that baseline without verifying the boundary; it also contains TypeScript components. Reconcile the submodule, manifest, Practical, abstracts and Results after selection, and do not attribute TypeScript test evidence to the Python pipeline.
- Complete the methodology with exact source/test paths, commands and run provenance from that selected revision. Its current procedural description is not yet a complete reproduction protocol.
- The objective now replaces O1–O3; methodology belongs under Practical, as verified directly in `SCHOOL_RULES.md`.


### Publication pipeline

- Replace Make/Python orchestration with the root Bun workspace without a compatibility path.
- Validate the final PDF/HTML/Markdown publication set, generic web checks, Chromium acceptance, Pages assembly, and exact-revision release workflow.

## Next after paper foundation acceptance

1. Pin the canonical DarkFactory revision.
2. Build the stable evidence manifest.
3. Inspect source, generated docs, tests, workflows, configuration, and architecture from that exact revision.
4. Write the DarkFactory practical chapter from implementation truth.
5. Rebuild Results/discussion and research-question answers from the pinned evidence.
6. Reconcile the Introduction/Conclusion/abstract/keywords against the now-complete body.
7. Perform the direct school-guide audit, including the current first-line-indent and paragraph-spacing conflict.

## Coordination hygiene

After each worker or review cycle:
- remove completed items from this file;
- promote newly actionable items from `BACKLOG.md`;
- update `PRD.md` when a durable requirement changes;
- update `PLAN.md` when sequencing or workstream ownership changes;
- keep `README.md` and `AGENTS.md` aligned with the document model.
