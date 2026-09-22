# DarkFactory-Paper — Completion Plan

This plan is the execution order from the current repository state to the final thesis. Durable writing/structure rules live in `AGENTS.md`, but this plan owns the active migration until each change is implemented and the durable rules are synchronized.

## Working mode

Implementation is delegated task-by-task to side agents.

The coordinating session:
- keeps `PLAN.md` aligned with the latest decisions and repository state;
- gives the user one bounded dispatch prompt at a time;
- does not implement manuscript/UI changes itself unless explicitly requested;
- reorients after each side-agent result, verifies the delta, and updates the plan before the next dispatch.

Each side-agent task must:
- start from current `main`;
- read `AGENTS.md` and `PLAN.md`;
- implement only the assigned bounded task plus necessary consistency fixes;
- use real primary/first-party sources for factual/definitional claims;
- run the relevant validation/build;
- commit its work;
- report the commit SHA, changed files, validation result, and unresolved issues.

## Work title

Target title:

**AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory**

All title surfaces must eventually converge on this exact title unless explicitly changed again.

## Thesis argument

Section 1 owns the research motivation and argument. The body then demonstrates the progression:

**rozšíření a schopnosti AI → jazykový model → inference → harness → AI-asistovaný vývoj a agentické inženýrství → realizace v DarkFactory → důkazy a vyhodnocení**

The thesis must not invent factual terminology, mechanisms, statistics, benchmark claims, product behavior, or implementation claims. External claims come from real sources; DarkFactory-specific claims come from current code, generated documentation, tests, workflows, or pinned repository evidence.

## Global writing/source rules introduced by this revision

- Remove self-referential formulations such as **„v této práci“**, **„pro účely této práce“**, and equivalent wording from the manuscript.
- Do not compensate by inventing local definitions. Prefer established terminology supported by real sources.
- When a claim is specifically about DarkFactory, state it concretely as a property/behavior of DarkFactory and support it from code/docs/tests/workflows rather than framing it as an arbitrary thesis convention.
- Definitions, mechanisms, historical claims, product behavior, statistics, benchmark results, and comparisons must be traceable to real sources.
- Prefer original papers/standards and first-party product documentation; use high-quality independent benchmark datasets/reports for cross-vendor comparisons.
- Time-sensitive statistics and benchmarks must include a pinned observation date/version so the text does not imply timelessness.
- Illustrative diagrams may simplify high-dimensional mechanisms, but captions must clearly distinguish sourced relationships from explanatory projection choices.

## Target hierarchy

### 1 Úvod

1.1 Motivace a vymezení problému  
1.2 Východisko a argument práce  
1.3 Cíle  
1.3.1 Hlavní cíl  
1.3.2 Dílčí cíle  
1.4 Výzkumné otázky  
1.5 Metodika

Section 1 owns the research motivation, argument, goals, questions, and methodology, but the quantitative state-of-the-field evidence below belongs in the opening of 2.2 rather than being duplicated here.

### 2 Teoretická část

Rename the top-level section from the longer current title to exactly **Teoretická část**.

#### 2.1 Úvod

Scope/transition only. Do not pre-summarize every child concept.

#### 2.2 Jazykový model

Split the current combined **Jazykový model a inference** section. This section owns the model itself, its representation, generation controls, and provider boundary.

Target internal structure:

- Úvod
  - concise state-of-the-field evidence before the conceptual explanation:
    - one high-level statistic showing continuing growth of general AI adoption;
    - the restored **dot diagram** used previously for AI usage/adoption;
    - an explicit contrast showing that **actual coding-agent usage remains very low relative to broad AI adoption**, using a real measured source rather than an inferred ratio;
    - one high-level longitudinal model-capability improvement statistic;
    - a compact current frontier-model benchmark comparison, pinned to a benchmark/version/date;
  - the statistical material motivates why the Model → Inference → Harness distinction matters; it must not become a broad survey of AI history or duplicate later Results.
- Jazykový model
  - Velký jazykový model (LLM)
  - Transformer
  - Tokenizér
  - Token
  - Vektorová reprezentace (Embedding)
  - Teplota (Temperature)
  - Poskytovatel modelu (Model Provider)
- Závěr

Model-provider wording must describe the externally supplied model/service boundary from real provider/API documentation, not invent a new architectural abstraction.

Temperature must be sourced from real model/API documentation and explain its effect without overstating deterministic semantics.

##### 2.2 opening evidence and usage visual

