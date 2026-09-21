# DarkFactory-Paper — Completion Plan

This file is the finite execution roadmap for finishing the thesis. Durable writing, terminology, structure, citation, and repository rules live in `AGENTS.md`.

## Completion target

Deliver a submission-ready Czech thesis and publication set in which:

- the final hierarchy is stable and semantically meaningful;
- every intended concept is present exactly once and indexed;
- theory is concise, sourced, and implementation-agnostic;
- Practical describes the verified DarkFactory implementation rather than the intended design;
- Results are based on reproducible evidence;
- methodology, goals, research questions, answers, introduction, and conclusion agree with the finished work;
- final/review PDF, HTML, and Markdown build cleanly and render correctly.


## Pending redesign — conversation lock

**Status: planning only. Do not implement until explicitly approved in conversation.**

This gate supersedes the currently implemented theory hierarchy and terminology API once approved.

### Locked target changes

- **2.2 → AI-asistovaný vývoj**. Remove the separate 2.2.1 AI-assisted group; keep the Software Engineering article, Vibe Coding, and Slop directly under 2.2.
- Add **Inference Engine** under Model.
- **2.4.3 → Dovednosti a rozšíření**.
- Remove the duplicate standalone Harness article; keep one numbered **Harness** section whose section body owns the definition.
- Remove the duplicate standalone Agentic Engineering article; keep one numbered **Agentické inženýrství** section, Czech only.
- All terms render Czech-first with at most one alternate term.
- Required target forms include:
  - **Mezipaměť klíčů a hodnot (KV Cache)**
  - **Degradace kontextu (Context Rot)**
  - **Agentické inženýrství**
  - **Harness**

### Proposed concept terminology API

Replace `industry`, `czech`, `english`, `alias`, and boolean `keyword` with only two optional terminology fields:

- `term`: the canonical Czech-first term when a Czech term is useful;
- `keyword`: the canonical industry/alternate keyword.

At least one of `term` or `keyword` must be present.

The renderer has exactly three legal states:
- `term` only → `term`
- `term` + `keyword` → `term (keyword)`
- `keyword` only → `keyword`

A concept is included in the front keyword list / encyclopedia iff `keyword != none`. Therefore single established terms such as `RAG`, `Harness`, `Transformer`, or `MCP` can be represented as `term: none, keyword: "..."` without inventing a duplicate alternate term. No independent keyword boolean remains.

After approval, remove all old multi-surface helpers and migrate `term(...)`, sorting, keyword generation, encyclopedia generation, concept schema, validators, theory, Practical, and docs atomically. Do not maintain a compatibility API.

### Semantic deduplication rule

Every definition, fact, mechanism, distinction, example, limitation, and piece of evidence has one canonical owner.

Elsewhere:
- reference the owning concept only when the relationship adds new information;
- never redefine or paraphrase another concept as background;
- section introductions explain grouping/transition only;
- Practical explains only the DarkFactory-specific realization/delta;
- Results report evidence rather than restating architecture;
- Conclusion answers goals/questions without reproducing Results;
- cross-concept mentions use canonical `term(...)` references.

Do not use crude word-frequency thresholds; the target is semantic non-duplication, not unnatural Czech.

### Level-2 section framing rule

Every substantive level-2 section must be framed by its own numbered **Úvod** and **Závěr** subsections.

Apply this to:
- 2.2 AI-asistovaný vývoj
- 2.3 Model
- 2.4 Harness
- 2.5 Agentické inženýrství
- 3.2 Architektura DarkFactory
- 3.3 Životní cyklus požadavku
- 3.4 Výsledky a diskuse

Do not recursively add Úvod/Závěr under sections that are themselves already an Úvod or Závěr.

Semantic ownership:
- **Úvod** may only define the scope, purpose, reading order, and relationships among the child sections/concepts. It must not pre-summarize or redefine them.
- **Závěr** may only synthesize what the section established, make the transition to the next major section, and state distinctions that emerge only from considering the section as a whole. It must not repeat child definitions, examples, evidence, or prose.
- If a level-2 section has no meaningful synthesis beyond repeating its children, its Závěr should be extremely short rather than padded.
- Section-level Úvod/Závěr are structural prose, not semantic concepts, and do not enter the concept/keyword graph.

