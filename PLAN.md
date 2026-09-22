# DarkFactory-Paper — Completion Plan

This file contains only the remaining execution path to the final **Odborná práce**.

Durable repository/manuscript rules live in `AGENTS.md`.
Recovered school-format rules live in `SCHOOL_RULES.md`.
Unpromoted future requests live in `BACKLOG.md`.
The generic IDE workstream is separate in `IDE_PLAN.md`.

## Working mode

Implementation is delegated task-by-task to side agents.

Every side-agent task must:
- start from latest `main`;
- read `AGENTS.md`, `PLAN.md`, and `SCHOOL_RULES.md`;
- stay within its assigned phase;
- preserve accepted sourced work unless a concrete defect is found;
- use primary/original or first-party technical sources for factual claims;
- run the relevant builds/validation;
- commit its work;
- report commit SHA, changed files, validation, and unresolved issues.

The coordinating session owns `PLAN.md` and phase sequencing.

## Work title

Exact target title:

**AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory**

## Central argument

The introduction must establish one coherent motivation:

**AI adoption is rapidly expanding → only a small fraction of users currently use actual coding agents → low-structure AI-assisted software creation such as Vibe Coding illustrates that access to capable systems is not the same as disciplined engineering → model capabilities are also advancing rapidly → reliable/effective use therefore requires deliberate agentic engineering around the model and harness.**

This argument leads directly to the structure of the work:

- the **theoretical part** explains the concepts required to understand how modern agentic systems operate;
- the **practical part** explains and applies the practices required to use those systems effectively;
- **DarkFactory** is the concrete harness in which those practices are implemented;
- **Results and discussion** evaluate the resulting system and practices.

Do not claim that “most coding-agent users are vibe coding” unless a source with a population that actually supports that statement is found. Otherwise use narrower, sourced wording.

## Canonical macrostructure

Restore explicit school-shaped ownership:

1. **Úvod**
2. **Teoretická část**
3. **Praktická část**
4. **Výsledky a diskuse**
5. **Závěr**

Appendices follow where applicable.

The prior no-wrapper structure is superseded.

## Target hierarchy

### 1 Úvod

#### 1.1 Motivace a vymezení problému

Owns the complete contemporary motivation/evidence chain:

- Gradually AI-adoption visualization and coding-agent population estimate;
- explicit caveat that the coding-agent figure is an editorial estimate, not census/provider data;
- Vibe Coding as a sourced contemporary practice/baseline;
- Epoch ECI long-term capability-development evidence;
- Artificial Analysis current frontier-model benchmark snapshot;
- the transition from increasing access/capability to the need for Agentic Engineering.

The evidence should read as one argument rather than as disconnected charts.

#### 1.2 Východisko a argument práce

State the thesis argument cleanly:
- model capability alone is insufficient;
- a model becomes practically useful in an agentic system through the surrounding harness;
- effective software-engineering use further depends on deliberate Agentic Engineering practices.

#### 1.3 Cíle
- **1.3.1 Hlavní cíl**
- **1.3.2 Dílčí cíle**

#### 1.4 Výzkumné otázky

Must map directly to evidence that can later be collected.

#### 1.5 Metodika

Explain:
- literature/specification review for theory;
- practice synthesis for Agentic Engineering;
- implementation in DarkFactory;
- empirical/CI/repository evidence used for evaluation.

Vibe Coding may be discussed here as a baseline/methodological contrast where useful, but it is not a later theory article.

#### 1.6 Struktura práce

Briefly explain Theory → Practical → Results/Discussion → Conclusion.

### 2 Teoretická část

Theory contains only the concepts needed to understand **how agentic systems operate**.

#### 2.1 Jazykový model

Opening framing directly under 2.1.

##### 2.1.1 Architektura a reprezentace
Unnumbered semantic articles in this exact order:
1. Velký jazykový model (LLM)
2. Transformer
3. Tokenizér
4. Token
5. Vektorová reprezentace (Embedding)

