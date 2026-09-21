# DarkFactory-Paper — Final Restructure Plan

## Goal

Converge the thesis onto one final concept hierarchy with no compatibility structure, no duplicate conceptual wrappers, no blacklist-style legacy validation, and no prose/diagram duplication.

The theoretical part owns the concepts behind Agentic AI, Harnesses, Agentic Engineering, and Harness Engineering. The practical part owns Software Engineering practice, the verified DarkFactory implementation, and evaluation.

## Final work title

**Agentic AI, Agentic Engineering and Harness Engineering**

The current `DarkFactory + title suffix` title composition should be replaced by this single canonical thesis title. DarkFactory remains the practical system/case study, not the thesis title.

## Final top-level structure

1. Úvod
2. **Teoretická část: Agentic AI and Agentic Engineering**
3. **Praktická část: Software Engineering and DarkFactory**
4. Závěr

### 2 Teoretická část: Agentic AI and Agentic Engineering

#### 2.1 Úvod

A short section-specific introduction explaining:
- the abstraction boundary: the model is treated as an inference component;
- Agentic AI is the system-level capability, not a standalone glossary concept;
- the theoretical progression is LLM → Harness → Agentic Engineering.

This is prose/structure only; **Agentic AI must not exist as a separate concept record**.

#### 2.2 LLM (Jazykový model) [Large Language Model]

Direct concepts:
- Transformer
- Tokenizer
- Token
- Embedding
- Context Window
- KV Cache
- Context Rot / Degradace kontextu

Changes:
- add `english: "Large Language Model"` to the LLM concept;
- move Context Rot out of Context Engineering and directly below LLM;
- keep the Transformer generation sentence unconfirmed until explicitly accepted;
- keep definitions meaning-first and free of term repetition.

#### 2.3 Harness

Delete as standalone concepts:
- Agentic AI
- Agent
- Chatbot

Direct Harness concepts, all on one level:
1. Turn (Tah interakce)
2. Session / Agentní sezení
3. Transcript / Přepis
4. Agent Loop
5. Divergence
6. **Tools (Nástroje)** — replaces Tool Calling as the canonical concept/surface
7. JSON Schema Tool Calling
8. Code Execution
9. MCP
10. Plugins
11. Subagent
12. **Skills**
13. **Scripts**
14. **Hooks**

Rules:
- Skills, Scripts, Hooks, and Tools are independent direct sections under Harness.
- Remove the nested Skills folder.
- Rename the Tool Calling key/source cleanly to Tools; do not preserve a compatibility alias/path.
- Add Transcript immediately after Session. Transcript represents the persisted/ordered record of turns, messages, tool calls/results, and other session events.
- Harness stays theoretical.

#### 2.4 Agentic Engineering (Agentické inženýrství)

Order the opening concepts intentionally:
1. Vibe Coding
2. Slop
3. Spec-Driven Development
4. Harness Engineering
5. Guardrail
6. Human-in-the-loop
7. Sandbox

Then engineering sections:
- Prompt Engineering
- Loop Engineering
- Graph Engineering
- Context Engineering

Context Engineering contains:
- Context Injection
- Compaction
- RAG
- Semantic Drift

Context Rot is no longer here; it belongs under LLM.

Harness Engineering stays theoretical and remains a concept/discipline under Agentic Engineering.

### 3 Praktická část: Software Engineering and DarkFactory

#### 3.1 Úvod

A short practical-part introduction stating that the following sections apply the theoretical mechanisms to actual software-development practice and then to the verified DarkFactory implementation.

#### 3.2 Software Engineering

This replaces the current **Vývojové prostředí a praxe** wrapper completely.

One clean section, with only one level of direct concepts beneath it:
- Planning
- Version Control
- GitHub
- Runtime
- CI
- GitHub Actions
- Container
- Integration Test

The section should own the practical development process around DarkFactory. No nested Software Engineering / Version Control / CI structural wrappers return.

#### 3.3 Architektura DarkFactory

Write this only from the verified completed DarkFactory implementation.

Required content once implementation is stable:
- concrete component/package structure;
- execution/data flow;
- state ownership;
- model/tool interfaces;
- authentication/keychain boundary;
- CI/runtime integration;
- verified implementation evidence.

Do not infer practical claims from the theoretical design.

#### 3.4 Výsledky a diskuse

Keep:
- research-question evaluation;
- evaluation limitations.

Before finalization, each O1–O3 conclusion must point to concrete implementation/test evidence.

## Terminology changes

