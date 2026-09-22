# Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory

Typst-first Odborná práce with a generic React/TypeScript GitHub workbench.

## Source model

**`paper/PAPER.typ` is the single canonical authored thesis source.**

The former modular Typst manuscript/schema/manifest/concept tree is retired.

Supporting resources remain external where appropriate:

- `paper/bib/` — bibliography
- `paper/data/` — evidence data
- `paper/img/` — figures/assets
- `paper/fonts/` — fonts

Do not recreate a second authored Typst source tree.

## Target manuscript structure

1. **Úvod**
   - 1.1 Motivace a vymezení problému
   - 1.2 Cíl práce a výzkumné otázky
   - 1.3 Metodika
2. **Teoretická část**
   - 2.1 Jazykový model
   - 2.2 Harness
   - 2.3 Agentické inženýrství
3. **Praktická část**
   - 3.1 DarkFactory
4. **Výsledky a diskuse**
5. **Závěr**

The thesis is written as continuous academic prose rather than per-term semantic articles. Theory establishes model, harness, and Agentic Engineering foundations. Practical is reserved for the actual DarkFactory architecture/implementation. Results and discussion evaluate pinned implementation/system/repository evidence.

The detailed editorial structure, keep/cut decisions, and active execution order live in `PLAN.md`.

## Build

```bash
make all BOOK=DarkFactory
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

See:
- `AGENTS.md` — durable source/editorial contract;
- `PLAN.md` — active thesis execution plan;
- `SCHOOL_RULES.md` — recovered school compliance contract;
- `BACKLOG.md` — deferred thesis work;
- `web/PLAN.md` — separate generic IDE workstream.