##### 2.1.2 Inference
Unnumbered semantic articles in this exact order:
1. Poskytovatel modelu (Model Provider)
2. Inferenční engine (Inference Engine)
3. Teplota (Temperature)
4. Kontextové okno (Context Window)
5. Mezipaměť klíčů a hodnot (KV Cache)
6. Degradace kontextu (Context Rot)

The current Artificial Analysis benchmark moves out of this section into 1.1.

#### 2.2 Harness

Opening framing directly under 2.2.

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

Real examples/screenshots may include Claude Code CLI, Google Antigravity IDE, and ChatGPT web when sourceable and useful.

### 3 Praktická část

The practical part owns **how to use agentic systems effectively for software engineering**, followed by the concrete DarkFactory realization.

#### 3.1 Agentické inženýrství

This section absorbs the former AI-assisted-development / Agentic Engineering chapter, except Vibe Coding which moves to the introduction/methodology.

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

This section is practical literature-backed methodology: it explains and justifies practices that are then realized in DarkFactory.

#### 3.2 DarkFactory

The canonical generated DarkFactory documentation is the primary architecture/system-description body.

Do not maintain a parallel manual architecture/lifecycle narrative.

Hand-maintained practical prose may:
- introduce the implementation goals;
- explain design choices not represented in generated docs;
- connect Agentic Engineering practices from 3.1 to the concrete implementation;
- explain verification methodology.

### 4 Výsledky a diskuse

#### 4.1 Ověření mechanismů
#### 4.2 Ověření systému
#### 4.3 Ověření na repozitářích
#### 4.4 Výzkumné otázky
#### 4.5 Diskuse a omezení

Results report observed evidence, not architecture.

Present factual results first, then interpretation/comparison/limitations.

### 5 Závěr

Return explicitly to the objective and research questions.

Summarize contribution and limitations.

Introduce no new facts.

## Semantic article contract

Every semantic article in Theory and practice-methodology sections uses:

1. `definition` — what it is;
2. `description` — how it works / why it matters;
3. `examples` — real cited examples where defensible;
4. `practical` — concrete engineering implication.

Rendered order:

**heading → definition → description → examples/visuals/attachments → practical**

No visible child headings named Definition/Description/Examples/Practical.

Semantic article headings remain unnumbered and excluded from the school PDF contents; structural headings remain numbered.

## Source rules

- No self-referential definitions such as “v této práci označuje…”.
- Use original papers/specifications and first-party documentation where available.
- Claim-local citations are required; bibliography metadata alone is insufficient.
- Time-sensitive evidence must retain version/date/observation provenance.
- DarkFactory-specific behavior must be sourced from current code/docs/tests/workflows.
- Do not generalize survey results beyond their measured population.

### Locked evidence ownership

**1.1 Motivace a vymezení problému**
- Gradually adoption/coding-agent visualization;
- Epoch ECI capability trend;
- Artificial Analysis point-in-time frontier benchmark;
- Vibe Coding evidence/definition.

**2 Teoretická část**
- mechanisms and system concepts only, not contemporary adoption/model leaderboard evidence.

**3 Praktická část**
- Agentic Engineering practices;
- generated DarkFactory architecture/implementation.

**4 Výsledky a diskuse**
- observed evaluation evidence and interpretation.

## Locked technical/source contracts

### Embedding figures

Keep:
- 2D pedagogical `král − muž + žena ≈ královna`;
- Czech axes **Pohlaví** and **Královský status**;
- second 3D pedagogical projection adding France:Paris :: Italy:Rome;
- third axis **Další sémantická dimenze**;
- captions must state that axes are explanatory projections, not literal learned embedding dimensions.

### Agent Loop / ReAct

Required loop:
**Model → Akce → Nástroj/prostředí → Pozorování → Model**
with optional **Model → Výsledek**.

