# Product Requirements Document

## Product

**DarkFactory-Paper** is the complete academic publication system for the thesis:

**Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory**

The primary product is the thesis itself. The repository also contains the evidence, source, build pipeline, publication outputs, and generic GitHub workbench required to make the work reproducible and reviewable.

`GOAL.md` defines the quality standard for the finished academic paper.

`PLAN.md` defines how the repository is moved toward this product.

## Users

### Primary
- thesis author;
- thesis supervisor;
- school evaluator/opponent.

### Secondary
- technical readers interested in agentic software engineering;
- contributors reviewing manuscript or implementation evidence;
- readers using the published web/repository representation.

## Product outcomes

The product must provide:

1. a coherent academic thesis;
2. reproducible evidence for DarkFactory-specific claims;
3. one canonical manuscript source;
4. deterministic publication outputs;
5. school-compliant final submission material;
6. a generic browser workbench for viewing and working with the repository and publication;
7. CI, Pages, and Release automation tied to exact repository revisions.

## Thesis direction

The thesis examines a transition in software development:

**software engineering is becoming Agentic Engineering as implementation work moves from a human directly operating an IDE toward software agents operating through a harness.**

The central proposition is not that the IDE disappears as a user interface. Rather, in agent-first development the **operational center of software work shifts from the IDE to the harness**.

A conventional IDE integrates the tools a human developer needs to inspect, edit, execute, debug, validate, and version software.

A harness performs the corresponding integrating role for a software agent: it supplies context, tools, environment access, persistent state, controlled effects, observations, verification, recovery, and orchestration.

The editor therefore increasingly becomes one human-facing interface into a development process whose runtime is the harness.

### Historical progression

The thesis should establish this transition with a short, sourced historical progression rather than a separate product-history survey:

**IDE-centered development → IDE-integrated code completion → IDE-integrated chat assistants → IDE-integrated coding agents → agent-first / ADE-style development**

The purpose of this history is to show how AI moved from assisting individual editing actions to becoming an executor of increasingly complete software-development tasks.

Use representative examples only where they materially demonstrate a stage in that progression.

### Engineering transition

As execution moves from the human developer to agents, the role of the engineer changes.

The human increasingly owns:
- intent;
- requirements and constraints;
- architecture;
- decomposition;
- acceptance conditions;
- supervision;
- review;
- integration;
- accountability.

The agent increasingly performs:
- repository inspection;
- planning within delegated scope;
- code modification;
- command/tool execution;
- observation of results;
- correction;
- verification;
- preparation of changes for integration.

This does not remove software engineering. It changes where engineering effort is applied.

**Agentic Engineering is software engineering reorganized around agents as primary executors of implementation work.**

### Harness and IDE

The paper should make the analogy explicit but technically precise:

**the harness becomes for the agent what the IDE was for the human developer.**

This does not mean that a harness is a graphical IDE.

It means that both serve as the integrating environment around the primary executor:

- the IDE is organized around a human manipulating code and tools;
- the harness is organized around an agent manipulating a software-development environment.

The harness therefore becomes the development runtime for agentic work.

### DarkFactory

DarkFactory is the concrete system through which the thesis explores this transition.

It should be presented as an implementation of harness-centered software development: a system intended to support the execution, control, verification, persistence, recovery, and orchestration required when agents perform meaningful portions of software-engineering work.

DarkFactory is therefore not merely an example of an AI agent or a wrapper around a model.

It is the practical realization of the thesis's proposed development architecture.

### Evaluation

The evaluation should test the properties required by this development model rather than merely report that workflows ran.

Evidence should address, where supported:
- continuity of delegated work;
- persistent state across inference boundaries;
- controlled external effects;
- bounded permissions and scope;
- deterministic verification;
- interruption and recovery;
- integration of agent-produced changes;
- orchestration without loss of integration control.

Results and discussion must distinguish:
- direct observation;
- supported interpretation;
- limitation.

### Semantic spine

The finished paper should read as one transformation:

**human-centered software engineering → AI-assisted development → delegated agentic work → harness-centered execution → Agentic Engineering → DarkFactory → evidence**

At the highest level, the argument is:

1. software development is moving from AI assistance toward meaningful delegation;
2. meaningful delegation changes the role of both the developer and the development environment;
3. the harness becomes the runtime that integrates the capabilities required by the agent;
4. software engineering practiced around this model becomes Agentic Engineering;
5. DarkFactory implements this approach;
6. evaluation establishes which claimed properties are actually demonstrated.

