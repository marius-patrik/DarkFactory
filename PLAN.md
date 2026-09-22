# DarkFactory-Paper — Active Thesis Plan

This file defines the active manuscript phase. Deferred DarkFactory evidence integration and final publication work live in `BACKLOG.md`.

- Canonical manuscript source: `paper/PAPER.typ`
- Durable repository/editorial rules: `AGENTS.md`
- School contract: `SCHOOL_RULES.md`
- Deferred work: `BACKLOG.md`
- Generic IDE workstream: `web/PLAN.md`

## Title

**Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory**

## Thesis argument

The paper develops one connected argument:

**increasing model capability enables more complex software work → model inference alone does not provide durable state or controlled external effects → a harness supplies runtime continuity, tools, environment, state, and control → Agentic Engineering turns those capabilities into a disciplined software-engineering process → DarkFactory implements that process → evaluation establishes which properties are supported by reproducible evidence.**

Every section, paragraph, citation, table, and figure must materially support that argument.

## Final hierarchy

Maximum numbered heading depth is 3.

1. **Úvod**
   - 1.1 **Motivace a vymezení problému**
   - 1.2 **Cíl práce a výzkumné otázky**
   - 1.3 **Metodika**
2. **Teoretická část**
   - 2.1 **Jazykový model**
     - 2.1.1 **Architektura a reprezentace**
     - 2.1.2 **Inference a kontext**
   - 2.2 **Harness**
     - 2.2.1 **Smyčka a stav**
     - 2.2.2 **Prostředí a nástroje**
     - 2.2.3 **Rozšíření**
   - 2.3 **Agentické inženýrství**
     - 2.3.1 **Zadání a plánování**
     - 2.3.2 **Řízení změny a ověřování**
     - 2.3.3 **Instrukce, kontext a autonomie**
     - 2.3.4 **Orchestrace**
3. **Praktická část**
   - 3.1 **DarkFactory**
4. **Výsledky a diskuse**
   - 4.1 **Ověření implementace a systému**
   - 4.2 **Ověření na repozitářích**
   - 4.3 **Odpovědi na výzkumné otázky**
   - 4.4 **Diskuse a omezení**
5. **Závěr**

Chapter 2 contains the theoretical foundation and Agentic Engineering methodology.

Chapter 3 is reserved for the verified DarkFactory architecture and implementation. The detailed `3.1.x` structure will be fixed during the DarkFactory evidence phase from the pinned implementation itself.

## Writing standard

The final manuscript reads as continuous academic prose rather than a terminology catalogue.

### Paragraphs

Each paragraph should:
- advance the central argument;
- explain a mechanism required later;
- present or interpret evidence;
- establish a limitation;
- or connect two ideas through a substantive inference.

Preferred flow:

**claim/context → necessary explanation → evidence/source where useful → consequence**

Use the shortest wording that carries the argument clearly.

### Metadiscourse

Prefer direct subject-matter prose.

Use structural narration only when it adds information the heading and surrounding text do not already provide.

### Terminology

Introduce terminology inline at the point where it becomes necessary.

Explain only the property of a concept that matters to the thesis.

Examples:
- Git/branch/PR/CI are discussed through their role in controlled agentic change.
- Session/Transcript/State are distinguished because the distinction is necessary for continuity and recovery.
- Tool use is explained through the split between model request and harness-executed effect.

### Sources and citations

- keep claim-local citations for factual and externally verifiable claims;
- prefer original research, specifications, and first-party technical documentation;
- synthesize multiple sources into coherent prose where appropriate;
- reuse established results without repeating their full explanation;
- keep claims within the scope of their evidence;
- prune bibliography records that no longer support final text.

## Final visual set for this phase

Keep:
1. Gradually adoption figure;
2. Epoch ECI capability figure;
3. ReAct loop diagram.

Additional figures belong only where they materially support the verified DarkFactory architecture or results in later phases.

## Final front matter

Keep:
- title page;
- declaration;
- Czech annotation;
- English abstract/keywords according to the school contract;
- concise thesis-level keywords;
- Contents.

Working keyword set:
- agentní AI;
- agentické inženýrství;
- agentní harness;
- softwarové inženýrství;
- jazykové modely;
- autonomní agenti;
- DarkFactory.

