# DarkFactory-Paper — Final Thesis Structure Plan

## Canonical title

**Agentic AI, Agentic Engineering and Harness Engineering**

DarkFactory remains the practical system/case study, not the thesis title.

## Final manuscript hierarchy

1. Úvod
2. **Teoretická část: Agentic AI and Agentic Engineering**
   - 2.1 Úvod
   - 2.2 **Software Engineering (Softwarové inženýrství)**
   - 2.3 **LLM (Jazykový model) [Large Language Model]**
   - 2.4 **Harness**
   - 2.5 **Agentic Engineering (Agentické inženýrství)**
3. **Praktická část: Harness and Harness Engineering**
   - 3.1 Úvod
   - 3.2 **Harness Engineering (Harnessové inženýrství)**
   - 3.3 **Architektura DarkFactory**
   - 3.4 **Výsledky a diskuse**
4. Závěr

Levels 4+ remain unnumbered but stay visible and correctly indented in the contents.

## 2.1 Úvod

Short theoretical framing:
- software engineering is the application domain;
- the LLM is treated as an inference component;
- Agentic AI is a system-level framing term, not a standalone glossary concept;
- the progression is Software Engineering → LLM → Harness → Agentic Engineering.

Agentic AI, Agent, and Chatbot are not standalone concept records.

## 2.2 Software Engineering

One section with one direct concept level.

Order:
1. Vibe Coding
2. Slop
3. Spec-Driven Development
4. Planning
5. Version Control
6. GitHub
7. Runtime
8. CI
9. GitHub Actions
10. Container
11. Integration Test

The former Development Environment wrapper is removed completely.

## 2.3 LLM

Canonical title: **LLM (Jazykový model) [Large Language Model]**

Direct concepts:
- Transformer
- Tokenizer
- Token
- Embedding
- Context Window
- KV Cache
- Context Rot / Degradace kontextu

Context Rot moves here from Context Engineering.

## 2.4 Harness

Agentic AI, Agent, and Chatbot concept files are deleted.

Direct concepts:
1. Turn
2. Agent Session
3. Transcript
4. Agent Loop
5. Divergence
6. Plugins
7. Subagent

Direct child sections under Harness:
- **Tools (Nástroje)**
- **Skills (Dovednosti)**
- **Scripts (Skripty)**
- **Hooks (Událostní záchytné body)**

Transcript is the ordered persisted record of messages, turns, tool calls/results, and other session events used for reconstruction, audit, or context selection.

Tools replaces Tool Calling completely and uses the canonical key tools. It contains JSON Schema Tool Calling, Code Execution, and MCP.

Skills, Scripts, and Hooks are sibling Harness sections. Scripts and Hooks are no longer nested under Skills.

## 2.5 Agentic Engineering

Direct concepts:
- Guardrail
- Human-in-the-loop
- Sandbox

Child sections:
- Prompt Engineering
- Loop Engineering
- Graph Engineering
- Context Engineering

Context Engineering contains Context Injection, Compaction, RAG, and Semantic Drift. Context Rot moves to LLM.

## 3.1 Úvod

The practical introduction frames Harness Engineering as the implementation discipline, DarkFactory as the concrete system, and Results as evaluation of verified behavior/evidence.

## 3.2 Harness Engineering

Moves from Theory to Practical and describes the implementation discipline for combining model, state, tools, execution and deterministic controls into the practical harness.

## 3.3 Architektura DarkFactory

Must be grounded only in verified implementation: package/component structure, execution/data flow, state ownership, model/tool interfaces, auth/keychain boundary, runtime/CI integration, and implementation evidence.

## 3.4 Results

Keep research-question evaluation and evaluation limitations. O1–O3 conclusions must point to concrete implementation/test evidence before finalization.

## Terminology

- Main title → Agentic AI, Agentic Engineering and Harness Engineering
- LLM → LLM (Jazykový model) [Large Language Model]
- Tool Calling → Tools (Nástroje)
- Agentic AI → framing term only, not a concept
- remove standalone Agent
- remove standalone Chatbot
- Harness remains the structural section title
- Theory → Teoretická část: Agentic AI and Agentic Engineering
- Practical → Praktická část: Harness and Harness Engineering

## Definition rule

Headings already display the term. Definitions begin directly with meaning and must not repeat their own term.

## Embedding figure

Replace the current 3D diagram with a flat 2D illustrative projection.
Axes in Czech: x = Pohlaví; y = Královský status.
Points: muž, žena, král, královna.
Geometry: muž → žena and král → královna are parallel horizontal vectors; muž → král and žena → královna are parallel vertical vectors.
No perspective plane or third dimension. Caption must state that the axes are an illustrative projection, not literal learned embedding dimensions.

## Validation

Use positive validation only.
Keep expected final entrypoints/manifests, unique concept keys, resolving relations, valid publication artifacts, resolving image references, and required build/UI contracts.
Remove stale-path blacklists, forbidden-token scans, must-not-contain checks, legacy-name scans, compatibility cleanup assertions, and definition-prefix prohibition.

## Execution order

1. Lock title + Theory/Practical titles.
2. Add 2.1 and 3.1 introductions.
3. Move Software Engineering back to Theory and flatten its concepts.
4. Rebuild LLM and move Context Rot.
5. Rebuild Harness; delete Agentic AI/Agent/Chatbot; add Transcript.
6. Replace Tool Calling with Tools; split Skills/Scripts/Hooks into sibling sections.
7. Rebuild Agentic Engineering and move Harness Engineering to Practical.
8. Replace embedding figure.
9. Replace negative validation with positive contracts.
10. Build final/review PDF + HTML/Markdown and inspect TOC/figures.
11. Remove obsolete source paths as part of the same final hierarchy commit.
