# DarkFactory-Paper Agent Rules

## Canonical thesis identity

- Work title: **DarkFactory: Agentic Engineering in practice (Agentické inženýrství v praxi)**.
- Top-level manuscript sections are exactly **Úvod**, **Teoretická část**, **Praktická část**, and **Závěr**.
- DarkFactory is the practical system studied by the thesis.
- Folder `index.typ` manifests are the sole source of document hierarchy.

## Structural model

The document hierarchy and the semantic concept graph are different structures.

- A **folder is a section**. Every rendered folder section is numbered and appears in the contents.
- A **concept is a semantic leaf**. Every rendered concept has an unnumbered heading and also appears in the contents.
- Numbering is determined by structural role, never by heading depth.
- Grouping sections exist to make the argument readable; they do not need to invent a new concept.
- Semantic relations describe conceptual dependency/relationship and must not be inferred from folder nesting.
- Do not create a numbered subsection merely because a term is important. If it is a term/mechanism rather than a grouping, it is a concept.

## Canonical theory structure

### Software Engineering

Direct concept:
- Software Engineering (Softwarové inženýrství)

Numbered groups and concepts:
- **AI-asistovaný vývoj**
  - Vibe Coding
  - Slop
  - Spec-Driven Development (Vývoj řízený specifikací)
  - Planning (Plánování)
- **Řízení změn**
  - Version Control (Správa verzí)
  - Branch (Větev)
  - Pull Request
- **Ověřování a integrace**
  - CI (Průběžná integrace) [Continuous Integration]
  - Integration Test (Integrační test)
- **Modelování pracovních postupů**
  - DAG (Orientovaný acyklický graf) [Directed Acyclic Graph]
- **Běhová prostředí**
  - Runtime (Běhové prostředí)
  - Container (Softwarový kontejner) [Software Container]

GitHub and GitHub Actions are implementation choices, not standalone theory concepts.

### Model

Numbered groups and concepts:
- **Jazykové modely**
  - LLM (Jazykový model) [Large Language Model]
  - Transformer
  - Tokenizer (Tokenizér)
  - Token
  - Embedding (Vektorová reprezentace)
- **Inferenční kontext**
  - Context Window (Kontextové okno)
  - KV Cache (Mezipaměť klíčů a hodnot) [Key–Value Cache]
- **Selhání modelu**
  - Context Rot (Degradace kontextu)
  - Divergence (Divergence modelu) [Model Divergence]

Semantic Drift is not a separate concept; its useful material belongs in Divergence.

### Harness

Direct concept:
- Agent Harness (Agentní harness)

Numbered groups and concepts:
- **Stav běhu**
  - Session (Agentní sezení) [Agent Session]
  - Turn (Tah interakce)
  - Transcript (Přepis)
  - State (Stav)
- **Běh a prostředí**
  - Agent Loop (Smyčka ReAct) [ReAct Loop]
  - Environment (Běhové prostředí agenta) [Agent Environment]
  - Sandbox (Izolované běhové prostředí)
- **Rozšíření harnessu**
  - Plugins (Rozšíření)
  - Tools (Nástroje)
  - JSON Schema Tool Calling (Vyvolávání nástrojů s JSON Schema)
  - Code Execution (Spouštění kódu)
  - Scripts (Skripty)
  - Hooks (Událostní záchytné body)
  - MCP (Model Context Protocol)
  - Skills (Dovednosti)

Semantic ownership inside extensions:
- Plugins are the parent mechanism for Tools, Scripts, Hooks, and MCP in this thesis taxonomy.
- JSON Schema Tool Calling and Code Execution refine Tools.
- Skills remain a sibling of Plugins, not a subtype of Plugins.

There is no separate Harness Engineering concept or section.

### Agentic Engineering

Direct concept:
- Agentic Engineering (Agentické inženýrství)

Numbered groups and concepts:
- **Instrukce modelu**
  - Prompt Engineering (Promptové inženýrství)
  - System Prompt (Systémový prompt)
- **Kontext**
  - Context Engineering (Kontextové inženýrství)
  - Context Injection (Vkládání kontextu)
  - Prompt Injection
  - Compaction (Kompakce kontextu) [Context Compaction]
  - RAG (Generování rozšířené vyhledáváním) [Retrieval-Augmented Generation]
- **Cílené vykonávání**
  - Loops (Cílené smyčky) [Goal Loops]
  - Guardrail (Deterministický mantinel) [Deterministic Guardrail]
  - HITL (Zapojení člověka do smyčky) [Human-in-the-loop]
- **Multi-Agent Systems**
  - Subagent (Podřízený agent)
  - Orchestrator (Orchestrátor)
  - Handoff (Předání řízení)
  - Swarm (Roj)
  - Graphs (Pracovní grafy) [Workflow Graphs]

Graphs (Workflow Graphs) may use a DAG, but DAG remains a general Software Engineering concept. Subagent belongs to Multi-Agent Systems, not Harness.

## Canonical practical structure

Practical describes verified DarkFactory implementation, not intended architecture.

- **Úvod**
- **Návrh systému DarkFactory**
  - Cíle návrhu
  - Celková architektura
  - Vykonávací jádro
  - Systém capabilities
  - Externí integrace
  - Identita a bezpečnostní hranice
  - Rozhraní
