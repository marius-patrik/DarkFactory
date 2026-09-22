# Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory

Typst-first Odborná práce with a generic React/TypeScript GitHub workbench.

## Thesis source

`paper/PAPER.typ` is the single canonical authored thesis source.

Supporting resources:
- `paper/bib/` — bibliography
- `paper/data/` — evidence data
- `paper/img/` — figures/assets
- `paper/fonts/` — fonts

## Manuscript structure

1. Úvod
2. Teoretická část
   - 2.1 Jazykový model
   - 2.2 Harness
   - 2.3 Agentické inženýrství
3. Praktická část
   - 3.1 DarkFactory
4. Výsledky a diskuse
5. Závěr

The manuscript is written as continuous academic prose. Theory establishes model, harness, and Agentic Engineering foundations. Practical is reserved for the verified DarkFactory architecture and implementation. Results and discussion evaluate implementation, system, and repository evidence.

## Build

```bash
make all BOOK=DarkFactory
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

## Coordination

- `AGENTS.md` — durable source/editorial contract
- `PLAN.md` — active thesis phase
- `SCHOOL_RULES.md` — school-compliance contract
- `BACKLOG.md` — deferred thesis phases
- `web/PLAN.md` — generic IDE workstream