Ground in the original ReAct paper.

### State

State denotes persisted facts/control data valid for continuing execution. Do not personify state or describe facts as “owned by State”.

### Harness concrete source/example pairs

Where applicable, preserve these source directions:
- Agent Loop → ReAct paper;
- Tools → first-party tool specification + actual built-in tool;
- Tool Calling → first-party function/tool-calling documentation;
- Code Execution → first-party shell/code-execution docs;
- Sandbox → first-party sandbox docs;
- Skills → first-party skills/customization docs + portable skill spec where relevant;
- Plugin → first-party plugin architecture;
- Script → first-party skill/script example;
- Hooks → first-party lifecycle/hooks documentation;
- MCP → MCP specification + official SDK example;
- .agents/ → OpenAI customization docs;
- .claude/ → Anthropic Claude Code docs.

### AGENTS.md / CLAUDE.md

Keep them as distinct semantic concepts where practical use is discussed.

Do not collapse them into a generic “project instructions” concept.

### Workflow Graph / Swarm

- Workflow Graph stays under practical orchestration.
- Use current official Claude Code Dynamic Workflows material where verified.
- Treat `ultracode` accurately as a trigger/setting if retained.
- Swarm uses official Kimi K2.5 Agent Swarm as the concrete source/example where still current.

## School compliance

`SCHOOL_RULES.md` is the recovered Odborná-práce school contract.

Do not use the IVT maturita-topic sheet as a substitute for Odborná-práce formatting requirements.

Current recovered rules include:
- work type **ODBORNÁ PRÁCE**;
- explicit Theory / Practical / Results structure;
- A4;
- margins 2.5 cm, binding edge 3 cm;
- serif 12 pt body;
- justified paragraphs;
- 1.5 spacing;
- no first-line indent;
- numbered headings without trailing period;
- page numbers centered in footer, displayed from Úvod;
- combined Seznam obrázků a tabulek when applicable;
- ISO-690 citation system;
- numbered appendices + Seznam příloh when applicable.

Before final submission, perform the remaining direct-text audit listed in `SCHOOL_RULES.md`, especially declaration wording, annotation details, bibliography heading, submission artifacts, and any quantitative school limits.

## Remaining execution order

### Phase B — Structural migration to Odborná-práce hierarchy + introduction evidence move — ACTIVE NOW

Implement the new numbered hierarchy:
1 Úvod
2 Teoretická část
3 Praktická část
4 Výsledky a diskuse
5 Závěr

Tasks:
- preserve the completed source-backed Model/Inference articles and embedding figures exactly in substance; migrate their structural ownership rather than rewriting them again;
- treat the multi-file semantic sources under `DarkFactory/` as authored source and keep the consolidated `main.typ` generation path synchronized; do not edit generated/consolidated output as a substitute for changing authored semantic sources;
- preserve the current consolidation/build tooling unless structural migration requires a narrowly scoped compatibility update;
- introduce structural Theory/Practical wrappers;
- nest Jazykový model and Harness under Theory;
- move Agentic Engineering under Practical;
- move DarkFactory under Practical;
- rename/restructure Results as Výsledky a diskuse;
- remove Vibe Coding from practical/theory semantic article manifests;
- integrate Vibe Coding into 1.1/1.5 as a sourced motivation/methodological contrast; do not claim that most coding-agent users are vibe coding unless representative evidence is found;
- move the accepted Artificial Analysis benchmark block from model section to 1.1 without reselecting/recomputing its pinned rows;
- keep Gradually + Epoch in 1.1;
- rewrite 1.1 so all four evidence strands form the central argument;
- add/align 1.6 Struktura práce;
- update schema/manifests/README/AGENTS/validators to the new numbering;
- preserve semantic article exclusion from school contents.

Exit:
- rendered hierarchy matches the new macrostructure;
- evidence ownership is correct;
- no duplicated Vibe Coding or benchmark article remains;
- all builds green.