- LLM → `LLM (Jazykový model) [Large Language Model]`
- Tool Calling → **Tools (Nástroje)**
- Agentic AI remains a thesis/chapter framing term, not a concept record.
- Agent and Chatbot concept records are deleted.
- Harness remains the structural title for the Harness section.
- Main work title becomes **Agentic AI, Agentic Engineering and Harness Engineering**.

## Embedding diagram replacement

Replace the current 3D SVG completely.

Target: a clean illustrative **2D projection** with Czech axes:
- x-axis: **Pohlaví**
- y-axis: **Královský status**

Four points:
- muž
- žena
- král
- královna

Vector geometry:
- `muž → žena` and `král → královna` are parallel horizontal vectors;
- `muž → král` and `žena → královna` are parallel vertical vectors;
- optionally show the equation `v(král) − v(muž) + v(žena) ≈ v(královna)`.

Style:
- flat 2D Cartesian plane;
- no perspective plane;
- no third semantic dimension;
- no decorative prose inside the graphic;
- Czech labels only;
- simple, clean arrows/vectors;
- caption explicitly calls it an illustrative projection, not literal learned embedding dimensions.

## Image/prose rule

For image attachments/examples:
- render only the concise image description + figure;
- do not prepend generic prose such as “this screenshot shows…”;
- do not duplicate the caption in surrounding prose;
- parent concepts retain only substantive explanatory text.

## Definition rule

Canonical headings already display the term. Definitions therefore start directly with the meaning and must not repeat the term.

Examples:
- `Agent Harness je aplikační vrstva…` → `Aplikační vrstva…`
- `MCP je otevřený protokol…` → `Otevřený protokol…`

Do not reintroduce term repetition during this restructure.

## Validation cleanup

Replace blacklist/absence-based validation with positive contracts.

Remove checks whose purpose is:
- forbidding old paths/tokens;
- asserting stale files do not exist;
- scanning for legacy names;
- enforcing “must not contain” text;
- historical compatibility cleanup;
- definition-prefix prohibition.

Keep positive correctness validation only:
- expected entrypoints exist;
- expected final hierarchy manifests exist;
- concepts referenced by manifests exist;
- concept keys/relations resolve;
- required source/citation metadata is structurally valid;
- publication artifacts build and are non-empty/valid;
- images referenced by the publication resolve;
- expected UI/build contracts compile.

The final filesystem itself is the source of truth; no compatibility/legacy blacklist is needed.

## Implementation sequence

1. **Lock metadata and top-level titles**
   - thesis title;
   - Theory title;
   - Practical title.

2. **Add 2.1 and 3.1 Úvod section manifests/concepts**
   - short, non-duplicative section framing.

3. **Rebuild Theory hierarchy atomically**
   - LLM;
   - Harness;
   - Agentic Engineering;
   - delete Agentic AI/Agent/Chatbot concepts;
   - move Context Rot;
   - add Transcript;
   - flatten Skills/Scripts/Hooks;
   - rename Tool Calling → Tools.

4. **Rebuild Practical hierarchy atomically**
   - remove Development Environment wrapper;
   - make Software Engineering 3.2;
   - mount the existing development-practice concepts directly beneath it;
   - keep DarkFactory Architecture and Results after it.

5. **Normalize terminology and relations**
   - update concept keys/imports/relations;
   - remove obsolete paths instead of aliases.

6. **Replace the embedding visual**
   - new 2D Czech royalty/gender projection;
   - update caption.

7. **Simplify validation**
   - delete negative/legacy validation;
   - retain positive build/semantic contracts only.

8. **Review prose after structural move**
   - remove cross-section duplication introduced by moves;
   - keep definition/description responsibilities distinct;
   - preserve explicitly accepted/finalized wording unless the structural change necessarily invalidates it.

9. **Build and inspect**
   - final + review PDF;
   - HTML/Markdown;
   - TOC numbering/indentation;
   - figure list and image rendering;
   - semantic links.

10. **Final cleanup**
   - no stale folders/imports;
   - no compatibility aliases;
   - no historical/superseded docs;
   - one final hierarchy represented identically by folder structure, semantic graph, TOC, and viewer.

## Expected numbering after restructure

- 1 Úvod
- 2 Teoretická část: Agentic AI and Agentic Engineering
  - 2.1 Úvod
  - 2.2 LLM (Jazykový model) [Large Language Model]
  - 2.3 Harness
  - 2.4 Agentic Engineering (Agentické inženýrství)
- 3 Praktická část: Software Engineering and DarkFactory
  - 3.1 Úvod
  - 3.2 Software Engineering (Softwarové inženýrství)
  - 3.3 Architektura DarkFactory
  - 3.4 Výsledky a diskuse
- 4 Závěr

Levels 4+ remain unnumbered but stay correctly indented and visible in the contents.