The opening of 2.2 owns the high-level usage/capability evidence.

Requirements:
- restore the prior **dot-style usage diagram** rather than replacing it with a generic bar/line chart;
- use a sourced broad-AI-adoption statistic and a separately sourced **coding-agent usage** statistic;
- visually emphasize the gap: AI adoption is rising while actual coding-agent use is still a small minority;
- do not derive coding-agent use by subtraction or assumption; it must be directly measured by a defensible source with population/date/method stated;
- include one high-level longitudinal model-improvement statistic from a stable source;
- include a compact latest benchmark comparison from a current independent evaluation, pinned to exact benchmark/version/date;
- keep the prose short: these numbers establish scale and trajectory, then the section moves into what the model is.

Current source anchors to evaluate during implementation:
- Microsoft Global AI Diffusion 2026 for broad AI adoption;
- Stanford AI Index 2026 for longitudinal capability progress;
- Artificial Analysis Intelligence Index v4.3.2 (September 2026) for a current model comparison;
- a separate real survey/telemetry source must be found for actual coding-agent usage before the dot diagram is finalized.

Every exact number must be re-verified against the final cited source at implementation time.

##### Embedding visuals

Keep the existing queen/king relationship as an explicitly illustrative projection, but replace/refine the visual:

1. First diagram: clean **2D** projection of the sourced relation analogous to **král − muž + žena ≈ královna**.
   - all visible graph text in Czech;
   - labels such as **muž**, **žena**, **král**, **královna** must not intersect axis lines;
   - axes must be cleanly separated from point labels;
   - no implication that the displayed axes are literal learned embedding dimensions.

2. Immediately after it, add a second **3D explanatory projection** adding a third relationship/dimension and another term/set of terms to demonstrate why real embeddings require many dimensions.
   - the third relation must be defensible from a real source rather than arbitrarily invented;
   - prefer a well-documented linguistic relation from the embedding literature;
   - all graph labels and axes in Czech;
   - caption explicitly states that the three displayed dimensions are an educational projection, not the literal coordinates learned by a production embedding model.

The implementation agent must choose and cite the exact source-backed third relation before drawing the second diagram.

#### 2.3 Inference

Create a standalone second-level **Inference** section after Model.

Move the current inference material here:
- Inferenční engine (Inference Engine)
- Kontextové okno (Context Window)
- Mezipaměť klíčů a hodnot (KV Cache)
- Degradace kontextu (Context Rot)

The current old 2.3.3/2.3.4 boundary must disappear: inference material and the old conclusion transition are rewritten into the new standalone Inference section rather than preserved as the old sibling pair.

Target internal framing:
- Úvod
- Inference a její limity
- Závěr

The Model/Inference boundary must remain precise: Model owns learned model structure/representation/configurable generation concepts; Inference owns execution of the model and runtime inference constraints.

#### 2.4 Harness

Harness follows Inference.

Target structure:
- Úvod
- Smyčka a stav
  - Agentní smyčka (Agent Loop)
  - Agentní sezení (Session)
  - Přepis (Transcript)
  - Stav (State)
- Prostředí a nástroje
  - Prostředí agenta (Agent Environment)
  - Nástroje (Tools)
  - Vyvolávání nástrojů (Tool Calling)
  - Spouštění kódu (Code Execution)
  - Izolované prostředí (Sandbox)
- **Rozšíření**
  - Dovednosti (Skills)
  - Plugin
  - Skript
  - Hooks
  - MCP
- Závěr

Rename any **Agentní rozšíření** / **Dovednosti a rozšíření** structural heading to simply **Rozšíření**.

##### State wording

Audit every use of **Stav (State)**. Wording must explain that the current working facts/control data are **called/represented as state**, not grammatically imply that those facts are “owned by State” as though State were an actor/entity.

##### ReAct / Agent Loop diagram

Replace the current dense ReAct SVG with a much simpler diagram whose primary purpose is to make the loop immediately legible.

Target semantic flow:

**Model → Akce → Nástroj / prostředí → Pozorování → Model**

Optionally show **Výsledek** as the exit path.

Remove decorative/internal implementation detail that is not needed to explain the loop. Keep Czech labels, generous spacing, minimal arrows, and a print-readable composition. Source the ReAct mechanism from the original ReAct paper.

##### Real harness/interface examples

Harness must contain real, sourced examples covering at least three interaction surfaces:

- **terminal:** Claude Code CLI;
- **desktop/IDE:** Google Antigravity IDE;
- **web:** ChatGPT web.

