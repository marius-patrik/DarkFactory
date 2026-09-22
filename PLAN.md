# DarkFactory-Paper — Completion Plan

This file contains only the remaining execution path to the final **Odborná práce**.

Durable manuscript rules live in `AGENTS.md`.
Recovered school-format rules live in `SCHOOL_RULES.md`.
Unpromoted future requests live in `BACKLOG.md`.
The generic IDE workstream is separate in `IDE_PLAN.md`.

## Canonical source architecture

The thesis has been fully consolidated.

**`main.typ` is the single canonical authored Typst source of the thesis.**

There is no modular manuscript/schema/manifest source tree anymore.

Current repository contract:

```text
main.typ                         canonical thesis source
DarkFactory/bib/                 bibliography data
DarkFactory/data/                checked-in evidence data
DarkFactory/img/                 figures/assets
DarkFactory/fonts/               publication fonts
scripts/                         build/export/validation helpers
web/                             generic review/IDE application
```

Rules:

- all thesis prose, structure, semantic articles, review helpers, template logic, front matter, back matter, and Typst publication logic are edited directly in `main.typ`;
- do not recreate `DarkFactory/index.typ`, schema files, concept files, section manifests, template modules, or another parallel authored Typst tree;
- do not regenerate `main.typ` from retired modular sources;
- bibliography/data/assets remain external where appropriate and may be referenced by `main.typ`;
- generated PDF/HTML/Markdown/review outputs remain artifacts, not authored sources;
- a future decomposition is out of scope unless explicitly requested.

The consolidation landed at:

`de82d8ac72bd6f0afee5b64e8dd019432b22b699`

and CI, Deploy Documentation, and Release all passed on that exact commit.

## Working mode

Implementation is delegated task-by-task to side agents.

Every task must:
- start from latest `main`;
- read `AGENTS.md`, `PLAN.md`, and `SCHOOL_RULES.md`;
- treat `main.typ` as the only thesis Typst source;
- preserve accepted sourced content unless a concrete defect is found;
- use primary/original or first-party technical sources for factual claims;
- run relevant builds/validation;
- commit its work;
- report SHA, changed files, validation, PDF inspection, and unresolved issues.

The coordinating session owns `PLAN.md`.

## Work title

**AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory**

## Central argument

The introduction must establish one coherent argument:

**AI adoption is rapidly expanding → actual coding-agent use remains a small fraction of overall generative-AI use → practices such as Vibe Coding show that access to capable systems is not equivalent to disciplined engineering → model capability is also advancing rapidly → effective and reliable use therefore requires deliberate Agentic Engineering around the model and harness.**

This leads directly to the work structure:

- the **theoretical part** explains how modern agentic systems operate;
- the **practical part** explains how to use them effectively for software engineering;
- **DarkFactory** is the concrete harness in which those practices are implemented;
- **Results and discussion** evaluate the implementation and practices.

Do not claim that “most coding-agent users are vibe coding” unless representative evidence actually supports that population-level statement.

## Canonical macrostructure

1. **Úvod**
2. **Teoretická část**
3. **Praktická část**
4. **Výsledky a diskuse**
5. **Závěr**

Appendices follow where applicable.

## Target hierarchy

### 1 Úvod

#### 1.1 Motivace a vymezení problému

Owns the complete contemporary motivation/evidence chain:

- Gradually AI-adoption / coding-agent evidence;
- Vibe Coding as a sourced contemporary practice/baseline;
- Epoch ECI capability-development evidence;
- Artificial Analysis v4.3.2 frontier-model snapshot;
- transition from access/capability to the need for Agentic Engineering.

The evidence must read as one argument, not four unrelated inserts.

#### 1.2 Východisko a argument práce

Establish:
- model capability alone is not a complete agentic system;
- a harness supplies the loop, state, tools, environment, and extension mechanisms;
- effective software-engineering use further requires deliberate engineering practice.

#### 1.3 Cíle
- **1.3.1 Hlavní cíl**
- **1.3.2 Dílčí cíle**

#### 1.4 Výzkumné otázky

Questions must map directly to evidence available later in Results.

#### 1.5 Metodika

