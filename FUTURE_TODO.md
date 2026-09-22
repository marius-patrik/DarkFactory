# Future TODO

This file is a parking lot for future DarkFactory-Paper requests that should **not** change the active execution plan yet.

## Rules

- `PLAN.md` remains the only active thesis execution plan.
- `IDE_PLAN.md` remains the separate generic IDE workstream plan.
- Items here are **not active**, **not scheduled**, and **not implementation instructions**.
- Add requests here as they arise, preserving the user's intent without prematurely fitting them into current phases.
- Do not dispatch or implement items from this file unless they are explicitly promoted into an active plan.
- When the future work is ready to be planned, consolidate and deduplicate these notes into a coherent forward plan, then remove or archive resolved TODO entries.

## Requests

### Future thesis restructuring

#### Introduction owns the adoption/capability argument

Move contemporary adoption/capability evidence into the introduction/motivation and make it read as one causal argument:

1. generative-AI adoption is growing rapidly;
2. only a very small fraction of global AI users use actual coding agents;
3. Vibe Coding should be introduced here as the low-structure/outcome-driven baseline that motivates a more deliberate engineering practice;
4. model capabilities are also improving;
5. capability alone is insufficient for reliable/effective agentic software development;
6. Agentické inženýrství is the deliberate practice needed to utilize model + harness capabilities effectively;
7. the theoretical part explains how these systems operate;
8. the practical part explains how to use them effectively and then implements those practices in the DarkFactory harness;
9. Results/Discussion evaluates the implementation and practices.

Move into the introduction:
- Gradually adoption/coding-agent evidence;
- Epoch ECI capability-development evidence;
- Artificial Analysis current frontier-model benchmark snapshot.

After the move, model/inference theory should explain mechanisms rather than contain a current-model leaderboard.

#### Vibe Coding moves out of the theory body

Remove Vibe Coding as a normal later theory article.

Use it in the introduction and/or methodology as:
- a contemporary AI-development practice;
- a baseline/contrast to disciplined agentic engineering;
- part of the motivation for the practical methodology.

Intended contrast:
- **Vibe Coding** = low-structure, outcome-observed AI-assisted software creation;
- **Agentic Engineering** = deliberate specification, context, review, verification, orchestration, and workflow engineering around agentic systems.

Do not caricature Vibe Coding; source its definition and empirical claims.

**Source gate:** the desired statement that “most coding-agent users are vibe coding” is not established by the current Gradually evidence. Before publication, either:
- find a representative source that actually supports “most” for the relevant population;
- scope the statement to the population measured by a real survey; or
- soften it to a non-quantified statement such as widespread/common vibe-coding practice.

Do not generalize a subscriber/designer/convenience survey to all coding-agent users.

#### Restore explicit Teoretická část / Praktická část

When this TODO is promoted, supersede the current “semantic distinction only” decision and restore explicit top-level theory/practical ownership.

**Teoretická část** should focus on concepts needed to understand how agentic systems operate:
- Jazykový model;
- architecture/representation;
- inference;
- Model Provider;
- Inference Engine;
- Temperature;
- Context Window;
- KV Cache;
- Context Rot;
- Harness;
- Agent Loop;
- Session / Transcript / State;
- Environment;
- Tools / Tool Calling;
- Code Execution / Sandbox;
- Skills / Plugin / Script / Hooks / MCP / repository-extension mechanisms where needed to understand the harness.

Anything primarily about **how to use agentic systems effectively for software engineering** moves to **Praktická část**, including:
- spec-driven development;
- planning;
- review;
- version-control workflow as an agentic-engineering practice;
- CI/integration verification;
- prompt/system-instruction practice;
- AGENTS.md / CLAUDE.md when treated as engineering practice;
- context engineering/injection/compaction;
- RAG when used as an engineering practice;
- guardrails / HITL / goal loops;
- subagents / orchestration / handoffs / workflow graphs / swarm.

The practical part should first explain/justify the relevant practices, then show how they are realized in **DarkFactory**.

#### Restore a school-guide-shaped macrostructure

Use the archived OdbornaPrace skeleton as the starting direction:

1. **Úvod**
2. **Teoretická část**
3. **Praktická část**
4. **Výsledky a diskuse**
5. **Závěr**
6. Přílohy as applicable

Likely future mapping:

