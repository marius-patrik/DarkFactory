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
- Every semantic concept with a real specification/product/paper realization must follow the Direct citation + concrete example contract below; generic bibliography metadata without a rendered claim-local citation is insufficient.
- Prefer original papers/standards and first-party product documentation; use high-quality independent benchmark datasets/reports for cross-vendor comparisons.
- Time-sensitive statistics and benchmarks must include a pinned observation date/version so the text does not imply timelessness.
- Illustrative diagrams may simplify high-dimensional mechanisms, but captions must clearly distinguish sourced relationships from explanatory projection choices.


## School compliance contract — GJKT IVT

The submission PDF must comply with the official Gymnázium J. K. Tyla IVT maturitní-práce requirements. The currently published specific source is **Témata maturitních prací z IVT 2026**, especially the section **Specifické požadavky na maturitní práci s obhajobou**. Before final submission, re-check the school Maturity page for a newer IVT-specific edition and update this contract only if the school has superseded it.

### Semantic/content requirements

- The written part is an **odborný text** with a theoretical and practical part.
- Theory must be predominantly a literature review of current domestic/foreign professional sources relevant to the knowledge needed for the practical output; it must search, study, organize, compare, and analyze sources rather than merely define glossary terms.
- The practical written part must describe the actual project and justify important choices/procedures with references to professional sources where externally factual.
- Every claim that is not common knowledge must have a source.
- Prefer impersonal/passive Czech phrasing in the school submission prose; avoid first-person authorial narration except where the school-mandated declaration requires it.
- Final manuscript must contain at least **2,500 words**.
- Directly quoted material must remain comfortably below the school’s 20% ceiling; the final external similarity check must also remain at or below **20%**.
- The conclusion must be at least **12 rendered lines**, answer the questions established in the introduction, summarize what was reached, and introduce no new facts.

### Required front/back matter order

The school-PDF profile must render in this order:

1. **Title page**
   - label: **Maturitní práce z IVT**;
   - exact thesis title/topic;
   - author name;
   - class;
   - Gymnázium J. K. Tyla;
   - Hradec Králové;
   - year.
   - Do not add non-required title-page material such as the current word-count panel or English title variants. Keep supervisor/consultant metadata in repository data, but do not let it displace the school-required title-page fields.

2. **Prohlášení**
   - use the school-required declaration wording exactly in substance:  
     **„Prohlašuji, že jsem tuto maturitní práci vypracoval/a samostatně výhradně s použitím uvedených zdrojů a literatury.“**
   - include **V Hradci Králové**, date, and signature line.
   - remove the current additional archival-consent/supervisor declaration prose from the school submission profile.

3. **Anotace**
   - begin with the bibliographic identification line in the school-prescribed form:  
     **PŘÍJMENÍ, Jméno: Téma. Hradec Králové. Gymnázium J. K. Tyla. ROK. Počet stran XX. Maturitní práce.**
   - annotation body: approximately **5–10 rendered lines**, briefly summarizing objective and content;
   - exactly **3–5 front-matter keywords/phrases**.
   - The final school PDF does **not** render the English Abstract unless a newer school rule explicitly requires it. It may remain as repository/web metadata if useful.
   - Front-matter keywords are no longer generated from every semantic `keyword != none` record. The semantic vocabulary/index and the school’s 3–5 front keywords are separate surfaces.
   - Fixed front-keyword set for the current design:
     - **AI-asistovaný softwarový vývoj**
     - **Agentické inženýrství**
     - **Harness**
     - **Jazykový model**
     - **DarkFactory**

4. **Obsah + Seznam obrázků**
   - the PDF contents lists all **numbered structural chapters/subchapters** and their page numbers;
   - semantic concept articles remain **unnumbered** and must be **excluded from the school PDF contents/outline**;
   - the web viewer may expose those semantic articles through its richer Structure UI independently of the school PDF contents;
   - move **Seznam obrázků** to the front matter immediately after the contents and before Úvod;
   - do not keep the current combined **Seznam obrázků a tabulek** as a back-matter appendix section in the school PDF;
   - figures, tables, and graphs in the body remain individually numbered and captioned.

5. **Úvod** and the numbered manuscript body.

6. **Závěr**.

7. **Seznam použitých zdrojů** as the final textual section, formatted according to **ČSN ISO 690 / ČSN ISO 690-2**.

Appendices, if retained, must not cause the bibliography to stop being the final source-list section required by the school; final ordering must be checked against the exact current school instruction before submission.

### Numbering/outline contract

- Structural heading levels **1, 2, and 3 are numbered**.
- Semantic concept articles are a fourth-level semantic layer in the manuscript: visually distinct headings, **unnumbered**, and **not present in the school PDF contents**.
- No concept is numbered merely to make it appear in the school contents.
- The PDF contents is therefore a structural map, while the web viewer’s Structure panel may show both structural sections and unnumbered concept articles.

### Required school-PDF typography/layout

- A4.
- margins: **left 3 cm; top/right/bottom 2.5 cm**.
- **Times New Roman**, 12 pt, black, for the entire school submission text.
- paragraphs justified.
- **1.5 line spacing**.
- headings use document styles; levels 1–3 are numbered.
- from Úvod onward:
  - header: author left + thesis title right;
  - header 11 pt italic;
  - footer: centered page number, 11 pt;
  - page numbering **resets so Úvod is page 1**.
- final-PDF links, term markers, citations, and code text must not introduce non-black text that violates the school rule. Review/web profiles may retain review colors independently.
- code/raw blocks in the school PDF must not switch to a non-Times font merely for syntax styling.
- tables, images, and graphs must have numbered captions.
- citation rendering must remain consistent with the selected ISO-690 style.

### Required submission artifacts

The school requires:
- **two bound physical copies**;
- **PDF**;
- **DOCX**.

