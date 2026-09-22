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


## Locked implementation contract

The following decisions are fixed and are not delegated to implementation-agent interpretation.

### Structural numbering and subsection ownership

Theory must render exactly as:

- **2 Teoretická část**
- **2.1 Úvod**
- **2.2 Jazykový model**
  - **2.2.1 Úvod**
  - **2.2.2 Architektura a reprezentace**
    - Velký jazykový model (LLM)
    - Transformer
    - Tokenizér
    - Token
    - Vektorová reprezentace (Embedding)
  - **2.2.3 Generování a poskytování**
    - Teplota (Temperature)
    - Poskytovatel modelu (Model Provider)
  - **2.2.4 Závěr**
- **2.3 Inference**
  - **2.3.1 Úvod**
  - **2.3.2 Inferenční běh**
    - Inferenční engine (Inference Engine)
    - Mezipaměť klíčů a hodnot (KV Cache)
  - **2.3.3 Kontext a limity**
    - Kontextové okno (Context Window)
    - Degradace kontextu (Context Rot)
  - **2.3.4 Závěr**
- **2.4 Harness**
  - **2.4.1 Úvod**
  - **2.4.2 Smyčka a stav**
  - **2.4.3 Prostředí a nástroje**
  - **2.4.4 Rozšíření**
  - **2.4.5 Závěr**
- **2.5 AI-asistovaný vývoj a agentické inženýrství**
  - **2.5.1 Úvod**
  - **2.5.2 Zadání a způsob práce**
  - **2.5.3 Řízení změny**
  - **2.5.4 Kvalita a ověřování**
  - **2.5.5 Instrukce a kontext**
  - **2.5.6 Řízení agentního chování**
  - **2.5.7 Orchestrace agentů**
  - **2.5.8 Závěr**

The above order is canonical. Agents must not reorder these groups.

A rendered numbered section has one owning folder manifest. Concept files may remain in existing domain directories when moving them would create churn, but superseded `index.typ` files must no longer act as parallel rendered section owners.

### New concept identity

Use these canonical terminology records and stable keys:

- Temperature:
  - `key: "temperature"`
  - `term: "Teplota"`
  - `keyword: "Temperature"`
  - relations: dependency on `language_model`; related to `inference_engine`.
- Model Provider:
  - `key: "model_provider"`
  - `term: "Poskytovatel modelu"`
  - `keyword: "Model Provider"`
  - relations: related to `language_model` and `inference_engine`.
- AGENTS.md / CLAUDE.md article:
  - `key: "project_instructions"`
  - `term: "Projektové instrukce"`
  - `keyword: "AGENTS.md / CLAUDE.md"`
  - article scope is specifically project/repository instruction files consumed by coding agents;
  - AGENTS.md and CLAUDE.md are concrete implementations/examples, not asserted to be one universal standard;
  - relations: related to `system_prompt` and `context_engineering`;
  - exact reading position: immediately after **Systémový prompt (System Prompt)** and before **Kontextové inženýrství (Context Engineering)**.

These relation edges express conceptual linkage only and must not change manifest reading order.

### Section 1 adoption and deployment evidence

Exact placement: **1.1 Motivace a vymezení problému**. Neither the adoption/deployment dot grid nor the longitudinal capability curve belongs in 1.2–1.5.

Within 1.1, use this evidence order:
1. broad organizational AI adoption versus mature software-engineering agent deployment;
2. longitudinal model-capability trend;
3. prose transition from rapid capability/adoption growth to the still-unsettled engineering problem addressed by the thesis.

Use a native vector/Typst **100-dot-grid visual**, restoring the visual language of the earlier dot diagram without reusing the old third-party CPA.RIP asset.

The primary comparison is fixed to the **2026 Stanford AI Index / McKinsey Global Survey 2025** data because it gives both quantities in a coherent organizational context:

- **88%**: organizations reporting regular AI use in at least one business function in 2025;
- **6%**: software-engineering AI-agent use at the mature deployment stages, composed of **5% scaling + 1% fully scaled**.

The manuscript must describe the second number precisely as **scaled/fully scaled AI-agent use in software engineering**, not as “only 6% use coding agents.” Earlier experimental/piloting use is a different measure.