Explain:
- literature/specification review for Theory;
- synthesis of Agentic Engineering practices for Practical;
- implementation in DarkFactory;
- empirical/CI/repository evidence used for evaluation.

Vibe Coding may be used as a sourced methodological contrast.

#### 1.6 Struktura práce

Briefly explain Theory → Practical → Results/Discussion → Conclusion.

### 2 Teoretická část

Theory contains only concepts required to understand **how agentic systems operate**.

#### 2.1 Jazykový model

##### 2.1.1 Architektura a reprezentace

Unnumbered semantic articles in this exact order:
1. Velký jazykový model (LLM)
2. Transformer
3. Tokenizér
4. Token
5. Vektorová reprezentace (Embedding)

##### 2.1.2 Inference

Unnumbered semantic articles:
1. Poskytovatel modelu (Model Provider)
2. Inferenční engine (Inference Engine)
3. Teplota (Temperature)
4. Kontextové okno (Context Window)
5. Mezipaměť klíčů a hodnot (KV Cache)
6. Degradace kontextu (Context Rot)

The completed Model/Inference prose and embedding figures are accepted. Do not rewrite them merely because their hierarchy changes.

The current Artificial Analysis benchmark moves to 1.1.

#### 2.2 Harness

##### 2.2.1 Smyčka a stav
- Agentní smyčka (Agent Loop)
- Agentní sezení (Session)
- Přepis (Transcript)
- Stav (State)

##### 2.2.2 Prostředí a nástroje
- Prostředí agenta (Agent Environment)
- Nástroje (Tools)
- Vyvolávání nástrojů (Tool Calling)
- Spouštění kódu (Code Execution)
- Izolované prostředí (Sandbox)

##### 2.2.3 Rozšíření
- Dovednosti (Skills)
- Plugin
- Skript
- Hooks
- MCP
- .agents/
- .claude/

### 3 Praktická část

Practical owns **how to use agentic systems effectively for software engineering** and the concrete implementation.

#### 3.1 Agentické inženýrství

##### 3.1.1 Zadání a způsob práce
- Vývoj řízený specifikací (Spec-Driven Development)
- Plánování (Planning)
- Revize (Review)

##### 3.1.2 Řízení změny
- Správa verzí (Version Control)
- Větev (Branch)
- Pull Request

##### 3.1.3 Kvalita a ověřování
- Slop
- Průběžná integrace (CI)
- Integrační test (Integration Test)

##### 3.1.4 Instrukce a kontext
- Promptové inženýrství (Prompt Engineering)
- Systémový prompt (System Prompt)
- AGENTS.md
- CLAUDE.md
- Kontextové inženýrství (Context Engineering)
- Vkládání kontextu (Context Injection)
- Kompakce kontextu (Context Compaction)
- RAG
- Prompt Injection

##### 3.1.5 Řízení agentního chování
- Cílené smyčky (Goal Loops)
- Guardrail
- Člověk ve smyčce (HITL)

##### 3.1.6 Orchestrace agentů
- Subagent
- Orchestrátor
- Předání řízení (Handoff)
- Graf pracovního postupu (Workflow Graph)
- Swarm

Vibe Coding is **not** a standalone article here.

#### 3.2 DarkFactory

Canonical generated DarkFactory documentation becomes the primary architecture/system-description content.

Do not maintain a parallel manual lifecycle/architecture narrative.

### 4 Výsledky a diskuse

#### 4.1 Ověření mechanismů
#### 4.2 Ověření systému
#### 4.3 Ověření na repozitářích
#### 4.4 Výzkumné otázky
#### 4.5 Diskuse a omezení

Present observed results first, then interpretation/comparison/limitations.

### 5 Závěr

Return explicitly to objectives and research questions.

No new factual material.

## Single-file semantic/article contract

The old schema types are retired, but the semantic writing contract remains.

Within `main.typ`, every semantic article should read in this order:

1. concise definition — what it is;
2. description — mechanism, distinctions, constraints;
3. real sourced example(s) where defensible;
4. practical implication for agentic software development.

Presentation contract:

**unnumbered article heading → definition → description → examples/visuals → practical**