- **1 Úvod**
  - adoption/coding-agent evidence;
  - Vibe Coding motivation/baseline;
  - model-capability trend/current benchmark;
  - argument/problem;
  - goals;
  - methodology;
  - structure of work.
- **2 Teoretická část**
  - Jazykový model;
  - Inference;
  - Harness.
- **3 Praktická část**
  - Agentické inženýrství / engineering practices;
  - DarkFactory design and implementation;
  - verification methodology.
- **4 Výsledky a diskuse**
  - mechanism/system/repository results;
  - interpretation;
  - research-question answers;
  - limitations/discussion.
- **5 Závěr**

Do not change active numbering yet; design exact numbering only when this TODO is promoted.

### Correct the school contract: ODBORNÁ PRÁCE

The current active plan appears to have used the IVT maturita-topic requirements as the main contract. The archived repository shows a different source of truth:

- archived repo: `marius-patrik/OdbornaPrace-mono`;
- binding school guide recorded there: `docs/Pruvodce-tvorbou-odborne-prace-2024.pdf`;
- the mono README explicitly calls it the school **Průvodce tvorbou odborné práce** and says it contains the binding rules;
- the guide-aligned template was pinned as `marius-patrik/template-OdbornaPrace@e58ed2c7b3d2432eddfbec238ce6561163d766a0`;
- the archived template says its layout follows chapter 4 of that guide.

Before changing the active plan:
1. treat the archived 2024 guide as the recovered primary contract unless a newer school-issued Odborná-práce guide is found;
2. check the current school site for a newer edition;
3. perform a line-by-line compliance audit of the actual guide;
4. use the archived template/README only as a secondary transcription/implementation reference;
5. then replace the current IVT-specific assumptions in `PLAN.md`, `AGENTS.md`, templates, validators, and QA gates.

#### Verified deltas from the archived guide-aligned template

These current assumptions require revalidation/reversal:

- title-page work type is **ODBORNÁ PRÁCE**, not **Maturitní práce z IVT**;
- canonical skeleton explicitly includes **Teoretická část**, **Praktická část**, **Výsledky a diskuse**;
- A4, margins 2.5 cm with 3 cm at binding edge;
- main text rule is **serif font 12 pt**, justified, 1.5 spacing, 8 pt paragraph spacing, no first-line indent;
- headings are bold 16 / 14 / 12 pt;
- chapter numbers have no trailing period;
- page numbers are centered in the footer, 11 pt, displayed from Úvod;
- archived template does **not reset the page counter at Úvod**; front pages count;
- archived template includes Czech **Anotace + Klíčová slova** and English **Annotation + Keywords**;
- after Contents it uses combined **Seznam obrázků a tabulek** when applicable;
- code/raw may use a 10 pt monospace font;
- guide/template supports numeric or author-date ISO-690 citation style, chosen with the supervisor;
- archived bibliography heading is **Seznam zdrojů**;
- appendices are numbered and have **Seznam příloh**.

Therefore specifically re-audit before finalizing:
- Times New Roman-only requirement;
- page reset to 1 at Úvod;
- removal of English annotation/keywords;
- “Seznam obrázků” instead of combined figures/tables list;
- all-black/all-Times code/link rules;
- current declaration wording;
- bibliography heading **Seznam použitých zdrojů**.

#### Required future compliance matrix

Before promotion, produce:

| Area | Exact Odborná-práce guide rule | Current DarkFactory-Paper | Archived template | Required change |
| --- | --- | --- | --- | --- |
| title page | | | | |
| work type label | | | | |
| declaration | | | | |
| annotation/annotation | | | | |
| keywords | | | | |
| contents | | | | |
| figures/tables list | | | | |
| macrostructure | | | | |
| font / size | | | | |
| margins | | | | |
| paragraphs | | | | |
| headings / numbering | | | | |
| pagination | | | | |
| citations | | | | |
| bibliography | | | | |
| code formatting | | | | |
| appendices | | | | |
| submission artifacts | | | | |

No current school-format rule survives merely because it is already implemented.

### Promotion criteria

Do not promote this restructuring into `PLAN.md` until:
- the active Phase 3 work is no longer at risk of collision;
- the exact ODBORNÁ PRÁCE guide has been re-audited;
- the Vibe Coding population claim has defensible evidence/wording;
- the introduction argument has been outlined end-to-end;
- exact Theory / Practical / Results ownership is designed without duplication;
- existing Phase 2/3 evidence can be migrated without losing citations, normalized data, or visuals.