Dot visual:
- two separate 10×10 grids;
- first grid highlights 88/100 dots;
- second grid highlights 6/100 dots;
- Czech labels only;
- same visual scale;
- explicit source/year under each grid;
- caption explains that the contrast is broad organizational AI adoption versus mature agent deployment specifically in software engineering.

If the final primary source revises/corrects these values, use the corrected source values without changing the defined metric.

### Section 1 long-term capability curve

Use **Epoch AI’s Epoch Capabilities Index (ECI)** trend as the primary longitudinal model-progress visual.

Required visual:
- one line chart;
- two series: reasoning-model frontier and non-reasoning-model frontier;
- cover the source’s available period beginning with the reasoning-model transition in September 2024 through the latest source point available at implementation;
- cite the dated Epoch AI dataset/insight;
- preserve uncertainty/prediction intervals only if they remain legible in print.

The textual takeaway may state the source’s measured trend only. As of the September 1, 2026 Epoch AI release, the reported frontier rates are approximately **14 ECI points/year for reasoning models** and **6 points/year for non-reasoning models**; re-verify before publication.

Do not replace this with a collection of unrelated benchmark bars.

### 2.2 current frontier benchmark snapshot

Exact placement: **2.2.1 Úvod**, after its opening scope/transition paragraph and before 2.2.2 Architektura a reprezentace.

Use **Artificial Analysis Intelligence Index v4.3.2** as the pinned current comparison for this revision unless Artificial Analysis publishes a newer stable index version before the implementation agent begins.

Render a compact table, not another trend chart.

Selection contract:
- rows: the **five highest-scoring distinct base model names** in the selected Artificial Analysis index version;
- when the same base model has multiple effort/fallback configurations, keep only its highest-scoring evaluated configuration and label that configuration;
- columns:
  - model;
  - provider;
  - Artificial Analysis Intelligence Index;
  - Terminal-Bench 4.0;
  - SciCode;
- include benchmark/index version and observation date in the caption;
- source all values from the same Artificial Analysis evaluation snapshot;
- do not mix vendor-self-reported benchmark values into this table.

This table is the latest point-in-time model comparison. It must not be reused as the Section 1 longitudinal progress visual.

### Embedding figures

The 2D figure remains the sourced gender/royalty analogy:

**král − muž + žena ≈ královna**

2D rendering contract:
- axes: **Pohlaví** and **Královský status**;
- point labels: **muž, žena, král, královna**;
- all labels offset from axes/points so no text intersects an axis line;
- no English graph labels;
- caption states that the axes are an explanatory projection and not literal learned coordinates.

The second figure is a 3D explanatory projection. It must add a second established word-vector analogy rather than inventing a semantic feature. Use the classic capital-country relation represented by examples such as:

**Francie : Paříž :: Itálie : Řím**

Rendering contract:
- preserve the gender/royalty relationship in one plane;
- place the capital-country relation in a second plane displaced along a third axis labeled **Další sémantická dimenze**;
- all visible labels in Czech: **Francie, Paříž, Itálie, Řím**;
- do not label the third axis as a literal learned property;
- caption explicitly says the 3D geometry is pedagogical and real embeddings have many learned dimensions;
- cite the source for each analogy family.

### ReAct / Agent Loop figure

The replacement figure has exactly these semantic nodes:

**Model → Akce → Nástroj / prostředí → Pozorování → Model**

and one optional exit arrow:

**Model → Výsledek**

No separate boxes for tokenization, system prompt, transcript/log, JSON payloads, Bash, sandbox internals, MCP servers, or “thought/reasoning.”

Rendering contract:
- Czech text only;
- maximum five loop boxes plus the optional result box;
- one visual loop, clockwise or left-to-right-return;
- no decorative badges;
- no shadows required;
- print-readable at thesis column width;
- source mechanism from the original ReAct paper.

### State wording

Canonical semantic wording to preserve in substance:

**Stav (State) označuje persistovanou reprezentaci skutečností a řídicích údajů, které jsou v daném okamžiku platné pro pokračování běhu.**