The repository currently treats PDF/HTML/Markdown as publication outputs; final submission work must add a reproducible **DOCX** output/profile and visually inspect it against the same school requirements. Physical printing/binding and the external Odevzdej.cz similarity result remain manual submission gates.

### Known current template deltas that must be fixed

The current `gjkt-odborna-prace` template is not yet fully school-compliant:

- uses **Caladea/New Computer Modern** rather than Times New Roman;
- title page renders extra/non-required material and uses **ODBORNÁ PRÁCE** instead of **Maturitní práce z IVT**;
- declaration text differs from the school-required declaration;
- renders an English Abstract and unlimited semantic keywords on the annotation page;
- all semantic concepts can leak into the PDF outline;
- list of figures/tables is currently in back matter instead of immediately after contents;
- no required author/title running header is rendered from Úvod;
- page numbering is not reset to 1 at Úvod;
- links/term markers/raw-code styling can introduce non-black/non-Times text;
- bibliography heading is **Seznam zdrojů** rather than **Seznam použitých zdrojů**;
- no DOCX submission artifact exists.

These are positive compliance requirements, not legacy blacklist rules.


## Locked implementation contract

The following decisions are fixed and are not delegated to implementation-agent interpretation.

### Structural numbering and subsection ownership

Explicit numbered **Úvod** and **Závěr** child sections are removed from Theory and Practical. Their prose is preserved as unheaded framing owned directly by the parent section.

Theory must render exactly as below. Numbered entries are structural sections. Entries marked **[article]** are unnumbered semantic articles rendered in the manuscript but excluded from the school PDF contents.