Do not expose child headings named Definition / Description / Examples / Practical.

Structural headings are numbered and appear in school Contents.
Semantic article headings remain unnumbered and excluded from school Contents.

Do not reintroduce schema/manifests merely to encode this structure.

## Source rules

- no self-referential definitions such as “v této práci označuje…”;
- original papers/specifications and first-party documentation preferred;
- factual/mechanistic claims require claim-local citations;
- time-sensitive evidence keeps version/date provenance;
- DarkFactory behavior must come from current code/docs/tests/workflows;
- never generalize a survey beyond its population.

## Evidence ownership

### Introduction
- Gradually adoption/coding-agent evidence;
- Vibe Coding evidence/definition;
- Epoch capability trend;
- Artificial Analysis v4.3.2 benchmark.

### Theory
- model;
- representation;
- inference;
- harness mechanisms.

### Practical
- Agentic Engineering practices;
- DarkFactory implementation.

### Results and discussion
- observed evaluation evidence;
- interpretation;
- limitations;
- research-question answers.

## Locked content contracts

### Embedding
Preserve:
- 2D `král − muž + žena ≈ královna`;
- axes **Pohlaví** and **Královský status**;
- 3D pedagogical projection with France:Paris :: Italy:Rome;
- third axis **Další sémantická dimenze**;
- captions clarify that axes are pedagogical projections, not literal learned dimensions.

### Agent Loop
Required loop:
**Model → Akce → Nástroj/prostředí → Pozorování → Model**
with optional **Model → Výsledek**.

Ground in ReAct.

### State
State denotes persisted facts/control data valid for continuing execution. Do not personify it.

### Harness source/example directions
- Agent Loop → ReAct;
- Tools → first-party tool spec + actual tool example;
- Tool Calling → first-party function/tool-calling docs;
- Code Execution → first-party shell/code-execution docs;
- Sandbox → first-party sandbox docs;
- Skills → first-party customization/skills + portable spec where relevant;
- Plugin → first-party plugin architecture;
- Script → first-party skill/script example;
- Hooks → first-party lifecycle/hooks docs;
- MCP → MCP spec + official SDK example;
- .agents/ → OpenAI customization docs;
- .claude/ → Anthropic docs.

### Workflow Graph / Swarm
These live under Practical / Agentic Engineering orchestration.

## School compliance

Use `SCHOOL_RULES.md`.

Do not substitute IVT maturita-topic rules for the Odborná-práce guide.

Recovered rules currently include:
- work type **ODBORNÁ PRÁCE**;
- explicit Theory / Practical / Results structure;
- A4;
- 2.5 cm margins, 3 cm at binding edge;
- serif 12 pt body;
- justified paragraphs;
- 1.5 spacing;
- no first-line indent;
- heading numbering without trailing period;
- centered footer page numbers shown from Úvod;
- combined Seznam obrázků a tabulek where applicable;
- ISO-690 citations;
- numbered appendices and Seznam příloh where applicable.

The remaining direct-text guide audit is mandatory before final submission.

## Remaining execution order

### Phase B — Single-file cleanup + structural migration + introduction evidence move — ACTIVE NOW

All work happens directly in `main.typ`.

First retire transitional consolidation machinery:
- delete `scripts/consolidate_paper.py`;
- remove `make consolidate` and related help/phony entries;
- remove any validator/build assumptions that expect deleted modular Typst sources;
- ensure no workflow/docs describe `main.typ` as generated.

Then implement the new hierarchy directly in `main.typ`:

1. Úvod
2. Teoretická část
3. Praktická část
4. Výsledky a diskuse
5. Závěr

Tasks:
- preserve completed Model/Inference content and embedding figures in substance;
- add real Theory/Practical structural wrappers;
- move Jazykový model and Harness under Theory;
- move Agentic Engineering and DarkFactory under Practical;
- rename/restructure Vyhodnocení to Výsledky a diskuse;
- remove the standalone Vibe Coding article from Practical;
- integrate its useful sourced material into 1.1 and/or 1.5;
- move the accepted Artificial Analysis v4.3.2 benchmark block into 1.1 without recomputing/reselecting rows;
- preserve Gradually + Epoch evidence in 1.1;
- rewrite 1.1 into the coherent adoption → coding agents → Vibe Coding → capability → Agentic Engineering argument;
- add 1.6 Struktura práce;
- preserve unnumbered semantic article treatment;
- update validation and web structure extraction for the new single-file hierarchy;
- update README/AGENTS only if implementation details require it.

