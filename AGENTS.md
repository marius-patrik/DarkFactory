# DarkFactory-Paper Agent Rules

## Thesis argument

Section 1 owns the argument of the thesis. The rest of the document demonstrates it instead of repeating it.

Canonical argument:

**jak AI mění vývoj softwaru → co model skutečně je a dokáže → co kolem něj přidává Harness → jak se tyto mechanismy záměrně skládají do agentního chování → jak je realizuje DarkFactory → co o výsledku ukazují důkazy**

Top-level sections remain:

1. Úvod
2. Teoretická část: Agentní vývoj softwaru
3. Praktická část
4. Závěr

## Structural model

Document hierarchy and semantic vocabulary are separate.

- Folder = numbered structural section.
- Concept = unnumbered semantic article visible in the contents.
- A structural section may itself own a semantic term when duplicating it as an article would add no meaning. Harness and Agentické inženýrství use this mechanism.
- Semantic relations are independent of folder nesting.
- Manifest sequence is the only article reading order; semantic dependencies and parent/child relations never reorder sections, concepts, or examples.
- Supported relation types: `dependency`, `related`, `parent`, `child`.
- Do not create a concept merely because an implementation type/package exists.
- Do not preserve a concept because it existed historically. Every article must own unique semantic meaning.

Every substantive level-2 section uses **Úvod** and **Závěr** as framing sections, except an intentionally generated section whose internal structure is supplied externally.

Úvod may establish scope, purpose, reading order, and relationships. It must not pre-repeat child definitions.

Závěr may synthesize a relationship visible only after reading the whole section and bridge to the next major section. It must not restate child definitions, examples, or evidence.

## Canonical current hierarchy

### 1 Úvod

- 1.1 Motivace a vymezení problému
- 1.2 Východisko a argument práce
- 1.3 Cíle práce
  - 1.3.1 Hlavní cíl
  - 1.3.2 Dílčí cíle
- 1.4 Výzkumné otázky
- 1.5 Metodika práce

### 2 Teoretická část: Agentní vývoj softwaru

#### 2.1 Úvod

#### 2.2 AI-asistovaný vývoj

- 2.2.1 Úvod
- 2.2.2 Specifikace a plánování
  - Vibe Coding
  - Vývoj řízený specifikací (Spec-Driven Development)
  - Plánování (Planning)
- 2.2.3 Řízení změny
  - Správa verzí (Version Control)
  - Větev (Branch)
  - Pull Request
- 2.2.4 Ověřování kvality
  - Slop
  - Průběžná integrace (CI)
  - Integrační test (Integration Test)
- 2.2.5 Závěr

No standalone Software Engineering article.

#### 2.3 Model

- 2.3.1 Úvod
- 2.3.2 Jazykový model
  - Velký jazykový model (LLM)
  - Transformer
  - Tokenizér (Tokenizer)
  - Token
  - Vektorová reprezentace (Embedding)
- 2.3.3 Inference
  - Inferenční engine (Inference Engine)
  - Kontextové okno (Context Window)
  - Mezipaměť klíčů a hodnot (KV Cache)
- 2.3.4 Limity inference
  - Degradace kontextu (Context Rot)
  - Divergence modelu
- 2.3.5 Závěr

Boundary rule: Model ends with inference and its limits. Persistent task state, actions in an external environment, tools, and long-running control do not belong to Model.

#### 2.4 Harness

Harness is owned by the numbered section itself; there is no duplicate Harness article.

- 2.4.1 Úvod
- 2.4.2 Smyčka a stav
  - Agentní smyčka (Agent Loop)
  - Agentní sezení (Session)
  - Přepis (Transcript)
  - Stav (State)
- 2.4.3 Prostředí a nástroje
  - Prostředí agenta (Agent Environment)
  - Nástroje (Tools)
  - Vyvolávání nástrojů (Tool Calling)
  - Spouštění kódu (Code Execution)
  - Izolované prostředí (Sandbox)
- 2.4.4 Dovednosti a rozšíření
  - Dovednosti (Skills)
  - Pluginy (Plugins)
  - Skripty (Scripts)
  - Hooks
  - MCP
- 2.4.5 Závěr

Do not restore standalone Runtime, Turn, Container, JSON Schema Tool Calling, or Agent Harness unless later writing proves a unique semantic responsibility.

ReAct is a pattern/example of Agent Loop, not an alternate name.

JSON Schema is a tool-interface mechanism inside Tool Calling, not a taxonomy article.

Container is a possible Sandbox realization, not currently a standalone article.

#### 2.5 Agentické inženýrství

Agentické inženýrství is owned by the numbered section itself; there is no duplicate article.