Expected numbering pattern:
- 2.2.1 Úvod
- internal numbered groups
- final 2.2.x Závěr
and analogously for every listed level-2 section.

### Candidate hierarchy — causal reading order

The hierarchy must read as one argument:

**how AI changes software development → what the model is and can do → what the harness adds around it → how agentic behavior is deliberately engineered → how DarkFactory realizes those ideas → what the evidence establishes.**

Do not preserve an existing concept merely because it already has a file. Every numbered group and every standalone article must earn its place in that causal chain.

#### 2 Teoretická část

- **2.1 Úvod**
  - establishes the causal chain above and the scope boundary: model training is outside the thesis.

- **2.2 AI-asistovaný vývoj**
  - **2.2.1 Úvod**
    - explains the shift from code generation/chat assistance toward agent-driven software work.
    - concepts directly after the introduction: Vibe Coding, Slop.
  - **2.2.2 Specifikace a plánování**
    - Vývoj řízený specifikací (Spec-Driven Development)
    - Plánování (Planning)
  - **2.2.3 Řízení změn a ověřování**
    - Správa verzí (Version Control)
    - Větev (Branch)
    - Pull Request
    - Průběžná integrace (CI)
    - Integrační test (Integration Test)
  - **2.2.4 Závěr**
    - derives the need for explicit state, feedback, and machine-verifiable boundaries when more work is delegated to AI.
  - Remove the standalone Software Engineering article unless a unique semantic responsibility is found for it.

- **2.3 Model**
  - **2.3.1 Úvod**
    - defines the model as the probabilistic inference component consumed by the surrounding system.
  - **2.3.2 Jazykový model**
    - Velký jazykový model (LLM)
    - Transformer
    - Tokenizér (Tokenizer)
    - Token
    - Vektorová reprezentace (Embedding)
  - **2.3.3 Inference**
    - Inferenční engine (Inference Engine)
    - Kontextové okno (Context Window)
    - Mezipaměť klíčů a hodnot (KV Cache)
  - **2.3.4 Limity modelu**
    - Degradace kontextu (Context Rot)
    - Divergence modelu
  - **2.3.5 Závěr**
    - establishes that the model can generate/choose but does not itself own persistent state, tools, environment, authorization, or reliable long-running control.

- **2.4 Harness**
  - no duplicate Harness article; the section introduction owns the definition.
  - **2.4.1 Úvod**
    - answers what must be added around model inference to obtain a persistent acting system.
  - **2.4.2 Běh a stav**
    - Agentní smyčka (Agent Loop)
    - Agentní sezení (Session)
    - Tah (Turn)
    - Přepis (Transcript)
    - Stav (State)
  - **2.4.3 Prostředí a nástroje**
    - Prostředí agenta (Agent Environment)
    - Nástroje (Tools)
    - Vyvolávání nástrojů (Tool Calling)
    - Spouštění kódu (Code Execution)
    - Izolované prostředí (Sandbox)
    - Kontejner (Container)
  - **2.4.4 Dovednosti a rozšíření**
    - Dovednosti (Skills)
    - Pluginy
    - Skripty (Scripts)
    - Hooks
    - Model Context Protocol (MCP)
  - **2.4.5 Závěr**
    - establishes that Harness provides execution, continuity, action surfaces, and extensibility but not the higher-level strategy for using them.
  - Remove generic Runtime as a standalone concept unless it proves a unique responsibility not already owned by Inference Engine, Environment, Sandbox, or Container.
  - Replace JSON Schema Tool Calling as a taxonomy concept with the broader Tool Calling; JSON Schema belongs in its mechanism/prose where relevant.
  - Agent Loop and ReAct must not be treated as synonyms; ReAct is a pattern/example of an agent loop.

