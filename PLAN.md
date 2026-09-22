# DarkFactory-Paper — Execution Plan

`GOAL.md` defines the quality objective for the finished academic paper.

`PRD.md` defines the finished product contract.

This file defines the concrete repository work and sequencing required to satisfy the goal and product contract.

`TODO.md` tracks the current/next actionable queue.

`BACKLOG.md` tracks accepted work that is intentionally deferred until its prerequisite or phase gate is reached.

## Workstream A — Build the paper from the argument

Primary files:
- `paper/PAPER.typ`
- `paper/bib/references.bib`
- `paper/img/**`
- `paper/data/**`

### A1. Establish the manuscript architecture

Use this high-level structure as the working frame:

1. Úvod
2. Teoretická část
   - Jazykový model
   - Harness
   - Agentické inženýrství
3. Praktická část
   - DarkFactory
4. Výsledky a diskuse
5. Závěr

Use lower-level headings only where the argument genuinely benefits from them.

The final detailed structure is judged by reading flow, not by preserving a terminology taxonomy.

### A2. Rebuild the paper around the engineering transition

Use the thesis direction in `PRD.md` as the intellectual spine.

The paper should establish, with only the necessary historical context, the progression:

**IDE-centered development → code completion → integrated chat → integrated agents → agent-first/ADE-style development**

Use that progression to motivate the larger transition:

**software engineering → Agentic Engineering**

and:

**IDE-centered execution → harness-centered execution**

Make the chatbot → agent boundary explicit:
- chatbot: conversational output while the human remains the executor;
- coding agent: iterative repository/environment interaction through a harness, with tools, state, observations, controlled effects, verification, and continuation toward an acceptance condition.

Use that transition to introduce the concrete agent capability surface without turning it into a glossary:
- Tools;
- Skills;
- Hooks;
- MCP;
- state/context management;
- execution observations and verification;
- orchestration.

The theory should then explain only what is needed to support that argument:
- the relevant boundary of model inference;
- why delegated work requires a persistent execution environment;
- how a harness integrates state, tools, environment, effects, observations, verification, recovery, and orchestration;
- how Agentic Engineering reorganizes software-engineering responsibility around agents as implementation executors.

Current theory/visual acceptance decisions:
- keep tokenization conceptual and omit BPE-specific exposition;
- keep the embedding treatment to a concise king/queen example plus `paper/img/vector-embedding-queen.svg`;
- do not use the previous 3D embedding diagram;
- keep Gradually;
- keep ReAct;
- allow workflow graphs for agent workflow planning without DAG-specific discussion;
- keep Vibe Coding and Prompt Injection outside the thesis.

Do not turn the historical progression into a product catalogue.

Do not organize the theory as a terminology taxonomy.

The conceptual emphasis should remain on the changing architecture of software development.

### A3. Build the practical DarkFactory chapter from implementation truth

Use the `darkfactory` submodule as the local evidence source after pinning it to the selected canonical DarkFactory revision.

Before writing practical claims:
- update/fetch the submodule;
- choose one merged canonical DarkFactory revision;
- record that SHA in the evidence manifest;
- read its generated documentation, source, tests, workflows, package boundaries, and configuration;
- derive the practical chapter structure from the implementation.

The practical chapter should explain the architectural decisions that realize the theory, rather than enumerate files/packages.

### A4. Rebuild Results and discussion from evidence

Use a reproducible evidence manifest under `paper/data/`.

The manifest should contain at least:
- DarkFactory repository/ref/SHA;
- target repository/ref/SHA where external repository evidence is used;
- CI/workflow run IDs;
- source/test paths supporting implementation claims;
- evidence category;
- research-question mapping;
- evidence limitations.

Results should be generated from verified evidence, then interpreted in prose.

### A5. Write the framing last

After Theory, DarkFactory, and Results are stable:
- rewrite the Introduction;
- finalize objectives and research questions;
- finalize methodology;
- rewrite Conclusion;
- rewrite Czech annotation/English abstract;
- finalize concise keywords.

This ensures the front/back framing describes the paper that actually exists.

### A6. Curate sources and visuals

For every bibliography entry, figure, and data file:
- identify the claim or argument it supports;
- keep it only if that contribution remains in the paper;
- prefer original research/specifications and first-party technical documentation;
- keep figures only when they communicate evidence/mechanism more effectively than prose.