This direction defines the intellectual structure of the thesis without requiring a rigid section-by-section taxonomy.

## Manuscript requirements

### Canonical source

The authored manuscript is:

`paper/PAPER.typ`

Supporting material may live under:
- `paper/bib/`;
- `paper/data/`;
- `paper/img/`;
- `paper/fonts/`.

There is one manuscript authority.

### Academic structure

The paper contains the school-level macrostructure:

1. Úvod
2. Teoretická část
3. Praktická část
4. Výsledky a diskuse
5. Závěr

The detailed hierarchy is determined by the thesis direction and requirements in this PRD, while `GOAL.md` defines the overall final-paper quality bar.

### Content quality

The manuscript must:
- present one coherent research argument;
- use connected academic prose;
- keep theory proportionate to the practical contribution;
- make DarkFactory the concrete subject of Practical;
- distinguish factual findings from interpretation;
- answer its research questions from evidence;
- state limitations explicitly;
- avoid unsupported generalization.

### Theory scope

The theoretical material exists to support the thesis argument and the later DarkFactory analysis, not to provide a general AI textbook.

The model section should establish only the concepts needed to understand the role and boundary of the model inside an agentic development system.

Product decisions for the current theoretical treatment:

- tokenization may be explained conceptually, but Byte-Pair Encoding (BPE) is not required;
- embeddings should remain a light conceptual example rather than a mathematical detour;
- retain the simple king/queen embedding example and `paper/img/vector-embedding-queen.svg`;
- do not use the previous 3D embedding diagram;
- retain the ReAct loop where it clarifies the reasoning/action/observation execution cycle;
- retain the Gradually adoption figure as concise motivation/context;
- workflow graphs may be used to explain agent workflow planning;
- DAG-specific discussion is not part of the thesis;
- Vibe Coding is not part of the thesis argument;
- Prompt Injection is outside the intended theory scope.

These decisions define the intended level and focus without requiring a fixed paragraph or subsection layout.

### Sources

Externally verifiable factual/mechanistic claims require appropriate citations.

Source preference:
1. original research;
2. standards/specifications;
3. first-party technical documentation;
4. high-quality secondary material where primary evidence is unavailable or the secondary source itself is the subject.

Bibliography records should correspond to material actually used by the final paper.

## DarkFactory requirements

### Canonical revision

The practical chapter and evaluation must reference one explicitly pinned DarkFactory revision.

The following must agree on that revision:
- `darkfactory` submodule;
- evidence manifest;
- manuscript implementation claims;
- Results evidence.

### Practical chapter

The DarkFactory chapter must explain the system at the architectural level necessary to connect implementation with the theoretical argument.

It should cover the relevant runtime, state, control, capability, lifecycle, recovery, integration, and verification boundaries demonstrated by the implementation.

Package/file structure is included only where it explains architecture.

### Implementation truth

Claims about DarkFactory behavior must be supported by one or more of:
- source code;
- tests;
- workflows;
- generated architecture documentation;
- reproducible execution evidence.

Intended architecture is distinguished from implemented behavior whenever they differ.

## Evidence requirements

Use a stable evidence manifest under `paper/data/`, preferably:

`paper/data/darkfactory-evidence.json`

The evidence model must record enough provenance to reproduce or inspect important claims, including:
- repository;
- ref/branch where relevant;
- exact SHA;
- workflow/run identifier;
- source/test paths;
- evidence category;
- result/status;
- research-question/result mapping;
- known limitation.

Evidence should support the manuscript rather than duplicate prose.

## Figure and data requirements

The intended core explanatory visuals currently include:
- the Gradually adoption figure for motivation/context;
- the ReAct loop for the harness execution cycle;
- the simple king/queen embedding diagram for the lightweight embedding example.

The 3D embedding diagram is not part of the intended final visual set.

Other figures remain justified only when they materially improve the final paper.

Figures and tables must materially improve explanation or evidence presentation.

Each final visual must have:
- a clear purpose;
- traceable source/provenance;
- an accurate caption;
- consistency with the evaluated revision where implementation-specific.

Generated figures must be deterministic from checked-in data or verified source inputs.

## Typst/source requirements

The manuscript source should remain simple enough to read and edit directly.

It may contain:
- prose;
- headings;
- citations;
- figures/tables;
- small presentation helpers.