Do not write constructions that grammatically make State an actor or owner of those facts.

### Harness screenshots

The three required interface examples are attachments/examples of Harness, not standalone glossary concepts:

1. **Claude Code CLI** — terminal surface;
2. **Google Antigravity IDE** — desktop/IDE surface;
3. **ChatGPT web** — web surface.

Placement:
- immediately after the Harness introductory definition/description and before **Smyčka a stav**.

Image contract:
- real first-party screenshots only;
- prefer official documentation/product imagery;
- if no suitable official screenshot exists, use a reproducible capture of the real product UI;
- no generated/recreated UI;
- cropping/scaling is allowed, semantic editing is not;
- save a local publication asset with source/provenance metadata;
- captions state only the visible harness-relevant interface behavior.

### Self-reference ban

The ban applies to the **published thesis prose**, including annotation/abstract, introductions, conclusions, concept definitions/descriptions, captions, and results discussion.

Remove/rewrite formulations such as:
- „v této práci“;
- „pro účely této práce“;
- „tato práce definuje“;
- „práce se zaměřuje“;
- equivalent English self-reference in the abstract.

Repository documentation such as README/AGENTS/PLAN may of course refer to “the thesis/work” operationally.

No new semantic concept may exist solely because the thesis invents a local definition. If a term is:
- externally established → source it externally;
- DarkFactory-specific → source it from DarkFactory code/generated docs/tests;
- neither → remove it or write the relationship without promoting it to a glossary concept.

### Source hierarchy

For factual manuscript claims, prefer sources in this order:

1. original paper / specification / benchmark dataset;
2. first-party technical documentation;
3. independent research/index report that exposes methodology;
4. secondary explanatory source only when the primary source is unavailable or insufficient.

Product screenshots and product-behavior claims must use first-party sources wherever available.



## Explicitly deferred decisions — agents must not invent these early

These items are intentionally unresolved until the named phase because they depend on live sources or implementation evidence.

- **Exact benchmark rows and numeric values (Phase 2/3):** the selection algorithm and source are fixed, but the five model rows/values must be read from the pinned Artificial Analysis snapshot at execution time.
- **Exact ECI plotted datapoints (Phase 2):** source/series are fixed; use the source dataset rather than hand-entering approximations from prose.
- **Exact screenshot files/URLs (Phase 4):** products and documentation can change. Select the current real first-party screenshots at execution time under the fixed screenshot contract.
- **Exact diagram coordinates, dimensions, typography, and spacing (Phases 3/4):** semantic contents are fixed; visual geometry is an implementation detail so long as it satisfies the rendering contracts and survives PDF inspection.
- **Exact full rewritten prose (Phases 3–8):** ownership, claims, terminology, sources, and section purpose are fixed; agents must write concise source-backed Czech prose rather than preserve old wording mechanically.
- **3.2 generated internal hierarchy (Phase 9):** must come from the pinned current DarkFactory-generated documentation. Do not design it manually in advance.
- **Pinned DarkFactory/target-repository commits and CI run IDs (Phase 10):** choose them only after implementation/docs are stabilized.
- **Exact final result values and limitations (Phase 10):** report only evidence actually observed from the pinned runs.
- **Final wording of goals, research questions, methodology, answers, conclusion, annotation/abstract, and final keywords (Phase 7/11):** align these only after the final evidence design/results are known.
- **Final bibliography membership (Phase 11):** individual source choices are made claim-locally during rewrites; prune to actually cited sources only after prose stabilizes.
- **Physical file moves:** file/directory layout is an implementation detail. A side agent may minimize moves, but there must be exactly one active numbered-section manifest per rendered section and no superseded parallel structural owner.

A side agent must not broaden its task into any deferred item assigned to a later phase.


## Target hierarchy

### 1 Úvod

1.1 Motivace a vymezení problému  
1.2 Východisko a argument práce  
1.3 Cíle  
1.3.1 Hlavní cíl  
1.3.2 Dílčí cíle  
1.4 Výzkumné otázky  
1.5 Metodika

Section 1 owns the research motivation, argument, goals, questions, methodology, and the high-level evidence for why the topic matters.