- **Životní cyklus požadavku**
  - Zachycení požadavku
  - Plánování a schválení
  - Implementace
  - Ověření a revize
  - Integrace
  - Obnova a pokračování
- **Výsledky a diskuse**
  - Metoda ověření
  - Technické výsledky
  - End-to-end ověření
  - Ověření na cílových repozitářích
  - Vyhodnocení cílů a výzkumných otázek
  - Omezení
  - Diskuse

Practical headings describe architecture or lifecycle concerns. Do not turn every package name into a concept. Package names such as `@darkfactory/core` are implementation evidence for the corresponding architectural concept/section.

## Language and terminology

The manuscript prose is Czech.

### Section titles

- Structural/grouping section titles are Czech by default.
- Keep an established industry/proper name when replacing it with Czech would be less precise or contrary to an explicitly locked title. Canonical examples include **Software Engineering**, **Model**, **Harness**, **Agentic Engineering**, and **Multi-Agent Systems**.
- Section titles are structural labels and do not use the full concept-term renderer.

### Concept titles

Canonical terminology metadata lives on the owning concept:
- `industry` — established field-facing name or abbreviation;
- `czech` — Czech proper/formal name;
- `english` — English formal expansion/name;
- `alias` — optional genuine alternate term.

Render concept titles as:
1. established `industry` term first;
2. distinct Czech term in parentheses;
3. distinct English formal term in square brackets.

Examples:
- `LLM (Jazykový model) [Large Language Model]`
- `MCP (Model Context Protocol)`
- `Branch (Větev)`
- `DAG (Orientovaný acyklický graf) [Directed Acyclic Graph]`

If there is no separate industry term, lead with Czech and append a distinct English term in square brackets. Never duplicate identical strings merely to fill every slot.

### Prose

- Explain in Czech.
- Preserve established technical names, proper names, abbreviations, protocol names, code identifiers, and product names in their canonical form.
- Do not manufacture Czech translations for terms that are normally used by their industry name.
- Use the full rendered terminology when defining/indexing a concept; subsequent prose may use the concise industry term or natural Czech grammatical form where unambiguous.
- Terms coined or scoped specifically by this thesis must say `V této práci ...` or equivalent rather than being presented as universal terminology.

## Writing rules

Write concise technical prose. Every sentence must contribute at least one of:
- a definition;
- a mechanism;
- a distinction;
- a consequence;
- evidence;
- or a necessary relationship.

Delete prose that merely repeats a heading, restates the preceding sentence, provides generic motivation, or adds unsupported rhetorical framing.

Each concept must:
- begin with a precise definition;
- contain only the description needed to explain mechanism, distinction, consequence, or relation;
- use canonical `term(...)` references for other concepts;
- have correct semantic relations;
- appear in the structural tree if it belongs in the thesis.

Do not use raw Typst bold emphasis in manuscript prose. Accepted prose remains clean source; use review markers only for genuinely unresolved work.

Keep theory implementation-agnostic. DarkFactory-specific architecture, behavior, workflow, product names, and evaluation claims belong in Practical/Results unless a brief example is necessary.

## Citation policy

Use citations for externally verifiable claims, not decorative citation density.

Prefer:
1. originating paper, formal standard, or protocol specification;
2. official first-party documentation;
3. original source for a coined term or historical claim;
4. authoritative secondary literature only when a suitable primary source is unavailable.

Definitions, protocol behavior, mechanisms, history, comparisons, quantitative claims, security claims, and external-system claims require claim-specific support.

Every theoretical concept should have appropriate source/citation metadata unless explicitly author-defined. If the thesis defines a useful abstraction, cite authoritative sources for the underlying mechanism rather than pretending the exact term is standardized.

All citation handles must resolve through `DarkFactory/bib/references.bib`.

Practical implementation claims must be grounded in the actual `darkfactory/` submodule, current DarkFactory repository state, workflows, tests, generated artifacts, or measured results. Never infer implementation behavior from a plan.

## Repository architecture

- `DarkFactory/` owns the complete book: concepts, manuscript, bibliography, images, templates, fonts, and metadata.
- `DarkFactory/index.typ` is the book root and title source.
- Folder manifests define numbered document sections.
- Concept files define semantic terms and are rendered unnumbered.
- `manuscript/` owns document-level and practical/results content.
- `software-engineering/`, `language-models/`, and `agentic-engineering/` own theory concepts.
- `darkfactory/` is the implementation evidence source.
- Do not recreate parallel chapter trees, terminology registries, publication variants, compatibility structures, or superseded concept files.

## Publication and validation

Canonical outputs:
- Final: `out/prace.pdf`, `out/prace.html`, `out/prace.md`
- Review: `out/prace-review.pdf`, `out/prace-review.html`, `out/prace-review.md`

Use:
```bash
make all BOOK=DarkFactory
make web-check
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

Validation should assert positive final contracts:
- expected numbered section hierarchy;
- unique indexed concept keys;
- every intended concept structurally reachable;
- resolving semantic relations, citations, and assets;
- numbered sections versus unnumbered concepts;
- valid publication artifacts.

Do not add legacy-name blacklists as a substitute for positive final-state checks.

## Git workflow

Commit and push completed repository changes. Keep commits logically scoped. When the practical implementation snapshot changes, update the `darkfactory` submodule gitlink in the same work wave.