The final visual set should be intentionally small.

## Workstream B — Simplify the Typst source

Primary file:
- `paper/PAPER.typ`

Target:
- manuscript content;
- citations;
- figures/tables;
- small presentation helpers.

Actions:
- express document structure directly with headings;
- express terminology directly in prose;
- use direct bibliography labels where practical;
- keep only formatting helpers that make the source clearer;
- keep review/comparison behavior outside the manuscript content model;
- keep paragraphs normally breakable;
- start every level-1 and level-2 section on a new page;
- use a visible first-line paragraph indent as the authorial target;
- make inter-paragraph spacing materially larger than intra-paragraph line spacing;
- keep the first-line-indent / paragraph-spacing school-rule conflict explicit until direct guide reconciliation;
- use conventional academic typography.

The source should be easy to read as a manuscript file without understanding a secondary semantic framework.

## Workstream C — Rebuild evidence support

Primary files:
- `darkfactory`
- `paper/data/**`
- `paper/img/components-darkfactory.svg`
- `paper/img/lifecycle-darkfactory.svg`
- `paper/img/docs-pipeline.svg`
- evidence-related scripts under `scripts/`

### C1. Pin DarkFactory

Select the exact DarkFactory revision used by the paper and update the submodule pointer.

The paper and evidence manifest must agree on that SHA.

### C2. Replace phase-labelled evidence data with a stable evidence model

Use a stable filename such as:

`paper/data/darkfactory-evidence.json`

Model evidence by meaning, not implementation phase number.

### C3. Validate architecture figures

For each DarkFactory figure:
- compare it with the pinned implementation;
- regenerate/rewrite it from verified architecture where useful;
- otherwise omit it from the final paper.

### C4. Make evidence rendering deterministic

If generated evidence figures remain useful, provide one clearly named script whose input is the evidence manifest and whose output is deterministic.

Avoid phase-numbered script names.

## Workstream D — Simplify publication/build tooling

Primary files:
- `Makefile`
- `scripts/build_review.py`
- `scripts/build_web_exports.py`
- `scripts/check_build.py`
- `scripts/build_site.py`
- `scripts/fetch_external_assets.py`
- `scripts/render_phase2_evidence.py`
- `scripts/preview_server.py`

### D1. Make the paper root explicit

The canonical manuscript is `paper/PAPER.typ`.

Simplify the Makefile around that contract.

Keep only indirection that still supports a real output.

Target commands should remain simple:
- build the paper;
- export web formats;
- validate;
- build the site;
- clean.

### D2. Make final publication the canonical artifact

Canonical paper outputs:
- PDF;
- HTML;
- Markdown;
- source/project archive;
- compiled single-file Typst artifact if the release contract requires it.

A separate review publication should exist only if a real consumer still requires it.

Git comparison/review belongs primarily to the IDE/workbench rather than requiring a second semantic manuscript.

### D3. Simplify web exports

`scripts/build_web_exports.py` should:
- compile canonical HTML from the same paper source;
- derive Markdown deterministically;
- localize required assets;
- contain no thesis semantic taxonomy assumptions.

### D4. Rewrite build validation around the final contract

`scripts/check_build.py` should validate:
- canonical source exists;
- expected top-level document structure;
- bibliography/citations resolve;
- referenced assets exist;
- generated artifacts exist;
- no manuscript-only semantic registry is required;
- evidence manifest has required provenance;
- DarkFactory SHA in evidence matches the submodule when the practical/evidence phase is complete.

Avoid validation rules that encode individual terms or prose choices.

### D5. Align site generation with the generic IDE

`scripts/build_site.py` should publish:
- the current generic web app;
- canonical paper artifacts;
- repository source tree;
- a simple publication manifest;
- a heading/content index derived from actual structural headings.

The site generator should use the final thesis title and should not require level-4 semantic articles or a second review manuscript.

### D6. Simplify figure/data generation

`scripts/fetch_external_assets.py` should fetch only externally sourced assets still used by the paper, with explicit provenance.

Consolidate deterministic locally rendered figures into clearly named build scripts.

Retire phase-numbered generators once their data model is stable.

## Workstream E — Direct school-guide reconciliation

Primary files:
- `SCHOOL_RULES.md`
- `paper/PAPER.typ`