- **2.5 Agentické inženýrství**
  - no duplicate Agentic Engineering article; section introduction owns the definition.
  - **2.5.1 Úvod**
    - answers how the capabilities supplied by the harness are deliberately composed and constrained to produce useful agentic behavior.
  - **2.5.2 Instrukce a kontext**
    - Promptové inženýrství (Prompt Engineering)
    - Systémový prompt (System Prompt)
    - Kontextové inženýrství (Context Engineering)
    - Vkládání kontextu (Context Injection)
    - Kompakce kontextu (Context Compaction)
    - RAG
    - Prompt Injection
  - **2.5.3 Řízení autonomie**
    - Cílené smyčky (Goal Loops)
    - Guardrail
    - Člověk ve smyčce (HITL)
  - **2.5.4 Orchestrace agentů**
    - Subagent
    - Orchestrátor (Orchestrator)
    - Předání řízení (Handoff)
    - Pracovní graf (Workflow Graph)
    - Orientovaný acyklický graf (DAG), if its definition is still necessary after Workflow Graph is written
    - Swarm should be demoted to an orchestration example/pattern unless its final prose proves a unique conceptual responsibility.
  - **2.5.5 Závěr**
    - connects context, control, and orchestration into the design discipline that Practical then realizes.

#### 3 Praktická část

- **3.1 Úvod**
  - states that Practical demonstrates the realization of the theoretical chain in DarkFactory and distinguishes architecture from evidence.

- **3.2 DarkFactory**
  - no duplicate DarkFactory article.
  - **3.2.1 Úvod**
    - introduces the implementation boundaries and the architecture schematic.
  - **3.2.2 Vykonávací jádro**
    - Protokol DarkFactory (Protocol)
    - Stav běhu (Run State)
    - Směrování modelu (Model Routing)
    - Dohled nad během (Supervisor)
    - Zachycení výsledku (Result Capture)
    - Obnova běhu (Recovery)
  - **3.2.3 Rozšiřitelnost systému**
    - Capability
    - Capability ABI
    - Adaptér capability (Capability Adapter)
  - **3.2.4 Řídicí vrstva a identita**
    - GitHub jako řídicí vrstva (GitHub Control Plane)
    - Keychain
    - Autentizace uživatele (Auth)
  - **3.2.5 Rozhraní**
    - df CLI
    - DarkFactory Web
    - DarkFactory Docs
  - **3.2.6 Závěr**
    - synthesizes how the implementation realizes Harness and Agentické inženýrství without repeating theory.

- **3.3 Životní cyklus požadavku**
  - **3.3.1 Úvod**
    - gives the ordered lifecycle and states which mechanisms are cross-cutting.
  - **3.3.2 Zadání a plánování**
    - Požadavek (Request)
    - Plán DarkFactory (Planning)
  - **3.3.3 Implementace**
    - structural prose only unless a genuinely unique concept emerges.
  - **3.3.4 Ověření a revize**
    - Deterministické ověření (Deterministic Verification)
    - Smyčka revize a opravy (Review/Fix Loop)
  - **3.3.5 Finalizace a integrace**
    - Finální kontrola souladu (Final Alignment)
    - Rekonciliace stavu (Reconciliation)
  - **3.3.6 Přerušení a obnova**
    - references the already-owned Recovery concept; no duplicate Recovery article.
  - **3.3.7 Závěr**

- **3.4 Vyhodnocení**
  - **3.4.1 Úvod**
    - identifies the fixed evidence snapshot; does not duplicate methodology from 1.3.
  - **3.4.2 Ověření mechanismů**
    - automated tests / CI evidence for individual mechanisms.
  - **3.4.3 Ověření systému**
    - integrated runtime and full-lifecycle evidence, including the bounded result that a live complete df-only lifecycle was not demonstrated at the evidence cutoff.
  - **3.4.4 Ověření na repozitářích**
    - DarkFactory, omnis, ChessWithQuests, DarkFactory-Paper, archived targets distinguished.
  - **3.4.5 Výzkumné otázky**
    - O1–O3 as document answers, not semantic glossary concepts.
  - **3.4.6 Diskuse a omezení**
    - document prose, not an indexed domain concept.
  - **3.4.7 Závěr**

- **4 Závěr**
  - closes the thesis only at the level of goals/questions and established evidence; does not reproduce Results.

### Decisions required before implementation

1. **Resolved terminology-state contract:** `term` and `keyword` are both optional but at least one is required. `keyword` controls keyword/index inclusion and may stand alone as the rendered concept name when no Czech-first `term` is useful.
2. Confirm **2.3.2 Inference** or choose a Czech section label; likely article: **Inferenční engine (Inference Engine)**.
3. Confirm the Czech-first Software Engineering article, likely **Softwarové inženýrství (Software Engineering)**.
4. Confirm that Czech-first does not force artificial translations: established terms such as Harness, Transformer, Token, MCP, Vibe Coding, and possibly Prompt Injection may remain the canonical `term`.
5. Confirm Dovednosti a rozšíření semantics: Skills sibling of Plugins; Plugins owns Tools/Scripts/Hooks/MCP; Tools owns JSON Schema Tool Calling/Code Execution.
6. Apply the same term/keyword model to all DarkFactory-specific Practical concepts.