Content architecture should not depend on a separate semantic term registry or glossary model.

Formatting helpers must serve presentation rather than determine manuscript semantics.

## School-compliance requirements

The final publication must comply with the verified contract in `SCHOOL_RULES.md`.

Before submission, direct guide-text verification must settle all remaining uncertain requirements, including:
- declaration;
- annotation/abstract;
- keywords;
- bibliography wording;
- title-page fields;
- pagination;
- work-range/count requirements;
- figures/tables;
- appendices;
- submission artifacts;
- length requirements;
- similarity/plagiarism requirements;
- typography.

## Publication requirements

### Canonical outputs

The repository must generate reproducibly from an exact commit:
- final PDF;
- HTML publication;
- Markdown publication;
- repository/source artifact;
- compiled single-file Typst artifact for canonical release publication.

A review-specific publication is optional and exists only if it provides distinct value to an actual review workflow.

### Build contract

The build system should expose a small, obvious command surface for:
- publication build;
- validation;
- web build;
- Pages/site build;
- release artifact generation.

Local documentation and CI must invoke the same canonical commands.

### Validation

Automated validation should check product invariants rather than individual prose choices.

It should verify, as appropriate:
- canonical source presence;
- successful Typst compilation;
- bibliography/citation resolution;
- asset resolution;
- expected macrostructure;
- evidence provenance;
- DarkFactory revision consistency;
- canonical output presence;
- generic web build correctness.

## Web workbench requirements

The `web/` application is a generic GitHub repository workbench, not a thesis-specific application.

Required capabilities include:
- repository/ref workspaces;
- source browsing and editing;
- publication rendering;
- Git/GitHub workflows exposed intentionally;
- guided GitHub authentication;
- unified movable tabs across workbench surfaces;
- resizable persistent sidebars/panel;
- reload-safe workspace state;
- private and public repository support.

Typst compilation remains a repository pipeline responsibility rather than a browser-side compiler requirement.

The IDE must not depend on DarkFactory/thesis/school-specific assumptions in its generic core.

## CI requirements

CI should validate in one canonical repository gate:
- thesis publication;
- evidence/provenance consistency;
- publication tooling;
- generic web application;
- repository consistency.

Required checks must correspond to the final repository product rather than intermediate development architecture.

## Pages requirements

GitHub Pages should publish:
- the generic web workbench;
- canonical paper artifacts;
- repository/publication metadata used by the workbench;
- the structural content index required for navigation.

The published site must be usable from a clean deployment of the same commit.

## Release requirements

A canonical release must:
- be tied to an exact repository commit;
- contain the defined publication/submission artifacts;
- use deterministic artifact names;
- contain enough source/provenance information to reproduce or inspect the publication.

## Repository quality requirements

The final repository should contain only active product code, data, assets, documentation, and automation.

Coordination ownership is:
- `GOAL.md` — final-paper quality objective;
- `PRD.md` — finished product contract;
- `PLAN.md` — execution;
- `AGENTS.md` — contributor rules;
- `SCHOOL_RULES.md` — verified school contract;
- `web/PLAN.md` — IDE implementation workstream.

## Non-goals

The product is not:
- a comprehensive AI textbook;
- a survey of every agent product or framework;
- a glossary/encyclopedia of terminology;
- a historical archive of superseded repository architecture;
- a browser-side Typst compiler;
- a benchmark claiming general superiority of agentic development without evidence.

## Final acceptance

The product is ready for final submission/release when:

### Paper
- `GOAL.md` is satisfied by an end-to-end reading;
- all chapters are complete;
- DarkFactory Practical is implementation-backed;
- Results and RQs are evidence-backed;
- claims and citations survive a thesis-wide audit;
- annotations/keywords/conclusion match the final body;
- school requirements are fully resolved and applied.

### Evidence
- DarkFactory revision is pinned;
- evidence manifest is complete;
- important implementation/evaluation claims are traceable;
- implementation-specific figures match the pinned system.

### Build
- canonical publication/validation/site commands pass from a clean checkout;
- publication outputs are reproducible;
- no required artifact depends on undocumented manual steps.

### Web
- generic workbench acceptance passes;
- private/public repository workflows work;
- publication artifacts are navigable;
- dedicated web validation is green.

### Delivery
- canonical CI is green;
- Pages deployment is reachable;
- canonical Release is published from the same accepted revision;
- final PDF has been inspected page by page.