Read the school PDF directly and resolve:
- title-page content;
- declaration wording;
- Czech/English annotation requirements;
- keywords;
- bibliography heading;
- page numbering;
- work-range/word/character-count requirement;
- figure/table lists;
- appendices;
- submission artifacts;
- page/word limits;
- similarity/plagiarism requirements;
- typography details.

Then encode only verified requirements in `SCHOOL_RULES.md` and the Typst presentation layer.

## Workstream F — Generic IDE completion

Authority:
- `web/PLAN.md`

Keep this work independent from manuscript content.

Complete:
- guided GitHub authentication;
- cross-surface tab drag/drop;
- draggable/persistent root sidebar/panel sizing;
- real-browser acceptance;
- generic workbench validation.

Typst editing remains source editing through Monaco.

Canonical paper compilation remains a repository pipeline responsibility.

## Workstream G — Workflow and release cleanup

Primary files:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-docs.yml`
- `.github/workflows/release.yml`
- `.github/workflows/agent.yml`

Final workflow responsibilities:

### CI
Validate:
- paper build;
- exports;
- evidence/provenance;
- generic web build/tests;
- repository consistency.

### Pages
Publish:
- generic IDE/site;
- canonical paper artifacts;
- publication/repository metadata required by the IDE.

### Release
Publish the canonical submission/publication artifact set tied to an exact commit SHA.

### Automation surface
Keep only repository-triggered automation that serves the final product.

Use minimal permissions and simple triggers.

## Execution order

### Phase 1 — Paper foundation
Active until the theoretical and editorial foundation is stable enough that later work can focus on DarkFactory evidence rather than redesigning the thesis argument.

- rewrite the paper around the IDE → harness and Software Engineering → Agentic Engineering transition;
- use only light, sourced history for IDE → completion → chat → agents → agent-first/ADE development;
- keep model theory proportionate to the runtime/engineering argument;
- simplify `paper/PAPER.typ`;
- curate bibliography/figures alongside the rewrite;
- establish clean academic typography, including page starts for all level-1/2 sections and the intended paragraph rhythm;
- keep Practical as a clean DarkFactory boundary until evidence is pinned;
- keep validators editorially generic rather than hard-coding level-2/3 prose structure;
- re-read the generated PDF end-to-end before accepting the phase.

Deliver as a PR for review.

### Phase 2 — DarkFactory evidence + Practical
Begins from a stable DarkFactory revision.

- pin submodule;
- build evidence manifest;
- validate architecture;
- write Practical;
- refresh Results.

Deliver as a PR for review.

### Phase 3 — Framing + school reconciliation
After the body/evidence are stable.

- finalize Introduction/objectives/RQs/methodology;
- finalize Conclusion;
- finalize abstract/annotation/keywords;
- complete direct guide audit;
- finalize typography/front/back matter.

Deliver as a PR for review.

### Phase 4 — Publication pipeline
Can overlap with Phases 1–3 where file ownership is independent.

- simplify Makefile/scripts;
- align site manifest/content index;
- establish canonical artifact set;
- add compiled single-file Typst generation if required;
- make validators test the final repository contract.

Deliver as a PR for review.

### Phase 5 — IDE + workflows
Runs independently where possible.

- finish `web/PLAN.md`;
- simplify CI/Pages/Release workflows around the final commands/artifacts;
- keep paper and IDE validation in one canonical CI gate.

Deliver as a PR for review.

### Phase 6 — Final integration
After all review PRs are accepted.

- re-read the final paper end-to-end;
- verify every factual claim/citation/evidence link;
- verify DarkFactory SHA/provenance;
- run the complete build/site/release matrix;
- inspect final PDF page by page;
- validate Pages;
- validate release assets from one final commit;
- keep the final repository free of unused paper assets, data, scripts, and workflow paths.

## Review gates

Every implementation phase ends in an open PR.

Workers do not merge their own PRs.

A PR is ready for review only when its relevant validation passes and its diff contains only its owned workstream.

## Canonical validation target

The final repository should support a small, obvious command surface that covers:

- canonical publication build;
- repository validation;
- generic web validation;
- Pages build;
- release artifact generation.

The exact command names may be simplified during Workstream D, but CI and documentation must use the same canonical commands.