- **2 Teoretická část**
  - opening framing prose directly under the section heading; no numbered `Úvod`
  - **2.1 Jazykový model**
    - opening framing prose directly under 2.1
    - latest frontier benchmark snapshot is evidence, not a semantic article
    - **2.1.1 Architektura a reprezentace**
      - **[article] Velký jazykový model (LLM)**
      - **[article] Transformer**
      - **[article] Tokenizér**
      - **[article] Token**
      - **[article] Vektorová reprezentace (Embedding)**
    - **2.1.2 Inference**
      - **[article] Poskytovatel modelu (Model Provider)**
      - **[article] Inferenční engine (Inference Engine)**
      - **[article] Teplota (Temperature)**
      - **[article] Kontextové okno (Context Window)**
      - **[article] Mezipaměť klíčů a hodnot (KV Cache)**
      - **[article] Degradace kontextu (Context Rot)**
    - unheaded closing synthesis/transition owned by 2.1
  - **2.2 Harness**
    - opening framing prose directly under 2.2
    - Harness interface screenshots are examples/attachments here, not standalone articles
    - **2.2.1 Smyčka a stav**
      - **[article] Agentní smyčka (Agent Loop)**
      - **[article] Agentní sezení (Session)**
      - **[article] Přepis (Transcript)**
      - **[article] Stav (State)**
    - **2.2.2 Prostředí a nástroje**
      - **[article] Prostředí agenta (Agent Environment)**
      - **[article] Nástroje (Tools)**
      - **[article] Vyvolávání nástrojů (Tool Calling)**
      - **[article] Spouštění kódu (Code Execution)**
      - **[article] Izolované prostředí (Sandbox)**
    - **2.2.3 Rozšíření**
      - **[article] Dovednosti (Skills)**
      - **[article] Plugin**
      - **[article] Skript**
      - **[article] Hooks**
      - **[article] MCP**
      - **[article] .agents/**
      - **[article] .claude/**
    - unheaded closing synthesis/transition owned by 2.2
  - **2.3 AI-asistovaný vývoj a agentické inženýrství**
    - opening framing prose directly under 2.3
    - **2.3.1 Zadání a způsob práce**
      - **[article] Vibe Coding**
      - **[article] Vývoj řízený specifikací (Spec-Driven Development)**
      - **[article] Plánování (Planning)**
      - **[article] Revize (Review)**
    - **2.3.2 Řízení změny**
      - **[article] Správa verzí (Version Control)**
      - **[article] Větev (Branch)**
      - **[article] Pull Request**
    - **2.3.3 Kvalita a ověřování**
      - **[article] Slop**
      - **[article] Průběžná integrace (CI)**
      - **[article] Integrační test (Integration Test)**
    - **2.3.4 Instrukce a kontext**
      - **[article] Promptové inženýrství (Prompt Engineering)**
      - **[article] Systémový prompt (System Prompt)**
      - **[article] AGENTS.md**
      - **[article] CLAUDE.md**
      - **[article] Kontextové inženýrství (Context Engineering)**
      - **[article] Vkládání kontextu (Context Injection)**
      - **[article] Kompakce kontextu (Context Compaction)**
      - **[article] RAG**
      - **[article] Prompt Injection**
    - **2.3.5 Řízení agentního chování**
      - **[article] Cílené smyčky (Goal Loops)**
      - **[article] Guardrail**
      - **[article] Člověk ve smyčce (HITL)**
    - **2.3.6 Orchestrace agentů**
      - **[article] Subagent**
      - **[article] Orchestrátor**
      - **[article] Předání řízení (Handoff)**
      - **[article] Graf pracovního postupu (Workflow Graph)**
      - **[article] Swarm**
    - unheaded closing synthesis/transition owned by 2.3

The group the user previously referred to as **2.4.2 Zadání a způsob práce** is renumbered to **2.3.1** only because explicit numbered introductory sections and the standalone Theory intro node are removed. **Review remains in that exact semantic group.**

Practical uses the same framing rule:

- **3 Praktická část**
  - opening framing prose directly under the section heading; no numbered `Úvod`
  - **3.1 DarkFactory**
    - final internal numbered/article hierarchy comes from canonical autogenerated DarkFactory documentation
  - **3.2 Životní cyklus změny**
    - opening framing prose directly under 3.2
    - **3.2.1 Zadání a plán**
      - **[article] Požadavek (Request)** if retained by final sourced ownership
      - **[article] Plánování DarkFactory (Planning)** if retained by final sourced ownership
    - **3.2.2 Implementace**
    - **3.2.3 Ověření a revize**
      - **[article] Deterministické ověření (Deterministic Verification)** if retained
      - **[article] Smyčka revize a opravy (Review/Fix Loop)** if retained
    - **3.2.4 Finalizace**
      - **[article] Finální zarovnání (Final Alignment)** if retained
      - **[article] Reconciliation** if retained
    - **3.2.5 Přerušení a obnova**
    - unheaded closing synthesis owned by 3.2
  - **3.3 Vyhodnocení**
    - opening framing prose directly under 3.3
    - **3.3.1 Ověření mechanismů**
    - **3.3.2 Ověření systému**
    - **3.3.3 Ověření na repozitářích**
    - **3.3.4 Výzkumné otázky**
    - **3.3.5 Diskuse a omezení**
    - unheaded closing synthesis owned by 3.3

**4 Závěr** remains a real top-level thesis section because it is the mandatory final thesis conclusion, not a framing subsection.

The above order is canonical. Agents must not reorder groups or articles without first updating PLAN.

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
- Review:
  - `key: "review"`
  - `term: "Revize"`
  - `keyword: "Review"`
  - scope: general review of a plan/change/output against explicit requirements or quality criteria; not the DarkFactory-specific Review/Fix Loop;
  - source from established software/code-review literature or first-party development-platform documentation;
  - relations: related to `planning`, `pull_request`, and `integration_test`.
- AGENTS.md:
  - `key: "agents_md"`
  - `term: none`
  - `keyword: "AGENTS.md"`
  - exact scope: Codex project/repository instruction files discovered hierarchically and injected into agent context;
  - required primary citation: OpenAI **Custom instructions with AGENTS.md** (`https://developers.openai.com/docs/agent-configuration/agents-md`);
  - permitted supporting citation: OpenAI **Model guidance — Using agents.md** where useful for the injection/message representation;
  - claims that must be sourced from these docs:
    - Codex reads AGENTS.md before work begins;
    - project instructions are discovered from repository root toward the current working directory;
    - deeper instructions take precedence because they are merged later;
    - AGENTS.override.md can override AGENTS.md at a directory level;
    - the discovered instruction content is supplied to the model as context rather than being a filesystem convention invented by the thesis;
  - relations: related to `system_prompt`, `context_engineering`, and `agents_directory`.
- CLAUDE.md:
  - `key: "claude_md"`
  - `term: none`
  - `keyword: "CLAUDE.md"`
  - exact scope: Claude Code persistent project/user instruction files loaded into session context;
  - required primary citation: Anthropic **How Claude remembers your project** (`https://code.claude.com/docs/en/memory`);
  - claims that must be sourced from this page:
    - CLAUDE.md is a persistent instruction/context mechanism;
    - project instructions may live at `./CLAUDE.md` or `./.claude/CLAUDE.md`;
    - user instructions may live at `~/.claude/CLAUDE.md`;
    - instruction files above the working directory are loaded at launch while nested files can load on demand;
    - CLAUDE.md content is context/instruction guidance, not an enforced authorization/security boundary;
  - relations: related to `system_prompt`, `context_engineering`, and `claude_directory`.
- .agents/:
  - `key: "agents_directory"`
  - `term: none`
  - `keyword: ".agents/"`
  - exact scope: Codex repository/user namespace used for reusable agent extensions, especially Skills;
  - required primary citation: OpenAI **Customization overview** (`https://developers.openai.com/docs/customization/overview`);
  - required concrete claim:
    - repository-scoped Skills are stored in `.agents/skills`;
    - user/global Skills are stored in `~/.agents/skills`;
    - Skills use progressive disclosure: metadata first, then SKILL.md/references/scripts when relevant;
  - do not imply that AGENTS.md itself lives under `.agents/`; official OpenAI docs treat AGENTS.md and `.agents/skills` as separate customization layers;
  - do not imply that every possible Codex configuration file belongs under `.agents/`;
  - relations: related to `agents_md`, `skills`, and `scripts`.
- .claude/:
  - `key: "claude_directory"`
  - `term: none`
  - `keyword: ".claude/"`
  - exact scope: Claude Code project/user configuration and extension namespace;
  - required primary citations:
    - Anthropic **How Claude remembers your project** (`https://code.claude.com/docs/en/memory`) for `.claude/CLAUDE.md` and `.claude/rules/`;
    - Anthropic **Settings files and precedence** (`https://code.claude.com/docs/en/settings`) for `.claude/settings.json` and configuration precedence;
    - Anthropic **Hooks reference** (`https://code.claude.com/docs/en/hooks`) for hook configuration;
    - Anthropic **Extend Claude with skills** (`https://code.claude.com/docs/en/skills`) for Claude Code Skills;
  - claims must be citation-local:
    - `.claude/CLAUDE.md` is a valid project-instruction location;
    - `.claude/rules/` holds modular/path-scoped project rules;
    - `.claude/settings.json` is project configuration;
    - hooks and skills are separate extension mechanisms documented by Anthropic;
  - do not collapse the directory into a single “memory” feature and do not imply that every Claude Code extension uses the same loading semantics;
  - relations: related to `claude_md`, `skills`, and `hooks`.
- Workflow Graph:
  - existing semantic key remains `workflow_graphs`;
  - `term: "Graf pracovního postupu"`;
  - `keyword: "Workflow Graph"`;
  - scope: explicit orchestration structure in which task execution is represented as ordered, branching, parallel, staged, looping, or otherwise connected workflow steps rather than as one undifferentiated agent loop;
  - primary contemporary implementation/example: **Claude Code Dynamic Workflows** from official Anthropic documentation;
  - preserve the concrete Anthropic mechanism: Claude dynamically writes a JavaScript orchestration script that can spawn and coordinate many subagents in parallel or stages, hold intermediate results, run verification/fix passes, and resume interrupted work;
  - cite Anthropic’s **Introducing dynamic workflows in Claude Code** and **A harness for every task: dynamic workflows in Claude Code** as first-party sources;
  - explicitly mention **`ultracode`** only as the Claude Code setting/trigger that enables Claude to decide when to use a dynamic workflow; do not misname the product/concept itself as “Claude Ultracode”;
  - distinguish a workflow/graph from Swarm: a workflow has explicit executable orchestration/control-flow structure, while the Kimi Swarm example represents dynamically coordinated agent spawning/parallelism without treating a hand-authored/static workflow graph as the defining abstraction;
  - relations: related to `orchestrator`, `subagent`, `swarm`, and `goal_loops`.
- Swarm:
  - `key: "swarm"`
  - `term: none`
  - `keyword: "Swarm"`
  - exact scope: dynamically coordinated parallel execution by multiple subagents under an orchestrating agent/system;
  - primary concrete source/example: **Kimi K2.5 Agent Swarm** from official Kimi/Moonshot documentation;
  - source claim to preserve: Kimi K2.5 introduced a self-directed Agent Swarm in which an orchestrator can dynamically create and coordinate parallel subagents without predefined roles or hand-authored workflows;
  - later Kimi/Kimi Code versions may be cited only as dated implementation evolution, not used to retroactively redefine the original K2.5 concept;
  - do not present “swarm” as a universal formal standard across vendors;
  - relations: related to `subagent`, `orchestrator`, `workflow_graphs`, and `goal_loops`.

Do **not** keep the previous umbrella semantic article **Projektové instrukce (AGENTS.md / CLAUDE.md)**. The structural group **Instrukce a kontext** already provides the umbrella; AGENTS.md and CLAUDE.md own distinct implementation semantics and therefore remain separate articles.

These relation edges express conceptual linkage only and must not change manifest reading order.

### Section framing without numbered Úvod/Závěr

The schema/rendering contract must support framing prose without synthetic child headings:

- every structural `section` keeps its current opening `definition` + `description` body rendered immediately after the section heading;
- add an optional section-level **closing/synthesis body** (recommended schema field: `conclusion` or equivalently named single canonical field);
- render that closing body **after the section’s concepts and child folders**, before the next sibling section;
- the closing body has no heading, no number, no outline entry, and no semantic term of its own;
- migrate useful prose from old explicit `introduction.typ` / `conclusion.typ` framing files into the owning section’s opening/closing bodies;
- delete obsolete framing files/manifests once their content is migrated;
- opening prose establishes scope/transition only; closing prose synthesizes/bridges only;
- neither opening nor closing framing may duplicate child definitions/evidence.

This applies to Theory and Practical. Top-level **1 Úvod** and **4 Závěr** remain actual thesis sections.

### Section 1 adoption and deployment evidence

Exact placement: **1.1 Motivace a vymezení problému**.

Use the user-selected Gradually source:
**Finn Hillebrandt, “How Many People Use AI? Facts & Figures 2026”, Gradually AI, 23 August 2026.**

Restore the **2,500-dot world-population visual language** from that source in a clean local vector/Typst figure with Czech labels and a citation to Gradually. The local figure should faithfully reproduce the source encoding/data rather than copy the old CPA.RIP raster asset.

Source snapshot:
- **2,500 dots ≈ 8.3 billion people**;
- **1 dot ≈ 3.3 million people**;
- **~5.9B / 71% / 1,771 dots** — never knowingly used generative AI;
- **~2.3B / 28% / 696 dots** — uses free AI chatbots as the most advanced category;
- **~80M / 1% / 24 dots** — pays for an AI subscription as the most advanced category;
- **~30M / 0.36% / 9 dots** — uses AI coding agents as the most advanced category.

The categories are mutually exclusive in the source chart: each person is assigned to the most advanced category.

Critical wording constraint:
- the **~30M / 0.36% coding-agent figure is Gradually’s editorial deduplicated estimate**, using the midpoint of a stated 25–35M range;
- it is **not** a global census or a single provider’s official metric;
- the manuscript must label it explicitly as an estimate and preserve the source’s caveats about overlapping provider metrics and incomplete disclosure.

The visual/prose should emphasize the intended contrast: general generative-AI adoption is already large and growing, while regular coding-agent usage remains a very small share of humanity.

Evidence order inside 1.1:
1. Gradually 2,500-dot adoption/coding-agent visual;
2. longitudinal model-capability curve;
3. transition to the engineering problem motivating the thesis.

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

### 2.1 current frontier benchmark snapshot

Exact placement: directly in the opening framing prose of **2.1 Jazykový model**, before **2.1.1 Architektura a reprezentace**.

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

### Direct citation + concrete example contract

Every semantic article for which an authoritative specification, paper, API, product implementation, or reproducible real-world instance exists must contain **both**:

1. a **direct primary citation** supporting the definition/mechanism being described; and
2. at least one **concrete cited example** demonstrating the concept in a real implementation or in the primary source itself.

This is a manuscript-body requirement, not merely metadata:
- the definition/mechanism sentence must carry its claim-local citation;
- the example sentence, figure, code excerpt, or attachment must carry the source for that example;
- setting `citation:`/`source:` on the concept object does not by itself satisfy this rule if the rendered article does not make the evidence visible;
- prefer one strong canonical example rather than lists of products;
- a second example is justified when it demonstrates a materially different implementation surface;
- product examples must be first-party and dated/versioned when behavior can change;
- academic concepts should use an example from the original paper/specification where practical;
- if no defensible concrete example exists, do **not** invent one; record that the article is definition/mechanism-only and explain why during the source audit;
- examples remain examples/attachments and do not automatically become separate glossary concepts.

#### Locked Harness source/example pairs

These are the minimum direct-source/example contracts for 2.2 Harness.

- **Agentní smyčka (Agent Loop)**
  - direct source: original ReAct paper;
  - example: the simplified sourced ReAct action/observation loop used by the article’s diagram.
- **Agentní sezení (Session)**
  - direct source: OpenAI Managed Agents session API/reference or equivalent first-party session documentation;
  - example: one real session containing turns/items and a persistent session identifier.
- **Přepis (Transcript)**
  - direct source: first-party session/item-history documentation;
  - example: a real ordered history containing user/assistant/tool-call/tool-result items; distinguish transcript/history from current state.
- **Stav (State)**
  - direct source: first-party agent session/state documentation;
  - example: current persisted run/session facts used to continue execution, contrasted with the full transcript.
- **Prostředí agenta (Agent Environment)**
  - direct source: first-party agent environment/sandbox documentation;
  - example: an OpenAI hosted shell/container or equivalent real agent environment containing workspace/files/tool runtime.
- **Nástroje (Tools)**
  - required primary citation: OpenAI **Using tools** (`https://developers.openai.com/api/docs/guides/tools`) or an equally direct first-party tool API specification;
  - concrete example: the documented `web_search` tool or another first-party built-in tool attached to a Responses request;
  - explain that “tool” is the exposed capability/interface; do not collapse the concept into Tool Calling.
- **Vyvolávání nástrojů (Tool Calling)**
  - required primary citation: OpenAI **Function calling** (`https://developers.openai.com/api/docs/guides/function-calling`);
  - concrete example: the documented function-calling loop in which a model selects a named function, emits structured arguments, the application executes it, and the result is returned to the model;
  - retain JSON Schema only as an implementation mechanism/example, not as a standalone taxonomy item.
- **Spouštění kódu (Code Execution)**
  - required primary citation: OpenAI **Shell** (`https://developers.openai.com/api/docs/guides/tools-shell`) and/or the directly applicable first-party code-execution documentation;
  - concrete example: hosted `shell` with `container_auto` executing real commands and returning stdout/stderr to the model;
  - use a small documented command example rather than invented output.
- **Izolované prostředí (Sandbox)**
  - required primary citation: OpenAI sandboxing documentation and/or the Agents sandbox security documentation;
  - concrete example: a Codex/ChatGPT/Agents sandbox that restricts filesystem/network capabilities and requires approval/escalation outside its allowed boundary;
  - source the boundary behavior directly; a generic “Docker container” is not sufficient as the only example.
- **Dovednosti (Skills)**
  - required primary citations:
    - OpenAI **Customization overview** / Skills documentation;
    - the open Agent Skills specification when describing the portable `SKILL.md` format;
  - concrete example: OpenAI’s documented **commit** skill or **review-pr** skill showing `SKILL.md` plus optional references/scripts/assets;
  - show the real file shape briefly; do not invent a proprietary schema.
- **Plugin**
  - required primary citation: OpenAI **Plugin architecture** (`https://developers.openai.com/plugins/concepts/plugins`) and, where implementation-specific behavior is discussed, the corresponding first-party platform docs;
  - concrete example: a plugin that packages a Skill together with an MCP server, or the official meeting-follow-up/plugin example from the documentation;
  - state that a plugin is a packaging/distribution unit, not the parent category of every Harness mechanism.
- **Skript**
  - required primary citation: OpenAI Skills/Customization documentation showing optional executable `scripts/` support;
  - concrete example: the documented `review-pr/scripts/check-changes.sh`-style skill layout or another real first-party skill script used for deterministic validation/transformation;
  - distinguish a script from a Skill: a script executes deterministic code; the Skill supplies workflow instructions and decides when it is relevant.
- **Hooks**
  - required primary citation: first-party OpenAI Hooks/Plugin documentation and/or Anthropic Claude Code Hooks documentation for the exact hook behavior claimed;
  - concrete example: one documented lifecycle/tool-event hook that executes a deterministic validation/command at a defined event;
  - the article must name the event and action from the source instead of describing hooks only abstractly.
- **MCP**
  - required primary citation: **Model Context Protocol Specification 2026-07-28** (`https://modelcontextprotocol.io/specification/2026-07-28`);
  - the article must directly source the host/client/server model and the server primitives **resources, prompts, and tools** from the specification;
  - concrete example: the official MCP TypeScript SDK’s minimal **weather MCP server**, which exposes a real tool from an MCP server to a host/client;
  - implementation citation: official MCP TypeScript SDK v2 documentation (`https://ts.sdk.modelcontextprotocol.io/v2/`);
  - do not use Claude Code’s MCP support as the definition of MCP itself; it may be a secondary product example only.
- **.agents/**
  - retain its locked OpenAI direct citations;
  - concrete example: repository-scoped `.agents/skills/<skill>/SKILL.md`.
- **.claude/**
  - retain its locked Anthropic direct citations;
  - concrete examples should include only documented paths actually needed by the article, e.g. `.claude/settings.json`, `.claude/rules/`, or `.claude/CLAUDE.md`.

#### Other Theory articles

The same rule applies outside Harness whenever a real implementation/example exists.

Minimum examples to enforce during later rewrite phases:
- **Teplota (Temperature):** direct API/model documentation + an actual documented parameter range/value example; do not invent universal semantic guarantees.
- **Poskytovatel modelu (Model Provider):** direct provider/API documentation + a concrete provider/model API example.
- **Transformer / Embedding:** original papers + examples/figures grounded in those papers.
- **Kontextové okno / KV Cache / Context Rot:** direct model/system papers or first-party technical docs + a concrete measured/model implementation example where available.
- **Revize (Review):** GitHub pull-request review documentation + concrete Approve / Request changes review flow.
- **Správa verzí / Větev:** Git documentation + a concrete branch/commit example.
- **Pull Request:** GitHub Pull Request documentation + a real PR lifecycle example.
- **Průběžná integrace (CI):** first-party CI documentation + an actual workflow/check example.
- **Promptové inženýrství / Systémový prompt:** first-party model prompting/message-role documentation + concrete sourced prompt/instruction examples.
- **AGENTS.md / CLAUDE.md / .agents/ / .claude/:** use the already locked source/example contracts in this PLAN.
- **Kompakce kontextu:** direct first-party compaction/context-management documentation + a real compaction request/response example where available.
- **RAG:** original RAG literature + a concrete retrieval-then-generation example.
- **Guardrail:** first-party guardrail documentation + a concrete input/output/tool guard example.
- **Člověk ve smyčce (HITL):** first-party approval/escalation documentation + a real approval-required action example.
- **Subagent / Orchestrátor / Handoff:** first-party multi-agent/subagent documentation + a concrete delegation/handoff example.
- **Graf pracovního postupu (Workflow Graph):** retain the locked Claude Code Dynamic Workflows source and `ultracode` example.
- **Swarm:** retain the locked Kimi K2.5 Agent Swarm source/example.

The Theory-wide source pass must produce a concept-level audit table internally (it need not render in the thesis) with:
- concept key;
- primary definition/mechanism source;
- rendered claim-local citation present: yes/no;
- concrete example;
- example source;
- example rendered: yes/no;
- unresolved sourcing problem.

### Source hierarchy

For factual manuscript claims, prefer sources in this order:

1. original paper / specification / benchmark dataset;
2. first-party technical documentation;
3. independent research/index report that exposes methodology;
4. secondary explanatory source only when the primary source is unavailable or insufficient.

Product screenshots and product-behavior claims must use first-party sources wherever available.



## Locked user-request coverage checklist

Every implementation/review pass must preserve all of the following unless the user explicitly supersedes one:

- exact work title: **AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory**;
- Section 2 title: **Teoretická část**;
- no synthetic numbered `Úvod`/`Závěr` children; preserve their framing prose unheaded;
- AI-assisted development and Agentic Engineering merged into one Theory section;
- **Revize (Review)** included in **Zadání a způsob práce**;
- Harness extension group titled only **Rozšíření**;
- Model owns the latest frontier benchmark snapshot;
- Section 1 owns Gradually adoption/coding-agent evidence and the long-term Epoch capability curve;
- all factual/definitional/product/benchmark claims come from real sources;
- every externally realizable semantic article has a direct primary citation and at least one concrete cited example when a defensible example exists;
- MCP is defined from the MCP 2026-07-28 specification and includes the official SDK weather-server example;
- Skills, Tools, Tool Calling, Code Execution, Sandbox, Plugin, Script, and Hooks each carry their own direct citation + concrete example rather than borrowing a generic Harness citation;
- remove “v této práci” / equivalent self-referential published prose;
- Temperature and Model Provider included under Inference;
- 2D embedding graph: Czech labels, no label/axis collisions;
- second 3D pedagogical embedding graph demonstrating additional dimensionality;
- ReAct/Agent Loop diagram simplified to the locked five-node loop;
- State wording describes facts/data as **state**, never as facts “owned by State”;
- real Harness examples: Claude Code CLI, Google Antigravity IDE, ChatGPT web;
- distinct semantic articles for **AGENTS.md** and **CLAUDE.md**, each with its locked first-party citation contract;
- distinct semantic articles for **.agents/** and **.claude/**, each with its locked first-party citation contract;
- **Graf pracovního postupu (Workflow Graph)** under **Orchestrace agentů** uses Claude Code **Dynamic Workflows** as its primary contemporary implementation/example and explicitly documents the `ultracode` trigger from official Anthropic sources;
- **Swarm** included under **Orchestrace agentů**, grounded primarily in official Kimi K2.5 Agent Swarm documentation;
- school semantics/formatting contract remains binding for the submission profile;
- unnumbered semantic articles are excluded from the school PDF contents but remain available to the richer web Structure UI;
- 3.1 DarkFactory remains generated rather than hand-reconstructed;
- no legacy/transitional compatibility structure is kept merely to preserve old paths.

If a side agent finds a conflict between two locked requirements, it must stop that conflicting subchange and report the conflict rather than silently choosing one.


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
- **Future school-rule revisions:** the plan is aligned to the currently published GJKT IVT 2026 requirements; if GJKT publishes a newer IVT-specific rule set before submission, reconcile it in Phase 12 rather than guessing changes now.
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
- explicitly contrast broad AI adoption with the still-low estimated usage of coding agents using the user-selected Gradually 2026 source, with its editorial-estimate caveat preserved;
- include the **long-term model capability/improvement curves** from a stable longitudinal source;
- keep these as motivation/context, not as a detailed benchmark survey.

The latest point-in-time frontier-model benchmark comparison belongs in 2.1 Jazykový model, not in Section 1.

### 2 Teoretická část

Rename the top-level section from the longer current title to exactly **Teoretická část**.

Theory opening scope/transition prose is rendered directly under **2 Teoretická část** without a numbered `Úvod` child.

#### 2.1 Jazykový model

Split the current combined **Jazykový model a inference** section. This section owns the model itself, its representation, generation controls, and provider boundary.

Target internal structure and exact numbering are fixed in the Locked implementation contract above.

Model-provider wording must describe the externally supplied model/service boundary from real provider/API documentation, not invent a new architectural abstraction.

Temperature must be sourced from real model/API documentation and explain its effect without overstating deterministic semantics.

##### Evidence ownership between Section 1 and 2.1

Section 1 owns:
- broad AI adoption/usage;
- the restored dot-style adoption/usage diagram;
- the contrast between broad AI adoption and directly measured coding-agent usage;
- long-term model capability/improvement curves.

Section 2.1 owns:
- the **latest frontier-model benchmark comparison** only, pinned to an exact benchmark/version/date.

Do not duplicate these surfaces across both sections.

Current source anchors:
- Gradually AI, “How Many People Use AI? Facts & Figures 2026” (23 Aug 2026) for the Section 1 world-population dot diagram and its explicitly qualified coding-agent estimate;
- Epoch AI ECI for the long-term capability curve;
- Artificial Analysis Intelligence Index v4.3.2 (September 2026), or a newer stable version available when implemented, for the latest model comparison.

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

Inference is not a separate level-2 section. It is **2.1.2 Inference** inside **2.1 Jazykový model**, combining the former “Generování a poskytování” material with inference execution/limits.

#### 2.2 Harness

Harness follows **2.1 Jazykový model** and its **2.1.2 Inference** subsection.

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

#### 2.3 AI-asistovaný vývoj a agentické inženýrství

Merge the current **AI-asistovaný vývoj** and **Agentické inženýrství** level-2 sections into one second-level section after Harness.

The section explains how model + inference + harness capabilities are deliberately used to develop software.

Its exact numbered groups and unnumbered article order are fixed in the Locked implementation contract above. **Review is part of Zadání a způsob práce. AGENTS.md and CLAUDE.md are separate articles; .agents/ and .claude/ are separate Harness extension articles.**

### 3 Praktická část

Practical opening Theory → realization → evidence prose is rendered directly under **3 Praktická část** without a numbered `Úvod` child.

#### 3.1 DarkFactory

Keep empty in hand-maintained source until generated documentation is integrated.

Do not recreate manual architecture prose.

#### 3.2 Životní cyklus změny

Target numbered structure:
- Zadání a plán
- Implementace
- Ověření a revize
- Finalizace
- Přerušení a obnova

Opening and closing framing prose remains, but without separate numbered Úvod/Závěr headings.

Rewrite only from actual DarkFactory behavior/evidence and keep ownership distinct from generated 3.1 documentation.

#### 3.3 Vyhodnocení

Target numbered structure:
- Ověření mechanismů
- Ověření systému
- Ověření na repozitářích
- Výzkumné otázky
- Diskuse a omezení

Opening and closing framing prose remains, but without separate numbered Úvod/Závěr headings.

Results report evidence, not architecture.

### 4 Závěr

Final synthesis only after Results are pinned. Do not repeat Results prose.

## Execution order from this revision

### Phase 1 — Structural migration and durable-rule synchronization

This phase is **structure-only** except for the minimum sourced definitions required for newly introduced schema records. It must not redesign figures, restore statistics, collect screenshots, or perform the full prose rewrite.

- apply the new work title everywhere;
- rename section 2 to **Teoretická část**;
- remove synthetic numbered Theory/Practical Úvod/Závěr child sections and migrate their prose into section-owned opening/closing framing;
- make **Jazykový model** 2.1 and merge inference into **2.1.2 Inference**;
- make **Harness** 2.2;
- merge AI-asistovaný vývoj + Agentické inženýrství into **2.3**;
- make unnumbered concept articles excluded from the school PDF contents while remaining available to the web Structure UI;
- align the GJKT school-PDF template/front matter/numbering contract defined above;
- rename the extensions group to **Rozšíření**;
- add Temperature, Model Provider, Review, AGENTS.md, CLAUDE.md, .agents/, and .claude/ as the distinct locked concepts defined above;
- update manifests, relations, vocabulary ownership, README, and `AGENTS.md`;
- remove superseded structure rather than keeping compatibility paths;
- verify semantic graph resolution and rendered hierarchy.

Exit:
- hierarchy/vocabulary are structurally frozen under the new design;
- `AGENTS.md`, README, manifests, and PLAN agree.

### Phase 2 — Section 1 evidence restoration + 2.1 benchmark snapshot

Section 1:
- implement the Gradually-derived 2,500-dot world-population visualization defined above;
- preserve the source’s exact category semantics and explicitly label the coding-agent value as an editorial estimate;
- verify and restore the Epoch AI long-term model capability curve;
- record source population, observation date, methodology, and caveats.

Section 2.1:
- verify a current frontier-model comparison pinned to benchmark/version/date;
- keep it compact and point-in-time; do not duplicate the long-term curves or adoption evidence from Section 1.

Exit:
- Section 1 has sourced adoption/coding-agent usage evidence and long-term capability curves;
- 2.1 has the latest benchmark snapshot;
- the coding-agent estimate is represented with Gradually’s stated caveats and provenance;
- the 2,500-dot diagram is sourced and publication-ready.

### Phase 3 — Model / 2.1.2 Inference rewrite and visuals

- rewrite 2.1 Jazykový model from source-backed responsibilities;
- rewrite **2.1.2 Inference** as the single owner of Model Provider, Inference Engine, Temperature, Context Window, KV Cache, and Context Rot;
- rebuild 2D embedding figure;
- add sourced 3D projection;
- citation pass across 2.1;
- apply the direct-source + concrete-example contract to every 2.1 article where an implementation/example exists.

Exit:
- architecture/representation and inference responsibilities are cleanly separated inside 2.1 and all factual claims/visual relations are sourced.

### Phase 4 — Harness rewrite, terminology, diagrams, examples

- audit/rewrite Harness articles;
- correct State wording;
- simplify ReAct diagram;
- rename group to Rozšíření;
- source and finalize the distinct .agents/ and .claude/ extension/configuration articles from the locked OpenAI/Anthropic first-party documentation;
- add real Claude Code CLI, Antigravity IDE, and ChatGPT web screenshots with provenance;
- remove self-referential wording;
- source every product/mechanism claim;
- enforce the locked direct citation + concrete example pairs for Agent Loop, Session, Transcript, State, Environment, Tools, Tool Calling, Code Execution, Sandbox, Skills, Plugin, Script, Hooks, MCP, .agents/, and .claude/.

Exit:
- Harness is understandable independently of DarkFactory and grounded in real systems.

### Phase 5 — Merge/rewrite AI-assisted development + Agentic Engineering

- physically merge the old level-2 sections into the locked 2.3 hierarchy;
- add Review under Zadání a způsob práce;
- split the former umbrella project-instructions concept into separate AGENTS.md and CLAUDE.md articles and cite them from the locked OpenAI/Anthropic first-party documentation;
- preserve the locked group/article order while rewriting transitions into a continuous software-development argument;
- aggressively deduplicate against Model, Inference, and Harness;
- remove “v této práci” style wording;
- source every definitional/mechanistic claim;
- apply the direct-source + concrete-example contract to every 2.3 article where an authoritative implementation/example exists;
- source/finalize **Graf pracovního postupu (Workflow Graph)** using official Claude Code Dynamic Workflows documentation, including the `ultracode` trigger and dynamically generated JavaScript orchestration-harness behavior;
- add/finalize **Swarm** under Orchestrace agentů using official Kimi K2.5 Agent Swarm as the primary concrete source/example.

Exit:
- one coherent level-2 section follows Harness and explains deliberate agentic software-development practice.

### Phase 6 — Theory-wide source and single-owner pass

Audit:
1. 2.1 Jazykový model, including 2.1.2 Inference;
2. 2.2 Harness;
3. 2.3 AI-asistovaný vývoj a agentické inženýrství.

For every claim/concept:
- establish one semantic owner;
- establish a real primary source where externally factual;
- verify the direct definition/mechanism citation is rendered claim-locally;
- verify at least one concrete cited example is rendered whenever a defensible real example exists;
- record any concept for which no real example exists rather than inventing one;
- delete paraphrased duplication;
- replace unnecessary restatement with canonical references.

Produce the internal concept-level source/example audit table defined in the Direct citation + concrete example contract and close every unresolved row before Theory is declared final.

Prune unused bibliography entries only after prose stabilizes.

### Phase 7 — Rewrite remaining Section 1 against final Theory

Finalize:
- argument;
- goals/subgoals;
- research questions;
- methodology.

Ensure the research frame maps onto evidence that can actually be collected.

### Phase 8 — Finalize hand-maintained Practical shell

- keep section-owned Practical opening/closing framing unheaded;
- keep 3.1 DarkFactory generated/empty in hand-maintained source;
- rewrite/finalize 3.2 lifecycle only from actual DarkFactory behavior.

### Phase 9 — Integrate autogenerated DarkFactory docs into 3.1

- pin the DarkFactory revision;
- generate canonical docs;
- map generated hierarchy into 3.1;
- prevent duplication with Theory and 3.2;
- preserve traceability/reproducibility.

### Phase 10 — Pin evidence and rewrite Results

Pin:
- DarkFactory commit;
- target-repository commits;
- workflow/CI runs;
- generated docs snapshot.

Then rewrite/finalize 3.3 around concrete reproducible evidence.

### Phase 11 — Thesis-wide deduplication and final alignment

Audit:
- Section 1 ↔ Theory;
- Theory ↔ generated 3.1;
- Theory/generated docs ↔ 3.2;
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

- re-check the GJKT Maturity page for any newer IVT-specific rules and reconcile them before final export;
- positive validator only;
- validate the full school compliance contract: front-matter order, title page, declaration, annotation line count, 3–5 keywords, contents behavior, list of figures position, Times New Roman/black/12pt, margins, 1.5 spacing, header/footer, page reset at Úvod, numbered levels 1–3, figure/table numbering, conclusion >=12 rendered lines, >=2,500 words, ISO-690 bibliography title/order;
- generate and inspect both **PDF and DOCX** submission artifacts;
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
- 2.1.2 Inference is the single inference subsection inside 2.1 Jazykový model;
- Harness is 2.2;
- AI-asistovaný vývoj and Agentické inženýrství form coherent section 2.3;
- Theory and Practical use unheaded section-owned framing instead of synthetic numbered Úvod/Závěr children;
- Review exists under Zadání a způsob práce;
- AGENTS.md, CLAUDE.md, .agents/, and .claude/ each have distinct semantic ownership and first-party citations matching the exact mechanism claimed;
- Workflow Graph is owned under Orchestrace agentů and source-backed by official Claude Code Dynamic Workflows documentation, with `ultracode` represented accurately as a trigger/setting rather than the product name;
- Swarm is owned under Orchestrace agentů and source-backed by official Kimi Agent Swarm documentation;
- all factual/definitional claims are source-backed;
- every externally realizable Theory concept has a rendered direct primary citation and a concrete cited example where one defensibly exists;
- MCP, Skills, Tools, Tool Calling, Code Execution, Sandbox, Plugin, Script, and Hooks satisfy their locked source/example contracts;
- self-referential “in this work” wording is removed;
- Section 1 adoption, coding-agent usage, and long-term model-improvement evidence is pinned and cited;
- the latest model benchmark comparison in 2.1 is pinned and cited;
- diagrams are clean, sourced, and pedagogically accurate;
- real harness examples use real screenshots with provenance;
- 3.1 comes from generated DarkFactory documentation;
- 3.2 owns lifecycle behavior;
- 3.3 owns evidence;
- semantic duplication is eliminated;
- final research questions, Results, and Conclusion align;
- the school-PDF profile satisfies the GJKT IVT semantic and formatting contract;
- PDF and DOCX submission artifacts are generated and visually checked;
- all publication outputs are green and internally consistent.
