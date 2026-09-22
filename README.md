# AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory

Typst-first Odborná práce with a React/TypeScript review workbench.

## Source model

**`paper/PAPER.typ` is the single canonical authored thesis source.**

The former modular Typst manuscript/schema/manifest tree has been retired.

Supporting resources remain external where appropriate:

- `paper/bib/` — bibliography
- `paper/data/` — evidence data
- `paper/img/` — figures/assets
- `paper/fonts/` — fonts

Do not recreate a second authored Typst source tree.

## Target manuscript structure

1. **Úvod**
2. **Teoretická část**
   - 2.1 Jazykový model
   - 2.2 Harness
3. **Praktická část**
   - 3.1 Agentické inženýrství
   - 3.2 DarkFactory
4. **Výsledky a diskuse**
5. **Závěr**

The introduction owns contemporary adoption/capability evidence and the Vibe Coding → Agentic Engineering motivation. Theory explains model/inference/harness mechanisms. Practical explains Agentic Engineering practices and their realization in DarkFactory. Results and discussion own evaluation evidence.

Semantic articles remain unnumbered and excluded from the school PDF Contents.

## Build

```bash
make all BOOK=DarkFactory
make ci BOOK=DarkFactory
```

See:
- `AGENTS.md` — durable manuscript/source contract;
- `PLAN.md` — active thesis execution plan;
- `SCHOOL_RULES.md` — recovered school compliance contract;
- `BACKLOG.md` — unpromoted requests;
- `web/PLAN.md` — separate generic IDE workstream.