### Phase C — Harness theory rewrite

Rewrite/finalize all Harness concepts under 2.2.

Tasks:
- State wording;
- ReAct diagram;
- direct source/example contracts;
- real interface screenshots with provenance;
- practical implication field;
- source/dedup pass.

Exit:
- theory explains model + inference + harness coherently and no Agentic Engineering practice remains in Theory.

### Phase D — Practical Agentic Engineering rewrite

Rewrite 3.1 as the practical methodology for using agentic systems.

Tasks:
- Spec-Driven Development;
- Planning;
- Review;
- version-control workflow;
- CI/testing practice;
- prompt/system instruction practice;
- AGENTS.md / CLAUDE.md;
- context engineering/injection/compaction/RAG;
- guardrails/HITL/goal loops;
- subagents/orchestration/handoff/workflow graph/swarm;
- aggressively deduplicate mechanisms already explained in Theory.

Exit:
- 3.1 reads as a practical engineering method, not another glossary/theory chapter.

### Phase E — Theory/practice source and ownership audit

For every semantic concept:
- one owner;
- primary/direct source;
- claim-local citation;
- concrete cited example where defensible;
- practical implication;
- no duplicated definition across Theory and Practical.

Prune unused bibliography records only after prose stabilizes.

### Phase F — Finalize introduction, goals, RQs and methodology

Finalize:
- 1.1 argument/evidence prose;
- 1.2 thesis argument;
- 1.3 goals;
- 1.4 research questions;
- 1.5 methodology;
- 1.6 structure.

Ensure research questions map to actual evidence collection.

### Phase G — Integrate generated DarkFactory docs into 3.2

- pin the DarkFactory revision;
- generate canonical docs;
- make them the architecture/system-description body;
- map practice → implementation where useful;
- avoid manual duplicate architecture/lifecycle prose.

### Phase H — Evidence pinning + Results and discussion

Pin:
- DarkFactory commit;
- target repository commits;
- CI/workflow runs;
- generated docs snapshot.

Write:
- 4.1 mechanism verification;
- 4.2 system verification;
- 4.3 repository verification;
- 4.4 research-question answers;
- 4.5 discussion and limitations.

### Phase I — Thesis-wide final alignment

Audit:
- intro evidence ↔ theory;
- theory ↔ practical methodology;
- practical methodology ↔ DarkFactory implementation;
- implementation ↔ results;
- research questions ↔ conclusion.

Finalize:
- conclusion;
- annotation/annotation;
- keywords;
- encyclopedia/index;
- bibliography.

### Phase J — Odborná-práce publication QA

First complete the direct-text school-guide audit from `SCHOOL_RULES.md`.

Then:
- apply exact title-page/declaration/annotation/bibliography rules;
- enforce recovered typography/layout;
- restore combined figures/tables list and appendices behavior as required;
- verify page-number behavior;
- verify citation style selected with supervisor;
- generate all required submission artifacts confirmed by the guide;
- run CI / Deploy Documentation / Release on the same final head;
- inspect final PDF page by page;
- verify HTML/Markdown/site outputs;
- fix presentation defects only.

## Final gate

The work is complete only when:
- the introduction contains the coherent adoption → coding agents → Vibe Coding → capability → Agentic Engineering argument;
- the model benchmark lives in the introduction, not model theory;
- explicit **Teoretická část** and **Praktická část** are restored;
- Theory contains only model/inference/harness mechanisms;
- Agentic Engineering practices live in Practical;
- DarkFactory is the practical implementation of those practices;
- Results and discussion report observed evidence;
- every externally factual claim is sourced;
- semantic duplication is eliminated;
- generated DarkFactory docs are the canonical architecture description;
- final goals/RQs/results/conclusion align;
- the publication satisfies the recovered Odborná-práce contract and the final direct-text school-guide audit;
- canonical builds and publication workflows are green on one final head.