### Implementation order after approval

1. Lock the six decisions above.
2. Update AGENTS.md + positive validators to the approved target only.
3. Migrate schema/renderers atomically to `term` + optional `keyword`.
4. Migrate all concepts; remove duplicate Harness/Agentické inženýrství articles.
5. Add Inference Engine and apply the final theory hierarchy.
6. Migrate Practical terminology.
7. Perform the thesis-wide single-owner deduplication pass.
8. Regenerate keywords/encyclopedia under the new semantics.
9. Remove all stale API/docs/validation paths.
10. Run full build/publication QA and inspect rendered output.

**Gate:** none of the implementation steps above may run before explicit approval.

## Phase 1 — Lock structure and concept model

**Status: complete; structure applied, static relation audit clean, and DarkFactory-Paper CI/Deploy/Release verified green on snapshot 5bc04974.**

### Work

- Use folders as numbered structural sections.
- Render semantic concepts as unnumbered, outlined headings that remain visible in the contents.
- Keep semantic relations separate from document nesting.
- Use `dependency`, `related`, `parent`, and `child` explicitly; do not encode semantic ownership through folder nesting.
- Finalize the theory groups:
  - Software Engineering
  - Model
  - Harness
  - Agentic Engineering
- Finalize Practical groups:
  - Úvod
  - Návrh systému DarkFactory
  - Životní cyklus požadavku
  - Výsledky a diskuse
- Add the currently missing concepts:
  - Branch
  - Pull Request
  - State
  - Environment
  - Prompt Injection
  - Loops (Goal Loops)
  - Orchestrator
  - Handoff
  - Swarm
  - Graphs (Workflow Graphs)
- Place DAG under Software Engineering.
- Place Divergence under Model and absorb Semantic Drift.
- Place Sandbox under Harness runtime.
- Place Subagent under Multi-Agent Systems.
- Remove Harness Engineering, Loop Engineering, Graph Engineering, Semantic Drift, and superseded duplicate concept files.
- Keep GitHub/GitHub Actions as implementation evidence rather than theory concepts.
- Update positive structure validation to the new hierarchy.

### Exit criteria

- Every rendered section is numbered.
- Every rendered concept is unnumbered and present in the contents.
- No duplicate concept keys or orphaned intended concepts.
- No semantic relation points at a removed concept.
- `scripts/check_build.py` describes only the new final structure.
- Canonical build reaches the next failure for content/evidence reasons rather than obsolete hierarchy assumptions.

## Phase 2 — Theory source and citation pass A

**Status: complete for pass A; all theory concepts and theory-owned examples have source/citation metadata and claim-local citations where required.**

**Purpose:** make every surviving theoretical concept source-complete before the final prose pass.

### Work

Audit every indexed theory concept for:

- source/citation metadata;
- claim-local inline citations;
- direct/primary source preference;
- terminology accuracy;
- unsupported historical or comparative claims;
- obsolete or weak secondary sources.

Specific source work:

- replace weak or indirect sources for DAG/runtime where a better formal or first-party source exists;
- verify State and Environment against current agent-runtime documentation;
- verify Plugins/Tools/Scripts/Hooks/MCP taxonomy with first-party specifications/docs;
- verify Loops (Goal Loops) against ReAct and current agent workflow literature;
- verify Orchestrator/Handoff/Swarm/Graphs (Workflow Graphs) against first-party multi-agent documentation;
- verify Prompt Injection with OWASP/OpenAI sources, including indirect injection from documents, web content, repositories, email, RAG, and résumé-style attacks;
- verify Divergence wording so thesis-defined scope is clearly separated from cited empirical mechanisms.

### Exit criteria

- Every externally defined theory concept has at least one appropriate authoritative source.
- Every externally verifiable mechanism/history/security claim is cited where asserted.
- Thesis-defined terminology is explicitly marked as thesis-defined.
- No citation exists merely because it is topically related.

