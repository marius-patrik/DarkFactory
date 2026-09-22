# DarkFactory-Paper — Completion Plan

This file contains only the **current active thesis execution path**. Deferred closure and publication work lives in `BACKLOG.md`.

- Thesis source: `paper/PAPER.typ`
- Durable manuscript rules: `AGENTS.md`
- School contract: `SCHOOL_RULES.md`
- Backlog: `BACKLOG.md`
- Independent IDE lane: `web/PLAN.md`

## Source contract

`paper/PAPER.typ` is the only authored Typst manuscript source.

Supporting resources may live in:
- `paper/bib/`
- `paper/data/`
- `paper/img/`
- `paper/fonts/`

Do not recreate a schema/manifest/concept-file manuscript architecture or another authored thesis `.typ`.

Generated PDF/HTML/Markdown/review/site artifacts are outputs, not sources.

## Work title

**AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory**

## Thesis argument

The manuscript follows one causal argument:

**rapid AI adoption → coding agents remain a small subset of overall use → practices such as Vibe Coding show that access to capable AI is not equivalent to disciplined engineering → model capability is improving rapidly → a harness turns model inference into an agentic runtime → Agentic Engineering is required to use those capabilities deliberately and reliably → DarkFactory realizes those practices → evaluation tests the resulting system and workflow.**

Do not claim that most coding-agent users are vibe coding unless representative evidence supports that exact population-level claim.

## Canonical hierarchy

1. **Úvod**
   - 1.1 Motivace a vymezení problému
   - 1.2 Východisko a argument práce
   - 1.3 Cíle
     - 1.3.1 Hlavní cíl
     - 1.3.2 Dílčí cíle
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
     - 3.1.1 Zadání a způsob práce
     - 3.1.2 Řízení změny
     - 3.1.3 Kvalita a ověřování
     - 3.1.4 Instrukce a kontext
     - 3.1.5 Řízení agentního chování
     - 3.1.6 Orchestrace agentů
   - 3.2 DarkFactory
4. **Výsledky a diskuse**
   - 4.1 Ověření mechanismů
   - 4.2 Ověření systému
   - 4.3 Ověření na repozitářích
   - 4.4 Výzkumné otázky
   - 4.5 Diskuse a omezení
5. **Závěr**

Semantic concept headings are visible but unnumbered and excluded from the printed Contents.

## Article contract

For theory and practical-methodology concepts, use:

**definition → mechanism/description → real sourced example(s) → practical implication**

Requirements:
- one semantic owner for each concept/claim;
- claim-local citations;
- original paper/specification or first-party documentation where available;
- real example where defensible;
- no self-referential definitions such as “v této práci označuje…”;
- no duplicated definition across Theory and Practical;
- no invented product behavior, benchmark values, API behavior, or empirical claims.

## Evidence ownership

**Introduction**
- Gradually adoption/coding-agent evidence
- Vibe Coding motivation/baseline
- Epoch ECI capability trend
- Artificial Analysis v4.3.2 benchmark

**Theory**
- model/representation/inference
- harness mechanisms

**Practical**
- Agentic Engineering practices
- DarkFactory implementation

**Results and discussion**
- observed evidence
- interpretation
- limitations
- research-question answers

## Locked content

### Model / inference
Treat 2.1 as stable unless a concrete factual/source/build defect is found.

Preserve:
- sourced examples and practical implications;
- 2D embedding relation `král − muž + žena ≈ královna`;
- axes **Pohlaví** and **Královský status**;
- 3D pedagogical analogy visualization;
- explicit caveat that shown axes are explanatory projections rather than literal learned dimensions.

### Harness
Agent Loop uses the ReAct cycle:

**Model → Akce → Nástroj/prostředí → Pozorování → Model**

with optional **Model → Výsledek**.

State means persisted currently valid facts/control data. Do not personify it.

Use direct/original source + concrete example for Agent Loop, Session, Transcript, State, Environment, Tools, Tool Calling, Code Execution, Sandbox, Skills, Plugin, Script, Hooks, MCP, `.agents/`, and `.claude/`.

### Practical / Agentic Engineering
Treat §3.1 as stable unless a concrete factual/source/build defect is found.

Workflow Graph and Swarm belong under Practical / Agentic Engineering, not Theory.

### DarkFactory
DarkFactory integration is intentionally backlogged for now. Do not begin §3.2 or implementation-evidence pinning from the active plan.

When promoted, generated/current DarkFactory documentation is the architecture/system-description authority for 3.2. Do not build a competing manual architecture narrative.

## School contract

Use `SCHOOL_RULES.md` for any school-sensitive decision.

Do not substitute IVT maturita-topic requirements for Odborná-práce rules.

The direct school-guide text audit is active in Phase 2 below. Final publication QA remains deferred in `BACKLOG.md`.

## Remaining execution

### Phase 1 — Remove encyclopedia / term index — NEXT

Remove the standalone **Encyklopedie / rejstřík pojmů** from the thesis now, before further manuscript expansion.

Scope:
- remove the encyclopedia/glossary/index-of-terms heading and generated entries;
- remove navigation, index references, backlinks, and back-matter plumbing used only for that section;
- preserve ordinary front-matter keywords and normal in-text terminology;
- do not replace it with another glossary;
- reconcile printed Contents, web/content structure, back matter, and validators;
- keep Theory, §3.1, §3.2, Results, and school formatting substantively unchanged.

Exit:
- no standalone encyclopedia/term index remains in any canonical output;
- no dead links, generated entries, or validator assumptions remain;
- all canonical manuscript/site builds still pass.

### Phase 2 — Direct Odborná-práce guide audit and school-contract reconciliation

Replace the remaining recovered/template-inferred school assumptions with a direct-text audit of the actual school guide.

Primary source already identified in `SCHOOL_RULES.md`:
- `marius-patrik/OdbornaPrace-mono/docs/Pruvodce-tvorbou-odborne-prace-2024.pdf`

Scope:
- inspect the guide itself directly, not only the archived template or README;
- verify the exact declaration wording;
- verify annotation requirements;
- verify the required bibliography heading;
- determine whether English annotation/keywords are mandatory;
- verify submission artifact requirements;
- verify any minimum/maximum page or word-count rule;
- verify any similarity/plagiarism rule or threshold;
- capture any other Odborná-práce requirements not represented by the archived template;
- reconcile `SCHOOL_RULES.md` so it clearly distinguishes verified requirements from any still-unresolved evidence;
- do not import IVT maturita-topic requirements into the Odborná-práce contract;
- make only structural manuscript corrections that are unquestionably required by the verified guide and independent of unfinished DarkFactory/Results content.

Exit:
- `SCHOOL_RULES.md` is grounded directly in the actual guide text rather than relying on unresolved recovered assumptions;
- every previously listed exact-guide uncertainty is resolved where the guide supports an answer;
- any genuinely unsupported item is explicitly marked unsupported rather than guessed;
- final publication QA can later operate from a verified school contract.

## Current-plan exit

The active plan ends after Phase 2.

At that checkpoint:
- Theory is complete;
- Practical Agentic Engineering is complete;
- the standalone encyclopedia / term index is removed;
- the Odborná-práce school contract has been directly audited and reconciled;
- DarkFactory integration/evidence pinning remains intentionally backlogged;
- Results/research-frame completion remains downstream of the backlogged DarkFactory evidence phase;
- thesis-wide closure and final publication QA remain deferred in `BACKLOG.md`.