Use real screenshots, not recreated/generated mockups. Prefer first-party product/documentation imagery or reproducible captures of the actual product UI. Each image requires source/provenance and a caption explaining only the harness-relevant behavior visible in the screenshot.

These are examples of real harness/product surfaces, not new abstract taxonomy items unless the source and writing justify a semantic concept.

#### 2.5 AI-asistovaný vývoj a agentické inženýrství

Merge the current **AI-asistovaný vývoj** and **Agentické inženýrství** level-2 sections into one second-level section after Harness.

The section explains how model + inference + harness capabilities are deliberately used to develop software.

Target material to preserve/restructure:

- Úvod
- Zadání a způsob práce
  - Vibe Coding
  - Vývoj řízený specifikací (Spec-Driven Development)
  - Plánování (Planning)
- Řízení změny
  - Správa verzí (Version Control)
  - Větev (Branch)
  - Pull Request
- Kvalita a ověřování
  - Slop
  - Průběžná integrace (CI)
  - Integrační test (Integration Test)
- Instrukce a kontext
  - Promptové inženýrství (Prompt Engineering)
  - Systémový prompt (System Prompt)
  - **AGENTS.md / CLAUDE.md**
  - Kontextové inženýrství (Context Engineering)
  - Vkládání kontextu (Context Injection)
  - Kompakce kontextu (Context Compaction)
  - RAG
  - Prompt Injection
- Řízení agentního chování
  - Cílené smyčky (Goal Loops)
  - Guardrail
  - Člověk ve smyčce (HITL)
- Orchestrace agentů
  - Subagent
  - Orchestrátor
  - Předání řízení (Handoff)
  - Graf pracovního postupu (Workflow Graph)
- Závěr

The implementation agent should optimize the exact group ordering for a continuous argument rather than mechanically concatenate the two old sections.

##### AGENTS.md / CLAUDE.md article

Add one source-backed article covering repository/project instruction files through concrete implementations:
- OpenAI Codex **AGENTS.md** behavior from official OpenAI documentation;
- Anthropic Claude Code **CLAUDE.md** behavior from official Anthropic documentation.

Do not claim they are identical or a universal standard. Explain their shared practical role and their implementation-specific differences from the cited documentation.

### 3 Praktická část

#### 3.1 Úvod

Explain Theory → concrete realization → evidence.

#### 3.2 DarkFactory

Keep empty in hand-maintained source until generated documentation is integrated.

Do not recreate manual architecture prose.

#### 3.3 Životní cyklus změny

Target structure remains:
- Úvod
- Zadání a plán
- Implementace
- Ověření a revize
- Finalizace
- Přerušení a obnova
- Závěr

Rewrite only from actual DarkFactory behavior/evidence and keep ownership distinct from generated 3.2 documentation.

#### 3.4 Vyhodnocení

Target structure remains:
- Úvod
- Ověření mechanismů
- Ověření systému
- Ověření na repozitářích
- Výzkumné otázky
- Diskuse a omezení
- Závěr

Results report evidence, not architecture.

### 4 Závěr

Final synthesis only after Results are pinned. Do not repeat Results prose.

## Execution order from this revision

### Phase 1 — Structural migration and durable-rule synchronization

- apply the new work title everywhere;
- rename section 2 to **Teoretická část**;
- split Model and Inference into separate level-2 sections;
- place Harness after Inference;
- merge AI-asistovaný vývoj + Agentické inženýrství into the final level-2 theory section;
- rename the extensions group to **Rozšíření**;
- add planned Temperature, Model Provider, and AGENTS.md / CLAUDE.md concepts;
- update manifests, relations, vocabulary ownership, README, and `AGENTS.md`;
- remove superseded structure rather than keeping compatibility paths;
- verify semantic graph resolution and rendered hierarchy.

Exit:
- hierarchy/vocabulary are structurally frozen under the new design;
- `AGENTS.md`, README, manifests, and PLAN agree.

### Phase 2 — 2.2 evidence research and restoration

- recover the prior dot-style usage diagram design/asset if it still exists in repository history;
- verify a current broad AI-adoption statistic;
- find and verify a **direct measurement of coding-agent usage** that is comparable enough to support the intended contrast without conflating populations;
- rebuild/restore the dot diagram so broad adoption growth and low coding-agent usage are both visible and correctly labeled;
- verify one high-level longitudinal model-capability improvement statistic;
- verify a current frontier-model comparison pinned to benchmark/version/date;
- keep all quantitative evidence in the opening of 2.2, not Section 1;
- record source population, observation date, and methodological caveats in the manuscript/citations.