## Phase 3 — Methodology, goals, and research questions pass A

**Status: complete for pass A; final answers remain intentionally deferred to Phase 7.**

**Purpose:** align the research framing with the architecture we are actually documenting before Results are written.

### Work

Rewrite and normalize:

- motivation;
- main goal;
- partial goals;
- methodology;
- research questions;
- expected form of evidence;
- mapping from each goal/question to the Practical/Results section that can answer it.

For every research question define:

- what exactly is being asked;
- what evidence can answer it;
- what evidence would *not* justify the answer;
- whether the answer is architectural, functional, empirical, or comparative.

Do not write final answers yet. Replace unsupported answer-like prose with explicit evaluation requirements.

### Exit criteria

- Every goal is measurable or demonstrable within the thesis scope.
- Every research question has a concrete evidence path.
- No question requires evidence the project will not collect.
- Methodology describes the actual evaluation strategy, not a generic school template.

## Phase 4 — Final theory rewrite pass

**Status: complete; theory structure, concept boundaries, citations, and prose have been aligned to the final taxonomy.**

**Purpose:** rewrite the now-stable, sourced theory as one coherent argument.

### Work

For every concept:

- tighten definition;
- remove duplicated explanation;
- remove generic motivation;
- enforce Czech technical prose and canonical concept rendering;
- normalize cross-references;
- ensure surrounding section grouping creates a natural reading order;
- add only examples/figures that materially improve comprehension;
- remove product-specific implementation claims from theory.

Focus transitions on the conceptual backbone:

1. Software Engineering explains reliable software change.
2. Model explains the inference component and its limits.
3. Harness explains runtime state, environment, loop, and extension machinery around the model.
4. Agentic Engineering explains techniques for directing that machinery toward goals, context management, and multi-agent coordination.

### Exit criteria

- Every theory sentence adds definition, mechanism, distinction, consequence, evidence, or a necessary relation.
- No concept repeats another concept's responsibility.
- Section transitions explain why the next group is needed.
- Theory is ready to stand independently of DarkFactory.

## Phase 5 — Practical evidence map and architecture writing

**Status: complete; the architecture and governed Request lifecycle are written from current DarkFactory implementation evidence, the architecture schematic is included, and implementation claims are bounded to observed code/tests/workflows rather than planned behavior.**

**Purpose:** write Practical from the implementation outward.

### Evidence baseline

Inspect the current DarkFactory repository and submodule snapshot for:

- `@darkfactory/protocol`;
- `@darkfactory/core`;
- `@darkfactory/capability`;
- `@darkfactory/github`;
- `@darkfactory/keychain`;
- `@darkfactory/auth`;
- `@darkfactory/docs`;
- `@darkfactory/cli`;
- `@darkfactory/web`;
- first-party capabilities;
- workflow/state/recovery contracts;
- CI and repository governance;
- generated/release artifacts.

### Write 3.2 Návrh systému DarkFactory

#### Cíle návrhu
- concrete system problem;
- constraints;
- why persistent governed agent execution is needed.

#### Celková architektura
- DarkFactory;
- architecture diagram;
- responsibility boundaries;
- data/control flow;
- durable versus transient state.

#### Vykonávací jádro a stav
- Protocol;
- Run State;
- Model Routing;
- Supervisor;
- Result Capture;
- Recovery;
- execution kernel and graph/run state;
- provider/model routing, failover, turn limits, time budgets, quota admission, and capability-tier escalation.

#### Systém capabilities
- Capability;
- Capability ABI;
- Capability Adapter;
- discovery/loading/resolution;
- first-party capabilities;
- domain versus capability distinction.

#### Externí integrace
- GitHub Control Plane;
- repository operations;
- PR/check integration;
- external services used by the actual implementation.

#### Identita a bezpečnostní hranice
- Keychain;
- Auth / Browser Authentication;
- machine credentials versus human/browser identity;
- trust boundaries;
- secret custody.

#### Rozhraní
- df CLI;
- DarkFactory Web;
- DarkFactory Docs.

### Write 3.3 Životní cyklus požadavku

Ground each stage in code/workflow evidence:

1. Zachycení požadavku — Request
2. Plánování a schválení — Planning + Review/Fix Loop
3. Implementace
4. Ověření a revize — Deterministic Verification
5. Finalizace a integrace — Final Alignment + Reconciliation
6. Obnova a pokračování — reuse the Recovery mechanism defined in architecture

