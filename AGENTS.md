# Repository instructions — AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory

`main.typ` is the **single canonical authored Typst source** of the thesis.

`PLAN.md` owns active sequencing.
`SCHOOL_RULES.md` owns the recovered Odborná-práce compliance contract.

## Source architecture

Do not recreate the retired modular Typst architecture.

The only authored thesis Typst file is `main.typ`.

External supporting resources may remain in:
- `DarkFactory/bib/`
- `DarkFactory/data/`
- `DarkFactory/img/`
- `DarkFactory/fonts/`

There must be no parallel schema/manifests/concept/template tree that independently owns thesis prose or structure.

Edit `main.typ` directly.

## Canonical title

**AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory**

## Canonical hierarchy

1. **Úvod**
   - 1.1 Motivace a vymezení problému
   - 1.2 Východisko a argument práce
   - 1.3 Cíle
   - 1.4 Výzkumné otázky
   - 1.5 Metodika
   - 1.6 Struktura práce
2. **Teoretická část**
   - 2.1 Jazykový model
     - 2.1.1 Architektura a reprezentace
     - 2.1.2 Inference
   - 2.2 Harness
     - 2.2.1 Smyčka a stav
     - 2.2.2 Prostředí a nástroje
     - 2.2.3 Rozšíření
3. **Praktická část**
   - 3.1 Agentické inženýrství
   - 3.2 DarkFactory
4. **Výsledky a diskuse**
5. **Závěr**

## Evidence ownership

Introduction owns Gradually, Vibe Coding, Epoch, and the Artificial Analysis benchmark.

Theory owns model/representation/inference/harness mechanisms.

Practical owns Agentic Engineering practices and DarkFactory.

Results and discussion own evaluation evidence and interpretation.

Vibe Coding is not a standalone Practical article.

## Semantic article contract

The old schema implementation is retired, but the writing contract remains.

Each semantic article in `main.typ` should contain:
1. concise definition;
2. mechanism/description;
3. real sourced example(s) where defensible;
4. practical implication.

Structural headings are numbered and included in school Contents.
Semantic article headings remain unnumbered and excluded from school Contents.

Do not recreate schema/manifests to encode this.

## Source rules

Prefer original papers/specifications and first-party technical documentation.

External factual/mechanistic claims require claim-local citations.

Avoid self-referential definitions such as “v této práci označuje…”.

Do not generalize survey findings beyond their measured population.

DarkFactory-specific claims must come from current code/docs/tests/workflows.

## Locked content constraints

- Preserve accepted 2D/3D embedding figures and caveats.
- Agent Loop uses the ReAct cycle: **Model → Akce → Nástroj/prostředí → Pozorování → Model**, optionally Model → Výsledek.
- State is persisted current facts/control data; do not personify it.
- Use direct/original sources for Harness mechanisms.
- Workflow Graph / Swarm belong in Practical / Agentic Engineering orchestration.

## School compliance

Use `SCHOOL_RULES.md`.

Do not import IVT maturita-topic formatting requirements as Odborná-práce rules unless independently present in the actual guide.

## Build and validation

Canonical checks:

```bash
make all BOOK=DarkFactory
make ci BOOK=DarkFactory
```

Validation operates against `main.typ`, not deleted modular sources.

Eventually validate:
- exactly one authored thesis Typst source;
- exact top-level 1–5 hierarchy;
- correct Theory/Practical nesting;
- semantic articles unnumbered/excluded from Contents;
- Vibe Coding owned by Introduction;
- benchmark owned by Introduction;
- bibliography/data/assets resolve;
- no duplicate architecture narrative;
- school rules from `SCHOOL_RULES.md`.

Keep README, AGENTS and PLAN synchronized with this single-file architecture.