## Final back matter

Keep:
- bibliography;
- the combined figure/table list when applicable;
- actual appendices when present.

The final manuscript contains no standalone glossary, encyclopedia, or term index.

## Typst source model

`paper/PAPER.typ` contains manuscript content plus small presentation helpers.

The final source should use:
- direct headings for document structure;
- ordinary prose;
- direct bibliography labels where practical;
- simple reusable formatting helpers only where they reduce straightforward presentation duplication.

The final source should not require a semantic terminology registry, glossary-navigation layer, review-state content model, or per-term rendering framework.

## Typography

Use simple academic typography consistent with `SCHOOL_RULES.md`:

- A4;
- school-compliant margins;
- 12 pt readable serif body;
- justified paragraphs;
- 1.5 line spacing;
- school-compliant paragraph spacing;
- normal breakable paragraphs;
- left-aligned 16/14/12 pt level 1/2/3 hierarchy;
- simple 10 pt captions;
- monochrome print-friendly code;
- restrained print-friendly links.

## Active phase — Whole-paper coherence and theoretical restructure

### Step 1 — Establish the final manuscript skeleton

Implement the locked title and hierarchy.

Place Agentic Engineering at §2.3.

Reserve Practical / §3.1 for DarkFactory.

Use only level 1–3 headings.

### Step 2 — Simplify the manuscript source

Reduce `paper/PAPER.typ` to:
- manuscript prose;
- citations;
- figures/tables;
- simple layout helpers.

Consolidate terminology into ordinary prose.

Use direct citation labels where practical.

Keep only source machinery that still serves final output.

### Step 3 — Rewrite Chapter 1

#### 1.1 Motivace a vymezení problému

Argument order:
1. capable models can perform meaningful software tasks;
2. plausible generated output is not equivalent to a controlled engineering process;
3. Gradually establishes broad AI adoption;
4. Epoch ECI establishes rapid capability growth;
5. capability alone does not provide persistent state, verified effects, isolated change, deterministic checks, recovery, or controlled integration;
6. Vibe Coding may appear briefly as a contrast with disciplined engineering;
7. conclude with the need for harness-level runtime control and Agentic Engineering.

#### 1.2 Cíl práce a výzkumné otázky

State one direct main objective:

design and technically evaluate a harness architecture for long-running agentic software development, with DarkFactory as the implementation artefact.

Use approximately four subgoals:
1. establish the necessary model/harness theoretical basis;
2. formulate a controlled Agentic Engineering methodology;
3. realize the methodology in DarkFactory;
4. evaluate implementation, integration, and repository evidence.

Keep the three research-question themes:
- controlled autonomy;
- interruption/recovery;
- persistent state versus active model context.

#### 1.3 Metodika

Describe:
- literature/specification/first-party documentation review;
- design-science construction of the artefact;
- implementation, automated-test, CI, integration, and repository evidence;
- limits on conclusions according to the available evidence.

### Step 4 — Rewrite §2.1 Jazykový model

#### 2.1.1 Architektura a reprezentace

Target 3–4 substantive paragraphs:
- language-model inference and Transformer context processing;
- tokens only to the degree needed for context limits;
- learned representation only where necessary for later retrieval/context discussion;
- transition into inference/context constraints.

#### 2.1.2 Inference a kontext

Target 3–4 substantive paragraphs:
- inference over active context;
- finite context capacity;
- Lost in the Middle evidence;
- implication for durable task continuity.

Keep the treatment at the level required by the thesis argument.

### Step 5 — Rewrite §2.2 Harness

#### 2.2.1 Smyčka a stav

Use approximately four paragraphs plus ReAct:
- action/observation loop;
- session continuity;
- transcript/history;
- persisted state;
- distinction from active model context;
- continuation and recovery.

#### 2.2.2 Prostředí a nástroje

Use approximately four paragraphs:
- external environment;
- model-requested tools and harness-mediated execution;
- real code execution as observation;
- sandbox/permission boundary.

#### 2.2.3 Rozšíření

Use approximately 2–3 paragraphs:
- Skills as reusable instruction/resource packages;
- Hooks as event-driven enforcement;
- MCP as interoperable capability integration.