### Exit criteria

- Every implementation claim can be traced to code, configuration, tests, workflows, or generated artifacts.
- Planned but unimplemented behavior is excluded or explicitly identified.
- Package names support architectural explanations rather than replacing them.

## Phase 6 — Results and evaluation

**Status: complete at the thesis evidence cutoff of 21 September 2026. Technical CI/test evidence and available target-repository evidence are reported; the absence of one live df-only Request lifecycle and complete fleet acceptance is recorded as a bounded evaluation limitation rather than unfinished thesis work.**

### Build the evidence set

Collect reproducible evidence for:

- build/test/check success;
- end-to-end request lifecycle;
- state persistence and resume;
- deterministic verification;
- branch/PR/check behavior;
- capability loading/execution;
- authentication/credential boundaries where testable;
- representative target-repository operation.

### Write 3.4

#### Metoda ověření
Define tested configuration, repositories, commands, artifacts, and acceptance conditions.

#### Technické výsledky
Report observed test/build/validation results.

#### End-to-end ověření
Demonstrate a complete governed request lifecycle.

#### Ověření na cílových repozitářích
Report only repositories actually exercised and the evidence produced.

#### Vyhodnocení cílů a výzkumných otázek
Answer each question directly from the evidence.

#### Omezení
State what was not measured or cannot be generalized.

#### Diskuse
Interpret results without introducing unsupported superiority claims.

### Exit criteria

- Every result is evidence-backed.
- No architecture claim is presented as a measured result.
- No general benchmark/comparative claim is made without an actual experiment.
- Each research question has a direct, bounded answer.

## Phase 7 — Alignment pass B

**Status: complete against the currently available evidence; introduction, conclusion, title metadata, annotation, abstract, methodology, goals, research questions, bounded answers, citation set, and evidence boundaries are aligned. Reopen only if new live end-to-end evidence materially changes the Results.**

**Purpose:** make the framing and sourcing exactly match the finished thesis.

### Citation pass B

- audit every external claim in final prose;
- remove unused bibliography entries;
- replace any remaining indirect citation where a direct source is available;
- verify every citation supports the exact surrounding claim;
- verify figures/examples have appropriate source attribution.

### Methodology/goals/questions pass B

Rewrite again using the completed Practical and Results:

- motivation;
- methodology;
- main and partial goals;
- research questions;
- final answers;
- limitations.

Then rewrite:

- Úvod;
- Závěr;
- annotations/abstract;
- keywords.

The conclusion must answer only what the Results established.

### Exit criteria

- goals, questions, answers, results, and conclusion form a closed chain;
- no promised evaluation is missing;
- no final claim exceeds the evidence;
- bibliography contains only used/relevant sources;
- the front-matter keyword list and appendix encyclopedia derive from the same canonical `keyword: true` concepts.

## Phase 8 — Publication and submission QA

**Status: machine-verifiable QA complete; canonical CI, Deploy Documentation, and Release are green and the deployed publication matches the validated manuscript head. Generated HTML/Markdown structure, internal anchors, images, bibliography, contents, keyword list, and encyclopedia/index were checked. The only remaining item is literal page-by-page visual inspection of the newest PDF, which is blocked by the current connector's inability to materialize the deployed PDF binary.**

### Content QA

- terminology consistency;
- Czech grammar/style;
- section/concept ordering;
- contents;
- encyclopedia/index;
- figures and captions;
- cross-references;
- bibliography;
- appendix placement.

### Build QA

Run:

```bash
make all BOOK=DarkFactory
make web-check
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

Verify:

- final/review PDF;
- final/review HTML;
- final/review Markdown;
- generated site;
- links/assets;
- viewer structure tree;
- concept headings unnumbered;
- section headings numbered.

Inspect the final PDF page by page.

### Repository cleanup

- remove unused/superseded concept files;
- remove stale review wrappers;
- remove obsolete bibliography entries;
- remove temporary planning/review artifacts;
- ensure README, AGENTS.md, validation, and actual structure agree.

### Exit criteria

- all canonical checks green;
- all publication artifacts valid;
- final PDF visually inspected;
- no known unresolved review marker;
- repository contains only the final thesis architecture and supporting source.
