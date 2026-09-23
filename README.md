# DarkFactory-Paper

**Agentický Inženýrství - DarkFactory: pipeline pro automatizaci softwarového vývoje**

Typst thesis source, reproducible evidence, publication tooling, and generic GitHub workbench for the DarkFactory academic project.

## Repository model

- `GOAL.md` — final-paper quality objective
- `PRD.md` — finished product requirements and acceptance contract
- `PLAN.md` — roadmap, workstreams, sequencing, and phase gates
- `TODO.md` — live current/next work queue
- `BACKLOG.md` — accepted deferred work
- `AGENTS.md` — durable contributor rules and document ownership
- `SCHOOL_RULES.md` — school-compliance contract
- `paper/PAPER.typ` — single canonical authored thesis source
- `paper/bib/` — bibliography
- `paper/data/` — reproducible evidence data
- `paper/img/` — paper figures/assets
- `darkfactory` — pinned DarkFactory implementation source
- `web/` — generic GitHub IDE/workbench
- `web/PLAN.md` — IDE execution plan

## Tooling

The repository root is a Bun workspace. Typst remains the document compiler; Bun is the package manager and task runner for publication, the web workspace, Pages assembly, and CI.

Requirements:
- Bun
- Typst

Canonical commands:

```sh
bun install
bun run publication
bun run check
bun run site
```

`bun run publication` builds the final publication set from `paper/PAPER.typ`:

- `out/prace.pdf`
- `out/prace.html`
- `out/prace.md`

There is no parallel review-publication build. Review and comparison are workbench/Git concerns rather than a duplicate manuscript artifact.

## Direction

The thesis is developed toward the final-paper quality standard in `GOAL.md` and the thesis-specific direction in `PRD.md`, centered on the transition from conversational AI assistance to agentic execution, from IDE-centered development to harness-centered execution, and on Agentic Engineering as the practices that make AI-assisted software engineering efficient and controllable.

The paper source stays simple, practical claims come from pinned implementation evidence, and CI, Pages, and Release invoke the same root Bun workspace commands.