Exit:
- exactly one authored Typst source remains: `main.typ`;
- obsolete consolidation machinery is gone;
- rendered hierarchy is exactly 1–5;
- evidence ownership is correct;
- no duplicated Vibe Coding/benchmark content;
- all builds green.

### Phase C — Harness theory rewrite

Rewrite/finalize Harness under 2.2 directly in `main.typ`.

Tasks:
- State wording;
- ReAct diagram;
- direct source/example contract;
- real interface screenshots with provenance;
- practical implications;
- source/dedup pass.

Exit:
- Theory explains model + inference + harness coherently;
- no Agentic Engineering methodology remains in Theory.

### Phase D — Practical Agentic Engineering rewrite

Rewrite 3.1 directly in `main.typ` as a practical methodology.

Cover:
- Spec-Driven Development;
- Planning;
- Review;
- version-control workflow;
- CI/testing;
- prompt/system instruction practice;
- AGENTS.md / CLAUDE.md;
- context engineering/injection/compaction/RAG;
- guardrails/HITL/goal loops;
- subagents/orchestration/handoff/workflow graph/swarm.

Aggressively deduplicate mechanisms already explained in Theory.

### Phase E — Theory/practice source and ownership audit

For every semantic article in `main.typ`:
- one owner;
- primary/direct source;
- claim-local citation;
- real cited example where defensible;
- practical implication;
- no duplicated definition across Theory/Practical.

Prune unused bibliography records only after prose stabilizes.

### Phase F — Finalize Introduction, goals, RQs and methodology

Finalize:
- 1.1 argument/evidence prose;
- 1.2 thesis argument;
- 1.3 goals;
- 1.4 RQs;
- 1.5 methodology;
- 1.6 structure.

Research questions must map to actual evidence.

### Phase G — Integrate generated DarkFactory docs into 3.2

- pin DarkFactory revision;
- generate canonical documentation;
- insert/translate it into the appropriate 3.2 source region in `main.typ`;
- keep generated docs as the architecture/system-description authority;
- avoid parallel manual architecture prose.

### Phase H — Evidence pinning + Results and discussion

Pin:
- DarkFactory commit;
- target repository commits;
- CI/workflow runs;
- generated docs snapshot.

Write 4.1–4.5.

### Phase I — Thesis-wide final alignment

Audit:
- intro evidence ↔ theory;
- theory ↔ practical methodology;
- methodology ↔ DarkFactory;
- implementation ↔ results;
- RQs ↔ conclusion.

Finalize:
- conclusion;
- Czech/English annotations as required;
- keywords;
- encyclopedia/index;
- bibliography.

### Phase J — Odborná-práce publication QA

First complete the direct-text guide audit from `SCHOOL_RULES.md`.

Then:
- apply exact title/declaration/annotation/bibliography rules;
- enforce final typography/layout;
- verify figures/tables list and appendices;
- verify pagination;
- verify citation style with supervisor;
- generate all confirmed submission artifacts;
- run CI / Deploy Documentation / Release on one final head;
- inspect PDF page by page;
- verify HTML/Markdown/site outputs.

## Final gate

Complete only when:
- `main.typ` is the sole authored thesis Typst source;
- no retired consolidation/schema/manifest architecture remains;
- introduction contains the coherent adoption → coding agents → Vibe Coding → capability → Agentic Engineering argument;
- benchmark lives in Introduction;
- explicit Theory and Practical sections are restored;
- Theory contains model/inference/harness mechanisms only;
- Practical contains Agentic Engineering and DarkFactory;
- Results and discussion report observed evidence;
- all external factual claims are sourced;
- generated DarkFactory docs are the architecture authority;
- goals/RQs/results/conclusion align;
- school contract is satisfied;
- all publication workflows are green on one final head.
