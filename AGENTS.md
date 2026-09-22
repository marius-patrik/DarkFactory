# Repository instructions — Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory

`paper/PAPER.typ` is the single canonical authored Typst thesis source.

- `PLAN.md` defines the active editorial/execution phase.
- `SCHOOL_RULES.md` defines the school-compliance contract.
- `BACKLOG.md` defines deferred thesis work.
- `web/PLAN.md` defines the independent generic IDE workstream.

## Source model

Author thesis prose directly in `paper/PAPER.typ`.

Supporting resources may live in:
- `paper/bib/`
- `paper/data/`
- `paper/img/`
- `paper/fonts/`

Keep manuscript ownership singular: one authored Typst source plus supporting resources.

## Canonical hierarchy

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

Maximum numbered heading depth is 3.

Agentic Engineering belongs to Theory. Practical is reserved for the verified DarkFactory architecture and implementation.

## Editorial contract

Write one connected academic argument.

- headings represent real document structure;
- terminology is introduced inline where needed;
- paragraphs advance the argument, explain required mechanisms, present/interpret evidence, establish limitations, or carry substantive transitions;
- wording stays concise and concrete;
- sources support claims locally;
- original research/specifications and first-party technical documentation are preferred;
- repeated mechanisms are explained once at their semantic owner;
- factual claims stay within the scope of their evidence.

The detailed section-by-section specification in `PLAN.md` is authoritative.

## Visual contract

The active rewrite retains:
- Gradually adoption evidence;
- Epoch ECI capability evidence;
- ReAct loop diagram.

Later DarkFactory/evaluation figures are added only when verified evidence supports them.

## School contract

Use `SCHOOL_RULES.md` for school-sensitive formatting and front/back matter.

Unresolved school requirements are finalized during the direct guide-text phase.

## Validation

Canonical checks:

```bash
make all BOOK=DarkFactory
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

The active manuscript phase ends in a pull request against `main` for review. The implementation worker does not merge it.