### Step 6 — Rewrite §2.3 Agentické inženýrství

#### 2.3.1 Zadání a plánování

Sequence:
- desired outcome, constraints, non-goals, acceptance conditions;
- specification before implementation detail;
- bounded planning;
- later review against the specification.

Use GitHub Spec Kit briefly as concrete evidence.

#### 2.3.2 Řízení změny a ověřování

Sequence:
- generated code as a candidate change;
- version control and branch isolation;
- Pull Request as integration boundary;
- deterministic build/static/test/integration checks;
- CI tied to an exact revision;
- review against requirements.

#### 2.3.3 Instrukce, kontext a autonomie

Sequence:
- system rules;
- repository/project instructions;
- task specification;
- dynamic runtime context;
- AGENTS.md/CLAUDE.md as concise examples;
- context selection and compaction;
- retrieval when needed;
- untrusted context handling;
- bounded autonomous loops and programmatic controls;
- HITL where human authority is required.

#### 2.3.4 Orchestrace

Sequence:
- separable ownership as the condition for useful parallel work;
- subagent/orchestrator-worker delegation;
- handoff only where ownership transfer matters;
- workflow graph for explicit order/branching/loops;
- graph-versus-DAG distinction where relevant;
- integration and verification remain explicit.

### Step 7 — Set the Practical boundary

Chapter 3 contains only:

- 3.1 DarkFactory

Keep this as a clean placeholder until the verified DarkFactory evidence phase defines the actual architecture content.

### Step 8 — Rewrite Chapter 4 into the final structure

Use the evidence already present without strengthening it.

#### 4.1 Ověření implementace a systému
- identify evaluated snapshot once;
- summarize component/test evidence;
- summarize integration evidence;
- state the limits of that evidence.

#### 4.2 Ověření na repozitářích
Prefer a compact table:
**Repozitář | Revize | Důkaz | Výsledek**

Follow with concise interpretation.

#### 4.3 Odpovědi na výzkumné otázky
Three concise paragraphs:
- O1 answer → evidence → limitation;
- O2 answer → evidence → limitation;
- O3 answer → evidence → limitation.

#### 4.4 Diskuse a omezení
State what the evidence supports, what it does not support, and the limits of generalization/benchmarking.

### Step 9 — Rewrite Chapter 5

Use approximately three paragraphs:
1. contribution;
2. findings relative to the research questions;
3. strongest limitations and remaining validation boundary.

Use no new factual material.

### Step 10 — Finalize front/back matter for this phase

Align annotations with the rewritten body.

Use the concise keyword set.

Keep only applicable back-matter lists.

### Step 11 — Prune unused support material

After the manuscript rewrite:
- keep only cited bibliography records;
- keep only referenced figures/data;
- keep Chapter 4 evidence resources required by the present results;
- keep build inputs that still serve canonical outputs.

### Step 12 — Validate and read the paper

Run:

```bash
make all BOOK=DarkFactory
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

Then inspect the final and review outputs end-to-end for:
- continuity;
- heading hierarchy;
- paragraph flow;
- page breaks;
- typography;
- figures/captions;
- cross-references;
- bibliography;
- back matter.

Fix defects found through actual reading.

## Active-phase acceptance

The phase is ready for review when:
- the locked title and hierarchy are implemented;
- Agentic Engineering is §2.3 under Theory;
- Practical contains only §3.1 DarkFactory;
- the manuscript uses only level 1–3 headings;
- terminology is integrated into continuous prose;
- there is no standalone glossary/encyclopedia/index;
- the source uses simple manuscript/presentation structures;
- every retained paragraph materially serves the argument;
- citations remain claim-local and defensible;
- the final visual set is concise;
- the bibliography and support assets match the final text;
- all canonical builds pass;
- the generated paper has been read end-to-end.

## Delivery

The implementation phase ends by opening **one pull request against `main` for coordinator/user review**.

The worker does not merge the pull request.

The PR description should summarize:
- final hierarchy;
- editorial rewrite;
- source simplification;
- visual set;
- bibliography/assets cleanup;
- validation results;
- any remaining items reserved for the DarkFactory evidence or direct school-guide phases.