Required evidence in Section 1:
- restore the broad **AI adoption/usage statistic**;
- restore the previous **dot-style adoption/usage diagram**;
- explicitly contrast broad AI adoption with the still-low measured usage of coding agents, using a real directly measured source for coding-agent usage;
- include the **long-term model capability/improvement curves** from a stable longitudinal source;
- keep these as motivation/context, not as a detailed benchmark survey.

The latest point-in-time frontier-model benchmark comparison belongs in 2.2 Jazykový model, not in Section 1.

### 2 Teoretická část

Rename the top-level section from the longer current title to exactly **Teoretická část**.

#### 2.1 Úvod

Scope/transition only. Do not pre-summarize every child concept.

#### 2.2 Jazykový model

Split the current combined **Jazykový model a inference** section. This section owns the model itself, its representation, generation controls, and provider boundary.

Target internal structure and exact numbering are fixed in the Locked implementation contract above.

Model-provider wording must describe the externally supplied model/service boundary from real provider/API documentation, not invent a new architectural abstraction.

Temperature must be sourced from real model/API documentation and explain its effect without overstating deterministic semantics.

##### Evidence ownership between Section 1 and 2.2

Section 1 owns:
- broad AI adoption/usage;
- the restored dot-style adoption/usage diagram;
- the contrast between broad AI adoption and directly measured coding-agent usage;
- long-term model capability/improvement curves.

Section 2.2 owns:
- the **latest frontier-model benchmark comparison** only, pinned to an exact benchmark/version/date.

Do not duplicate these surfaces across both sections.

Current source anchors to evaluate during implementation:
- Microsoft Global AI Diffusion 2026 for broad AI adoption;
- Stanford AI Index 2026 or another stable longitudinal source for long-term model capability curves;
- Artificial Analysis Intelligence Index v4.3.2 (September 2026), or a newer defensible independent benchmark snapshot if available when implemented, for the latest model comparison;
- a separate real survey/telemetry source must be found for actual coding-agent usage before the Section 1 dot diagram is finalized.

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

Target internal structure and exact numbering are fixed in the Locked implementation contract above.

The Model/Inference boundary must remain precise: Model owns learned model structure/representation/configurable generation concepts; Inference owns execution of the model and runtime inference constraints.

#### 2.4 Harness

Harness follows Inference.

Exact Harness numbering, group names, and ordering are fixed in the Locked implementation contract above. Existing concepts remain assigned to those groups as described there and in the canonical hierarchy.

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

This phase is **structure-only** except for the minimum sourced definitions required for newly introduced schema records. It must not redesign figures, restore statistics, collect screenshots, or perform the full prose rewrite.

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

### Phase 2 — Section 1 evidence restoration + 2.2 benchmark snapshot

Section 1:
- recover the prior dot-style usage diagram design/asset if it still exists in repository history;
- verify a current broad AI-adoption statistic;
- find and verify a **direct measurement of coding-agent usage** that is comparable enough to support the intended contrast without conflating populations;
- rebuild/restore the dot diagram so broad adoption growth and low coding-agent usage are both visible and correctly labeled;
- verify and restore high-level long-term model capability/improvement curves from a stable longitudinal source;
- record source population, observation date, and methodological caveats.

Section 2.2:
- verify a current frontier-model comparison pinned to benchmark/version/date;
- keep it compact and point-in-time; do not duplicate the long-term curves or adoption evidence from Section 1.

Exit:
- Section 1 has sourced adoption/coding-agent usage evidence and long-term capability curves;
- 2.2 has the latest benchmark snapshot;
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
- Section 1 adoption, coding-agent usage, and long-term model-improvement evidence is pinned and cited;
- the latest model benchmark comparison in 2.2 is pinned and cited;
- diagrams are clean, sourced, and pedagogically accurate;
- real harness examples use real screenshots with provenance;
- 3.2 comes from generated DarkFactory documentation;
- 3.3 owns lifecycle behavior;
- 3.4 owns evidence;
- semantic duplication is eliminated;
- final research questions, Results, and Conclusion align;
- all publication outputs are green and internally consistent.