- 2.5.1 Úvod
- 2.5.2 Instrukce a kontext
  - Promptové inženýrství (Prompt Engineering)
  - Systémový prompt (System Prompt)
  - Kontextové inženýrství (Context Engineering)
  - Vkládání kontextu (Context Injection)
  - Kompakce kontextu (Context Compaction)
  - RAG
  - Prompt Injection
- 2.5.3 Řízení agentního chování
  - Cílené smyčky (Goal Loops)
  - Guardrail
  - Člověk ve smyčce (HITL)
- 2.5.4 Orchestrace agentů
  - Subagent
  - Orchestrátor (Orchestrator)
  - Předání řízení (Handoff)
  - Graf pracovního postupu (Workflow Graph)
- 2.5.5 Závěr

DAG is currently a property/special case discussed inside Workflow Graph, not a standalone article.

Swarm is currently an orchestration pattern/example, not a standalone article.

### 3 Praktická část

#### 3.1 Úvod

#### 3.2 DarkFactory

This section is intentionally empty in the hand-maintained thesis source.

Its canonical content will come from autogenerated DarkFactory documentation. Do not manually reconstruct package/architecture prose here and do not keep superseded hand-written DarkFactory architecture files.

The generated documentation should own the final internal 3.2 structure.

#### 3.3 Životní cyklus změny

Target structure:

- Úvod
- Zadání a plán
- Implementace
- Ověření a revize
- Finalizace
- Přerušení a obnova
- Závěr

Use DarkFactory-specific semantic articles only where they own unique meaning: Request, Planning, Result Capture if retained, Deterministic Verification, Review/Fix Loop, Final Alignment, Reconciliation, Recovery if sourced from generated DarkFactory docs.

#### 3.4 Vyhodnocení

Target structure:

- Úvod
- Ověření mechanismů
- Ověření systému
- Ověření na repozitářích
- Výzkumné otázky
- Diskuse a omezení
- Závěr

Research-question answers and evaluation limitations are document sections, not domain glossary concepts unless a later design explicitly proves otherwise.

## Terminology API

There is exactly one terminology API.

Semantic concepts and term-owning sections have only:

- optional `term`
- optional `keyword`

At least one must exist.

Rendering states:

- `term` only → `term`
- `term` + `keyword` → `term (keyword)`
- `keyword` only → `keyword`

`keyword != none` controls inclusion in front-matter keywords and the encyclopedia/index.

Examples:

- `term: "Mezipaměť klíčů a hodnot", keyword: "KV Cache"` → **Mezipaměť klíčů a hodnot (KV Cache)**
- `term: "Degradace kontextu", keyword: "Context Rot"` → **Degradace kontextu (Context Rot)**
- `term: none, keyword: "RAG"` → **RAG**
- `term: none, keyword: "Harness"` → **Harness**
- `term: "Divergence modelu", keyword: none` → **Divergence modelu**

Removed fields must not return: `industry`, `czech`, `english`, `alias`, boolean `keyword`, or multiple rendering surfaces/languages.

Czech-first means use a natural Czech technical term when one exists. Never manufacture a translation merely to fill `term`.

## Single-owner rule

Every semantic statement has one canonical owner.

A semantic statement includes a definition, fact, mechanism, distinction, example, limitation, or piece of evidence.

Another section may mention an owned concept only when the relationship itself adds new information.

Never:

- redefine another concept;
- paraphrase another article as background;
- duplicate examples;
- summarize all child articles in an introduction;
- restate Theory in Practical;
- restate architecture in Results;
- reproduce Results in the Conclusion.

Cross-concept references should use canonical `term(...)` linking wherever grammatically appropriate.

Do not enforce this with crude word-frequency rules. Necessary Czech grammar and explicit semantic references may repeat words.

## Writing and citation rules

- Manuscript prose is Czech.
- Keep natural established technical names unchanged when translation would be artificial.
- Every sentence must contribute definition, mechanism, distinction, consequence, evidence, or a necessary relationship.
- Theory stays implementation-agnostic.
- Practical claims must come from actual DarkFactory code/generated docs/tests/workflows, not plans.
- Prefer primary papers, standards/specifications, and first-party documentation.
- External definitions/mechanisms/history/security/comparisons require claim-local support.
- Thesis-defined terminology must say so explicitly.

## Repository and validation

- Folder manifests are the only document hierarchy source.
- Semantic graph and hierarchy remain separate.
- Front keywords and encyclopedia derive from the same `keyword != none` semantic records.
- Section-owned terms participate in vocabulary and linking.
- Validation asserts only the current positive final contract.
- Do not restore legacy compatibility APIs or historical structure.
- Remove superseded files instead of leaving unused parallel implementations.
