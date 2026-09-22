# Repository instructions — Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory

`paper/PAPER.typ` is the **single canonical authored Typst source** of the thesis.

`PLAN.md` owns active sequencing and the detailed editorial specification.
`SCHOOL_RULES.md` owns the recovered Odborná-práce compliance contract.
`BACKLOG.md` owns deferred thesis work.
`web/PLAN.md` owns the independent generic IDE workstream.

## Source architecture

Do not recreate the retired modular Typst architecture.

The only authored thesis Typst file is `paper/PAPER.typ`.

External supporting resources may remain in:
- `paper/bib/`
- `paper/data/`
- `paper/img/`
- `paper/fonts/`

There must be no parallel schema, manifests, concept-file tree, generated manuscript source, or second authored thesis `.typ`.

Edit `paper/PAPER.typ` directly.

## Canonical title

**Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory**

## Canonical hierarchy

Maximum numbered heading depth is 3.

1. **Úvod**
   - 1.1 Motivace a vymezení problému
   - 1.2 Cíl práce a výzkumné otázky
   - 1.3 Metodika
2. **Teoretická část**
   - 2.1 Jazykový model
     - 2.1.1 Architektura a reprezentace
     - 2.1.2 Inference a kontext
   - 2.2 Harness
     - 2.2.1 Smyčka a stav
     - 2.2.2 Prostředí a nástroje
     - 2.2.3 Rozšíření
   - 2.3 Agentické inženýrství
     - 2.3.1 Zadání a plánování
     - 2.3.2 Řízení změny a ověřování
     - 2.3.3 Instrukce, kontext a autonomie
     - 2.3.4 Orchestrace
3. **Praktická část**
   - 3.1 DarkFactory
4. **Výsledky a diskuse**
   - 4.1 Ověření implementace a systému
   - 4.2 Ověření na repozitářích
   - 4.3 Odpovědi na výzkumné otázky
   - 4.4 Diskuse a omezení
5. **Závěr**

Agentické inženýrství is Theory. Practical is reserved for the actual DarkFactory architecture/implementation.

Do not invent `3.1.x` DarkFactory subsections until the deferred evidence phase pins the canonical implementation and architecture.

## Writing contract

The thesis must read as one continuous academic argument, not as a catalogue of concepts.

- headings are for real document structure only;
- no per-term headings;
- no standalone definition cards;
- no explicit **Praktický význam** blocks;
- introduce necessary terms inline and only to the depth required by the argument;
- remove prose that merely announces sections, repeats obvious implications, or fills space;
- every paragraph must advance the argument, explain a required mechanism, present/interpret evidence, establish a limitation, or make a substantive causal transition;
- prefer concrete subjects and verbs;
- avoid “Tato práce…”, “V této části…”, “Následující kapitola…” and equivalent metadiscourse unless genuinely necessary;
- preserve claim-local citations for factual/external claims;
- synthesize sources into prose rather than structuring prose around one source/example per paragraph;
- explain evidence/mechanisms once at their semantic owner and use the result later without redefining it.

The detailed section-by-section keep/cut/rewrite specification in `PLAN.md` is authoritative.

## Locked editorial constraints

Keep:
- Gradually adoption figure;
- Epoch ECI capability-trend figure;
- ReAct action/observation mechanism and diagram;
- finite active context versus persistent external state;
- concise Session / Transcript / State distinction;
- model-requested tool use versus harness-executed effects;
- sandbox/permission boundary;
- specification/planning, controlled change, deterministic verification, context management, autonomy controls, and orchestration as the Agentic Engineering methodology.

Remove or do not preserve:
- Karpathy tweet screenshot;
- Artificial Analysis benchmark table/model-ranking detour;
- both embedding diagrams;
- Claude Code and Antigravity UI screenshots;
- separate Provider / Inference Engine / Temperature / KV Cache theory articles;
- Plugin / Script / `.agents/` / `.claude/` as independent theory topics;
- Slop as a formal concept;
- Kimi/Swarm discussion unless future pinned DarkFactory evidence makes it materially necessary;
- standalone encyclopedia/glossary/term index;
- semantic term registry/stars/backlinks;
- review/diff/callout manuscript abstractions.

## Evidence/source rules

Prefer original papers/specifications and first-party technical documentation.

External factual/mechanistic claims require claim-local citations.

Do not generalize survey findings beyond their measured population.

DarkFactory-specific implementation claims must come from current pinned code/docs/tests/workflows during the deferred DarkFactory evidence phase.

Do not describe intended architecture as implemented fact.

## School compliance

Use `SCHOOL_RULES.md`.

Do not import IVT maturita-topic formatting requirements as Odborná-práce rules unless independently present in the actual guide.

Where the school contract is still unresolved, do not guess; defer the exact choice to the direct guide-text audit in `PLAN.md`.

## Build and validation

Canonical checks:

```bash
make all BOOK=DarkFactory
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

Validation must operate against `paper/PAPER.typ`.

Keep `README.md`, `AGENTS.md`, `PLAN.md`, and `BACKLOG.md` synchronized with the final single-source architecture and hierarchy.
