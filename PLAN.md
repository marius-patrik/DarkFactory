# DarkFactory-Paper — Completion Plan

This file contains only the remaining execution path to the final **Odborná práce**.

Durable manuscript rules live in `AGENTS.md`.
Recovered school-format rules live in `SCHOOL_RULES.md`.
Unpromoted future requests live in `BACKLOG.md`.
The generic IDE workstream is separate in `web/PLAN.md`.

## Canonical source architecture

The thesis has been fully consolidated.

**`paper/PAPER.typ` is the single canonical authored Typst source of the thesis.**

There is no modular manuscript/schema/manifest source tree anymore.

Current repository contract:

```text
paper/PAPER.typ                  canonical thesis source
paper/bib/                 bibliography data
paper/data/                checked-in evidence data
paper/img/                 figures/assets
paper/fonts/               publication fonts
scripts/                         build/export/validation helpers
web/                             generic review/IDE application
```

Rules:

- all thesis prose, structure, semantic articles, review helpers, template logic, front matter, back matter, and Typst publication logic are edited directly in `paper/PAPER.typ`;
- do not recreate `DarkFactory/index.typ`, schema files, concept files, section manifests, template modules, or another parallel authored Typst tree;
- do not regenerate `paper/PAPER.typ` from retired modular sources;
- bibliography/data/assets remain external where appropriate and may be referenced by `paper/PAPER.typ`;
- generated PDF/HTML/Markdown/review outputs remain artifacts, not authored sources;
- a future decomposition is out of scope unless explicitly requested.


## Working mode

Implementation is delegated task-by-task to side agents.

Every task must:
- start from latest `main`;
- read `AGENTS.md`, `PLAN.md`, and `SCHOOL_RULES.md`;
- treat `paper/PAPER.typ` as the only thesis Typst source;
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
- **1.1 Motivace a vymezení problému** — Gradually + Vibe Coding + Epoch + Artificial Analysis + bridge to Agentic Engineering.
- **1.2 Východisko a argument práce**
- **1.3 Cíle**
  - **1.3.1 Hlavní cíl**
  - **1.3.2 Dílčí cíle**
- **1.4 Výzkumné otázky**
- **1.5 Metodika**
- **1.6 Struktura práce**

### 2 Teoretická část

Theory contains only concepts required to understand **how agentic systems operate**.

#### 2.1 Jazykový model
- **2.1.1 Architektura a reprezentace** — LLM, Transformer, Tokenizér, Token, Embedding.
- **2.1.2 Inference** — Model Provider, Inference Engine, Temperature, Context Window, KV Cache, Context Rot.

The completed Model/Inference prose and embedding figures are accepted. Do not rewrite them merely because their hierarchy changes.

The Artificial Analysis benchmark moves to 1.1.

#### 2.2 Harness
- **2.2.1 Smyčka a stav**
- **2.2.2 Prostředí a nástroje**
- **2.2.3 Rozšíření**

### 3 Praktická část

#### 3.1 Agentické inženýrství
- **3.1.1 Zadání a způsob práce**
- **3.1.2 Řízení změny**
- **3.1.3 Kvalita a ověřování**
- **3.1.4 Instrukce a kontext**
- **3.1.5 Řízení agentního chování**
- **3.1.6 Orchestrace agentů**

Vibe Coding is not a standalone article here.

#### 3.2 DarkFactory

Canonical generated DarkFactory documentation becomes the primary architecture/system-description content. Do not maintain a parallel manual lifecycle/architecture narrative.

### 4 Výsledky a diskuse
- **4.1 Ověření mechanismů**
- **4.2 Ověření systému**
- **4.3 Ověření na repozitářích**
- **4.4 Výzkumné otázky**
- **4.5 Diskuse a omezení**

### 5 Závěr

Return explicitly to objectives and research questions. No new factual material.

## Single-file semantic/article contract

The old schema types are retired, but the semantic writing contract remains.

Within `paper/PAPER.typ`, every semantic article should read in this order:

