# Product Requirements Document

## Product

**DarkFactory-Paper** is the complete academic publication system for the thesis:

**Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory**

The primary product is the thesis itself. The repository also contains the evidence, source, build pipeline, publication outputs, and generic GitHub workbench required to make the work reproducible and reviewable.

`GOAL.md` defines the semantic destination of the thesis.

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

The detailed hierarchy is determined by the argument described in `GOAL.md`.

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
- `GOAL.md` — semantic thesis destination;
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