Exit:
- 2.2 has a short, defensible state-of-the-field opening;
- no coding-agent usage number is inferred or invented;
- the dot diagram is sourced and publication-ready.

### Phase 3 — Model + Inference rewrite and visuals

- rewrite new 2.2 Model from source-backed responsibilities;
- add Temperature and Model Provider;
- rebuild 2D embedding figure;
- add sourced 3D projection;
- rewrite new 2.3 Inference;
- citation pass for both sections.

Exit:
- Model and Inference have a clean conceptual boundary and all factual claims/visual relations are sourced.

### Phase 4 — Harness rewrite, terminology, diagrams, examples

- audit/rewrite Harness articles;
- correct State wording;
- simplify ReAct diagram;
- rename group to Rozšíření;
- add real Claude Code CLI, Antigravity IDE, and ChatGPT web screenshots with provenance;
- remove self-referential wording;
- source every product/mechanism claim.

Exit:
- Harness is understandable independently of DarkFactory and grounded in real systems.

### Phase 5 — Merge/rewrite AI-assisted development + Agentic Engineering

- physically merge the old level-2 sections;
- add AGENTS.md / CLAUDE.md article;
- reorder groups into a continuous software-development argument;
- aggressively deduplicate against Model, Inference, and Harness;
- remove “v této práci” style wording;
- source every definitional/mechanistic claim.

Exit:
- one coherent level-2 section follows Harness and explains deliberate agentic software-development practice.

### Phase 6 — Theory-wide source and single-owner pass

Audit:
1. Model;
2. Inference;
3. Harness;
4. AI-asistovaný vývoj a agentické inženýrství.

For every claim:
- establish one semantic owner;
- establish a real source where externally factual;
- delete paraphrased duplication;
- replace unnecessary restatement with canonical references.

Prune unused bibliography entries only after prose stabilizes.

### Phase 7 — Rewrite remaining Section 1 against final Theory

Finalize:
- argument;
- goals/subgoals;
- research questions;
- methodology.

Ensure the research frame maps onto evidence that can actually be collected.

### Phase 8 — Finalize hand-maintained Practical shell

- finalize 3.1;
- keep 3.2 empty;
- rewrite/finalize 3.3 only from actual DarkFactory behavior.

### Phase 9 — Integrate autogenerated DarkFactory docs into 3.2

- pin the DarkFactory revision;
- generate canonical docs;
- map generated hierarchy into 3.2;
- prevent duplication with Theory and 3.3;
- preserve traceability/reproducibility.

### Phase 10 — Pin evidence and rewrite Results

Pin:
- DarkFactory commit;
- target-repository commits;
- workflow/CI runs;
- generated docs snapshot.

Then rewrite/finalize 3.4 around concrete reproducible evidence.

### Phase 11 — Thesis-wide deduplication and final alignment

Audit:
- Section 1 ↔ Theory;
- Theory ↔ generated 3.2;
- Theory/generated docs ↔ 3.3;
- Practical ↔ Results;
- Results ↔ Conclusion.

Then finalize:
- answers to research questions;
- goals/methodology wording;
- Conclusion;
- annotation/abstract;
- front keywords;
- encyclopedia/index;
- final bibliography.

### Phase 12 — Publication/submission QA

- positive validator only;
- CI / Deploy Documentation / Release green on the same final head;
- PDF / HTML / Markdown / site generated from that head;
- hierarchy and links correct;
- images source-traceable and print-readable;
- bibliography contains only used entries;
- README / AGENTS / PLAN agree;
- inspect final PDF page by page;
- fix presentation defects only.

## Final gate

The thesis is complete only when:
- title and hierarchy match the final design;
- Model and Inference are separate;
- Harness follows Inference;
- AI-asistovaný vývoj and Agentické inženýrství are one coherent section;
- all factual/definitional claims are source-backed;
- self-referential “in this work” wording is removed;
- current adoption, coding-agent usage, model-improvement, and benchmark statistics in 2.2 are pinned and cited;
- diagrams are clean, sourced, and pedagogically accurate;
- real harness examples use real screenshots with provenance;
- 3.2 comes from generated DarkFactory documentation;
- 3.3 owns lifecycle behavior;
- 3.4 owns evidence;
- semantic duplication is eliminated;
- final research questions, Results, and Conclusion align;
- all publication outputs are green and internally consistent.
