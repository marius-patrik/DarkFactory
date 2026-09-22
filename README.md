# DarkFactory-Paper

**Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory**

Typst thesis source, evidence, publication pipeline, and generic GitHub workbench for the DarkFactory academic project.

## Repository model

- `GOAL.md` — final-paper quality objective
- `PRD.md` — finished product requirements and acceptance contract
- `PLAN.md` — roadmap, workstreams, sequencing, and phase gates
- `TODO.md` — live current/next work queue
- `BACKLOG.md` — accepted deferred work
- `AGENTS.md` — durable contributor rules and document ownership
- `SCHOOL_RULES.md` — school-compliance contract
- `paper/PAPER.typ` — canonical authored thesis source
- `paper/bib/` — bibliography
- `paper/data/` — reproducible evidence data
- `paper/img/` — paper figures/assets
- `darkfactory` — pinned DarkFactory implementation source
- `web/` — generic GitHub IDE/workbench
- `web/PLAN.md` — IDE execution plan

## Direction

The thesis is developed toward the final-paper quality standard in `GOAL.md` and the thesis-specific direction in `PRD.md`, centered on the transition from conversational AI assistance to agentic execution, from IDE-centered development to harness-centered execution, and on Agentic Engineering as the practices that make AI-assisted software engineering efficient and controllable.

The repository/product requirements are defined in `PRD.md`.

Implementation sequencing lives in `PLAN.md`; the active queue lives in `TODO.md`; deferred accepted work lives in `BACKLOG.md`.

The paper source stays simple, practical claims come from pinned implementation evidence, and the publication pipeline generates the canonical paper/site/release artifacts reproducibly.