1. concise definition;
2. description/mechanism;
3. real sourced example(s) where defensible;
4. practical implication.

Presentation:

**unnumbered article heading → definition → description → examples/visuals → practical**

Structural headings are numbered and appear in school Contents.
Semantic article headings remain unnumbered and excluded from school Contents.

Do not reintroduce schema/manifests merely to encode this structure.

## Source rules

- no self-referential definitions such as “v této práci označuje…”;
- original papers/specifications and first-party documentation preferred;
- factual/mechanistic claims require claim-local citations;
- time-sensitive evidence keeps version/date provenance;
- DarkFactory behavior comes from current code/docs/tests/workflows;
- never generalize a survey beyond its population.

## Evidence ownership

**Introduction:** Gradually, Vibe Coding, Epoch, Artificial Analysis benchmark.

**Theory:** model, representation, inference, harness mechanisms.

**Practical:** Agentic Engineering practices and DarkFactory implementation.

**Results and discussion:** observed evaluation evidence, interpretation, limitations, RQ answers.

## Locked content contracts

### Embedding
Preserve the accepted 2D/3D pedagogical figures and caveats.

### Agent Loop
Use ReAct:
**Model → Akce → Nástroj/prostředí → Pozorování → Model**
with optional **Model → Výsledek**.

### State
State denotes persisted current facts/control data. Do not personify it.

### Harness source/example directions
Use direct/original sources for Agent Loop, Tools, Tool Calling, Code Execution, Sandbox, Skills, Plugin, Script, Hooks, MCP, .agents/, and .claude/.

### Workflow Graph / Swarm
These live under Practical / Agentic Engineering orchestration.

## School compliance

Use `SCHOOL_RULES.md`.

Do not substitute IVT maturita-topic rules for the Odborná-práce guide.

The remaining direct-text guide audit is mandatory before final submission.

## Remaining execution order

### Phase C — Harness theory rewrite — ACTIVE NOW

Rewrite/finalize Harness under 2.2 directly in `paper/PAPER.typ`.

### Phase D — Practical Agentic Engineering rewrite

Rewrite 3.1 directly in `paper/PAPER.typ` as a practical methodology and deduplicate mechanisms already explained in Theory.

### Phase E — Theory/practice source and ownership audit

For every semantic article in `paper/PAPER.typ`: one owner, direct source, claim-local citation, cited example where defensible, practical implication, no duplicated definition.

### Phase F — Finalize Introduction, goals, RQs and methodology

Finalize 1.1–1.6 and map RQs directly to actual evidence.

### Phase G — Integrate generated DarkFactory docs into 3.2

Pin the DarkFactory revision and insert/translate canonical generated documentation into the 3.2 region of `paper/PAPER.typ`. Avoid parallel manual architecture prose.

### Phase H — Evidence pinning + Results and discussion

Pin implementation/evidence revisions and write 4.1–4.5.

### Phase I — Thesis-wide final alignment

Align intro ↔ theory ↔ practical ↔ DarkFactory ↔ results ↔ RQs/conclusion. Finalize annotations, keywords, encyclopedia/index, bibliography.

### Phase J — Odborná-práce publication QA

Complete the direct-text guide audit, then final typography/layout/submission QA and same-head CI/Deploy/Release validation.

## Final gate

Complete only when:
- `paper/PAPER.typ` is the sole authored thesis Typst source;
- no retired consolidation/schema/manifest architecture remains;
- introduction contains the coherent adoption → coding agents → Vibe Coding → capability → Agentic Engineering argument;
- benchmark lives in Introduction;
- explicit Theory and Practical sections are restored;
- Theory contains model/inference/harness mechanisms only;
- Practical contains Agentic Engineering and DarkFactory;
- Results and discussion report observed evidence;
- external factual claims are sourced;
- generated DarkFactory docs are the architecture authority;
- goals/RQs/results/conclusion align;
- school contract is satisfied;
- publication workflows are green on one final head.
