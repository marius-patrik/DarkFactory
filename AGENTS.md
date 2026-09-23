

# PRD — Verified School Requirements

This section records the verified school-compliance contract for DarkFactory-Paper. Product requirements, active work, roadmap, and deferred work are consolidated in this file.

## Sources

Primary school guide:

- `marius-patrik/OdbornaPrace-mono/docs/Pruvodce-tvorbou-odborne-prace-2024.pdf`

Guide-aligned template evidence:

- `marius-patrik/template-OdbornaPrace@e58ed2c7b3d2432eddfbec238ce6561163d766a0`

A newer school-issued guide supersedes the 2024 guide if one is located during final reconciliation.

## Verified objective and methodology requirements

Directly checked against the 2024 guide on 2026-09-22 and 2026-09-23:

- §2.2, pp. 7–8: the Introduction must establish a concrete, achievable, verifiable objective.
- §2.3, p. 8 recommends research questions as part of a literature-review procedure; §3.1, p. 11 explicitly presents a research question as one possible formulation of an objective. A separately numbered O1–O3 set is therefore not mandatory.
- §3.1, p. 11 explicitly states that hypotheses are not mandatory.
- §2.4, p. 9 places methodology in the Practical part. It should identify the subject, tools, procedure and analysis in enough detail to permit repetition, without reporting results.
- §2.5, pp. 9–10 permits combined Results and Discussion but distinguishes factual results from interpretation.
- §2.6, p. 10 requires the Conclusion to assess achievement of the objective without introducing new ideas.
- §5, pp. 25–27 permits either the Harvard system or numeric references, requires one system to be used consistently, and assigns the choice to the supervisor according to disciplinary convention.
- §5.2.1, p. 26 permits numeric references in square brackets, round brackets, or superscript. Multiple numeric references belong in one pair of brackets and are separated by semicolons. The selected form for this paper is a full-size number in round parentheses; superscript citation indices and collapsed number ranges are not used.
- §1(i), p. 4 requires at least 18,000 characters including spaces, counted across the Introduction, main text, and Conclusion, unless the supervisor approves an exception.
- §1(j), p. 5 requires electronic submission through Odevzdej.cz; §5.3, p. 27 states that the submission is automatically checked for similarity and that the supervisor decides whether it constitutes plagiarism.
- §2, p. 7 requires a title page, declaration, Czech and English annotations and keywords, contents, Introduction, main text, Conclusion, and a list of used sources. §2.1 recommends 150–250 words for the annotation and approximately five keywords.
- §4, p. 24 confirms A4-oriented page formatting: 2.5 cm margins with 3 cm at the binding edge; justified 12 pt serif body text; 1.5 line spacing; 8 pt after paragraphs; no first-line indent; numbered headings without a trailing period at 16/14/12 pt; and centered 11 pt page numbers displayed from the Introduction while counting the title page as page 1.
- §4, p. 24 requires every figure or table to be numbered, captioned in the body font at 10 pt, referenced from the text, and included in an automatically generated list with page numbers. Appendices must be numbered and referenced, and require a list of appendices when present.
- §5.2.2, p. 27 requires the numeric bibliography to follow citation order and recommends a numbered list without brackets.
- The pinned guide-aligned template defines the title page as school, title, work type, author and class, supervisor, and year; it also supplies the declaration wording used by this manuscript. The manuscript's masculine grammatical form and inflected city name are intentional adaptations of that template.

Editorial application: state the explanatory objective and concrete DarkFactory evaluation objective in the Introduction; place methodology under Practical; discuss findings against the objectives without artificial O1–O3 references. This verifies these structural requirements only, not full school compliance.

## Working contract

| Area               | Requirement                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work type          | ODBORNÁ PRÁCE                                                                                                                                                             |
| Macrostructure     | Úvod → Teoretická část → Praktická část → Výsledky a diskuse → Závěr                                                                                          |
| Paper              | A4                                                                                                                                                                          |
| Margins            | 2.5 cm; binding edge 3 cm                                                                                                                                                   |
| Body font          | readable serif, 12 pt                                                                                                                                                       |
| Paragraphs         | justified                                                                                                                                                                   |
| Line spacing       | 1.5                                                                                                                                                                         |
| Paragraph spacing  | 8 pt after paragraph                                                                                                                                                        |
| First-line indent  | none                                                                                                                                                                        |
| Heading numbering  | no trailing period                                                                                                                                                          |
| Heading sizes      | bold 16 / 14 / 12 pt for levels 1 / 2 / 3                                                                                                                                   |
| Page numbers       | centered footer, 11 pt, displayed from Úvod                                                                                                                                |
| Page counter       | front matter counts toward numbering                                                                                                                                        |
| Front matter       | title page; declaration; Czech and English annotations of the recommended 150–250 words; approximately five keywords in each language; contents                            |
| Figures/tables     | combined Seznam obrázků a tabulek when applicable                                                                                                                         |
| Figure captions    | 10 pt                                                                                                                                                                       |
| Code/raw text      | 10 pt monospace permitted                                                                                                                                                   |
| Citations          | ISO 690 numeric; full-size numbers in round parentheses; multiple sources separated by semicolons; never superscript or collapsed into ranges; one system used consistently |
| Bibliography       | `Seznam zdrojů`; entries numbered without brackets and ordered by first citation                                                                                         |
| Appendices         | numbered when present; Seznam příloh when applicable                                                                                                                      |
| Theory             | sourced explanation of necessary knowledge/concepts                                                                                                                         |
| Practical          | own contribution with design, implementation, and reproducible verification detail                                                                                          |
| Results/discussion | factual results followed by interpretation/comparison/limitations                                                                                                           |
| Conclusion         | returns to objective and introduces no new information                                                                                                                      |

## Authorial presentation choices

The guide does not prescribe page breaks before headings. The paper may retain its current page-break treatment as an authorial layout choice, provided that heading levels, numbering, sizes, and spacing remain compliant. Body paragraphs must follow the verified rule of no first-line indent and 8 pt spacing after each paragraph.

## Direct guide-text reconciliation

Before final submission, check whether the school has issued a guide newer than the verified 2024 document. If so, reconcile any changed declaration, title-page, submission, or formatting requirements before publication.

## Implementation rule

Use this contract for active formatting. Resolve any unconfirmed school-sensitive choice through the direct guide-text phase rather than assumption.

# PLAN — DarkFactory Paper

This is the single planning document for the publication. It consolidates the durable product and thesis contract, current actionable queue, execution roadmap, and accepted deferred work. Verified school requirements are recorded in the preceding section; the canonical manuscript is `index.typ`.

## Product and thesis contract — Product Requirements Document

### Product

**DarkFactory-Paper** is the complete academic publication system for the thesis:

**Praktický dopad AI na softwarové inženýrství - AI agenti a agentické inženýrství**

The primary product is the thesis itself. The repository also contains the evidence, source, build pipeline, publication outputs, and generic GitHub workbench required to make the work reproducible and reviewable.

The Goal section above defines the quality standard for the finished academic paper.

This file defines how the repository is moved toward this product.

### Users

#### Primary

- thesis author;
- thesis supervisor;
- school evaluator/opponent.

#### Secondary

- technical readers interested in agentic software engineering;
- contributors reviewing manuscript or implementation evidence;
- readers using the published web/repository representation.

### Product outcomes

The product must provide:

1. a coherent academic thesis;
2. reproducible evidence for DarkFactory-specific claims;
3. one canonical manuscript source;
4. deterministic publication outputs;
5. school-compliant final submission material;
6. a generic browser workbench for viewing and working with the repository and publication;
7. CI, Pages, and Release automation tied to exact repository revisions.

### Thesis direction

The thesis examines a transition in software development:

**software engineering is becoming Agentic Engineering as implementation work moves from a human directly operating an IDE toward software agents operating through a harness.**

The central proposition is not that the IDE disappears as a user interface. Rather, in agent-first development the **operational center of software work shifts from the IDE to the harness**.

A conventional IDE integrates the tools a human developer needs to inspect, edit, execute, debug, validate, and version software.

A harness performs the corresponding integrating role for a software agent: it supplies context, tools, environment access, persistent state, controlled effects, observations, verification, recovery, and orchestration.

The editor therefore increasingly becomes one human-facing interface into a development process whose runtime is the harness.

#### Historical progression

The thesis should establish this transition with a short, sourced historical progression rather than a separate product-history survey:

**IDE-centered development → IDE-integrated code completion → IDE-integrated chat assistants → IDE-integrated coding agents → agent-first / ADE-style development**

The purpose of this history is to show how AI moved from assisting individual editing actions to becoming an executor of increasingly complete software-development tasks.

Use representative examples only where they materially demonstrate a stage in that progression.

#### Chatbot-to-agent boundary

The motivation should explicitly distinguish ordinary conversational AI use from real coding-agent use.

A chatbot primarily returns conversational output—explanations, suggestions, code snippets, or proposed changes—while the human remains the executor who chooses context, edits files, invokes development tools, observes results, and carries the workflow forward.

A coding agent participates in an iterative execution process. Through a harness it can inspect the repository and environment, choose or follow a bounded plan, invoke tools, cause controlled changes, observe real outputs, update its working state, verify results, and continue toward an acceptance condition.

The Gradually adoption figure should support this distinction: broad generative-AI or chatbot adoption is not equivalent to adoption of coding agents. The comparatively small coding-agent population motivates explaining what changes when AI moves from conversational assistance to delegated execution.

#### Agent capability surface

Use the historical chatbot → agent transition as the natural place to introduce the capabilities that make agentic execution possible.

Explain these as parts of the harness/runtime rather than as isolated glossary entries:

- **Tools** — callable actions through which the agent reads, edits, executes, tests, searches, or otherwise affects its environment.
- **Skills** — reusable task-specific instructions, scripts, and resources that can be made available when relevant.
- **Hooks** — deterministic lifecycle handlers that enforce or trigger behavior around events such as tool execution, validation, or completion.
- **MCP** — a standardized protocol for connecting the harness to external tools and data sources.
- **State and context management** — persistence of the development process outside any one inference call and selection of information for the next decision.
- **Verification and observation** — real execution feedback such as tests, compilers, linters, CI, and repository state.
- **Orchestration** — coordination of multiple agent runs or roles when work can be decomposed and later integrated.

The paper should explain enough of this capability surface for a reader familiar only with chatbots to understand what a coding agent can actually do and why the harness, rather than the model alone, is the relevant engineering object.

#### Engineering transition

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

**Agentic Engineering is the set of engineering practices that make AI-assisted software engineering efficient, controlled, repeatable, and scalable.**

As AI takes responsibility for larger units of implementation work, those practices increasingly shape the software-engineering process itself. The engineer therefore works not only on the software product, but also on the conditions under which models and agents can perform useful work reliably.

#### Agentic Engineering practices

The paper should explain Agentic Engineering through the practices that improve the effectiveness of AI-assisted software engineering, not as a terminology catalogue.

Relevant practices include, where they materially support the argument:

- **Prompt engineering** — shaping instructions, constraints, examples, and output expectations so a model can perform a bounded task effectively.
- **Context engineering** — selecting, structuring, refreshing, and compacting the information available for each decision rather than treating the context window as passive storage.
- **Specification and acceptance engineering** — making intent, constraints, negative goals, and completion conditions explicit enough that delegated work can be judged mechanically and by review.
- **Goal loops** — structuring execution around repeated progress toward an explicit goal or acceptance condition, using observations and verification to decide the next step rather than treating one model response as the unit of work.
- **Tool and harness engineering** — choosing and constraining the tools, skills, hooks, protocols, permissions, state, and validation surfaces available to the agent.
- **Verification and feedback loops** — using tests, compilers, linters, CI, repository state, review, and other observations to turn generation into an iterative engineering process.
- **Multi-agent orchestration** — decomposing work across multiple agents or runs where useful, including coordinator/subagent patterns, parallel workers, swarms, and graph/workflow-based execution when the work can be meaningfully coordinated and integrated.
- **Human supervision and integration** — deciding where human judgment, review, approval, and accountability remain necessary.

These practices should be introduced as ways to increase useful work per unit of human attention while preserving engineering control. Their purpose is not maximum autonomy; it is effective software engineering with AI assistance.

#### Harness and IDE

The paper should make the analogy explicit but technically precise:

**the harness becomes for the agent what the IDE was for the human developer.**

This does not mean that a harness is a graphical IDE.

It means that both serve as the integrating environment around the primary executor:

- the IDE is organized around a human manipulating code and tools;
- the harness is organized around an agent manipulating a software-development environment.

The harness therefore becomes the development runtime for agentic work.

#### DarkFactory

DarkFactory is the concrete system through which the thesis explores this transition.

It should be presented as an implementation of harness-centered software development: a system intended to support the execution, control, verification, persistence, recovery, and orchestration required when agents perform meaningful portions of software-engineering work.

DarkFactory is therefore not merely an example of an AI agent or a wrapper around a model.

It is the practical realization of the thesis's proposed development architecture.

#### Evaluation

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

#### Semantic spine

The finished paper should read as one transformation:

**human-centered software engineering → AI-assisted development → delegated agentic work → Agentic Engineering practices → harness-centered execution → DarkFactory → evidence**

At the highest level, the argument is:

1. software development is moving from AI assistance toward meaningful delegation;
2. meaningful delegation changes the role of both the developer and the development environment;
3. the harness becomes the runtime that integrates the capabilities required by the agent;
4. Agentic Engineering provides the practices that make increasingly delegated AI-assisted development effective and controllable;
5. the harness supplies the runtime in which those practices can be executed;
6. DarkFactory implements this approach;
7. evaluation establishes which claimed properties are actually demonstrated.

This direction defines the intellectual structure of the thesis without requiring a rigid section-by-section taxonomy.

### Manuscript requirements

#### Canonical source

The authored manuscript is:

`index.typ`

Supporting material may live under:

- `bib/`;
- `img/`;
- `fonts/`.

There is one manuscript authority.

#### Academic structure

The paper contains the school-level macrostructure:

1. Úvod
2. Teoretická část
3. Praktická část
4. Výsledky a diskuse
5. Závěr

The detailed hierarchy is determined by the thesis direction and requirements in this Product and thesis contract section, while the Goal section defines the overall final-paper quality bar.

#### Presentation requirements

The intended reading rhythm should make major sections visually distinct and paragraphs clearly separated.

Target presentation:

- level-1 sections normally begin on a new page; Results may follow the final Practical paragraph when forcing a break would leave a nearly empty page;
- level-2 sections begin on a new page except the first subsection immediately below the parent-only Theory and Practical headings; these share a page with their parent;
- ordinary prose paragraphs use no first-line indent;
- paragraphs use 8 pt spacing after each paragraph;
- paragraph spacing should create clear boundaries without turning the page into a loose web/documentation layout.

These rules are verified directly against the 2024 school guide and recorded in the school-compliance section above.

#### Content quality

The manuscript must:

- present one coherent research argument;
- use connected academic prose;
- keep theory proportionate to the practical contribution;
- make DarkFactory the concrete subject of Practical;
- distinguish factual findings from interpretation;
- assess its stated objectives from evidence; a separate numbered set of research questions is not required;
- state limitations explicitly;
- avoid unsupported generalization.

#### Theory scope

The theoretical material exists to support the thesis argument and the later DarkFactory analysis, not to provide a general AI textbook.

The model section should establish only the concepts needed to understand the role and boundary of the model inside an agentic development system.

Product decisions for the current theoretical treatment:

- tokenization may be explained conceptually, but Byte-Pair Encoding (BPE) is not required;
- embeddings should remain a light conceptual example rather than a mathematical detour;
- retain the simple king/queen embedding example and `img/vector-embedding-queen.svg`;
- do not use the previous 3D embedding diagram;
- retain the ReAct loop where it clarifies the reasoning/action/observation execution cycle;
- retain the Gradually adoption figure as concise motivation/context;
- workflow graphs may be used to explain agent workflow planning;
- DAG-specific discussion is not part of the thesis;
- Vibe Coding is not part of the thesis argument;
- Prompt Injection is outside the intended theory scope.

These decisions define the intended level and focus without requiring a fixed paragraph or subsection layout.

#### Sources

Externally verifiable factual/mechanistic claims require appropriate citations.

Source preference:

1. original research;
2. standards/specifications;
3. first-party technical documentation;
4. high-quality secondary material where primary evidence is unavailable or the secondary source itself is the subject.

Bibliography records should correspond to material actually used by the final paper.

### DarkFactory requirements

#### Canonical revision

The practical chapter and evaluation must reference one explicitly pinned DarkFactory revision.

The following must agree on that revision:

- `darkfactory` submodule;
- manuscript implementation claims;
- Results evidence.

#### Practical chapter

The DarkFactory chapter must explain the system at the architectural level necessary to connect implementation with the theoretical argument.

It should cover the relevant runtime, state, control, capability, lifecycle, recovery, integration, and verification boundaries demonstrated by the implementation.

Package/file structure is included only where it explains architecture.

#### Implementation truth

Claims about DarkFactory behavior must be supported by one or more of:

- source code;
- tests;
- workflows;
- generated architecture documentation;
- reproducible execution evidence.

Intended architecture is distinguished from implemented behavior whenever they differ.

### Evidence requirements

DarkFactory implementation evidence is taken directly from the pinned `darkfactory` submodule, its source/tests/workflows, and the corresponding bibliography reference. Do not maintain a second manifest that duplicates the gitlink revision.

The Gradually adoption figure is stored directly as `img/gradually-ai-usage-2026.svg`. Its source provenance belongs in `bib/references.bib` and the manuscript citation; there is no runtime generator or duplicated data source.

Important implementation/evaluation claims must remain traceable to the exact source, test, workflow, or cited external source that supports them.

### Publication requirements

#### Canonical outputs

The repository must generate reproducibly from an exact commit:

- `ODBORNA_PRACE.pdf`;
- root `README.md` as the generated Markdown publication.

There is no published HTML artifact and no separate review-publication family. Source review and comparison operate on the canonical source and outputs.

#### Build contract

The repository root is a Bun workspace. Typst remains the manuscript compiler; Bun is the package manager and task runner for publication, web validation, Pages assembly, and release generation.

Canonical commands:

- `bun run publication` — generate the PDF and root Markdown publication;
- `bun run check` — build the publication and lint/typecheck/build the web workspace;
- `bun run web:acceptance` — execute real Chromium acceptance;
- `bun run site` — build and assemble the deployable site;
- `bun run clean` — remove generated site/web outputs while preserving tracked canonical publication files.

CI, Pages, Release, and contributor documentation must use this command surface rather than maintain a second orchestration layer.

#### Validation

Validation must exercise actual outputs and behavior rather than inspect source spelling.

It should verify, as appropriate:

- successful Typst compilation;
- bibliography/citation and asset resolution through compilation;
- canonical PDF/Markdown output presence;
- generic web lint/typecheck/build correctness;
- Chromium acceptance;
- Pages assembly.

Do not add source-text substring validators for prose, headings, dependencies, or implementation details.

### Web workbench requirements

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

### CI requirements

CI should validate in one canonical repository gate:

- thesis publication;
- evidence/provenance consistency;
- publication tooling;
- generic web application;
- repository consistency.

Required checks must correspond to the final repository product rather than intermediate development architecture.

### Pages requirements

GitHub Pages should publish:

- the generic web workbench;
- `ODBORNA_PRACE.pdf`;
- generated `README.md`.

The Markdown publication embeds its figure data, so Pages does not need a second copied image tree or a manuscript-specific publication manifest.

The published site must be usable from a clean deployment of the same commit.

### Release requirements

A canonical release must:

- be tied to an exact repository commit;
- contain the defined publication/submission artifacts;
- use deterministic artifact names;
- contain enough source/provenance information to reproduce or inspect the publication.

### Repository quality requirements

The final repository should contain only active product code, assets, documentation, and automation.

Coordination ownership is:

- Goal section — final-paper quality objective;
- the **Product and thesis contract** section of this file — finished product contract;
- planning sections — roadmap, workstreams, sequencing, and phase gates;
- the **Current queue** section of this file — current and next actionable coordination work;
- the **Deferred work** section of this file — accepted but intentionally deferred work;
- `AGENTS.md` — contributor rules and document ownership;
- school-compliance section — verified school contract and unresolved compliance conflicts;
- Generic IDE workstream section — IDE implementation workstream.

### Non-goals

The product is not:

- a comprehensive AI textbook;
- a survey of every agent product or framework;
- a glossary/encyclopedia of terminology;
- a historical archive of superseded repository architecture;
- a browser-side Typst compiler;
- a benchmark claiming general superiority of agentic development without evidence.

### Final acceptance

The product is ready for final submission/release when:

#### Paper

- the Goal section is satisfied by an end-to-end reading;
- all chapters are complete;
- DarkFactory Practical is implementation-backed;
- Results and RQs are evidence-backed;
- claims and citations survive a thesis-wide audit;
- annotations/keywords/conclusion match the final body;
- school requirements are fully resolved and applied.

#### Evidence

- DarkFactory revision is pinned;
- DarkFactory implementation claims are traceable to the pinned submodule and cited sources;
- important implementation/evaluation claims are traceable;
- implementation-specific figures match the pinned system.

#### Build

- canonical publication/validation/site commands pass from a clean checkout;
- publication outputs are reproducible;
- no required artifact depends on undocumented manual steps.

#### Web

- generic workbench acceptance passes;
- private/public repository workflows work;
- publication artifacts are navigable;
- dedicated web validation is green.

#### Delivery

- canonical CI is green;
- Pages deployment is reachable;
- canonical Release is published from the same accepted revision;
- final PDF has been inspected page by page.

---

## Current action queue

This section is the live current/next work queue. Keep it short and current.

### In flight

#### DarkFactory evidence and manuscript verification

- verify that the `darkfactory` gitlink, bibliography reference, manuscript claims, and figures all describe the same evaluated revision `e9c10221b40589512d262a0edb95f709b923150c`;
- preserve the distinction between the production GitHub Actions/Python controller path and the co-located TypeScript declarative graph engine;
- complete any missing methodology/run provenance needed to reproduce the stated structural findings;
- audit every DarkFactory-specific claim against source/tests/workflows at the pinned revision.

#### Final manuscript and school review

- re-read the generated `ODBORNA_PRACE.pdf` end to end and inspect it page by page;
- verify title page, declaration, annotations, keywords, contents, page numbering, figure/table treatment, bibliography ordering, citation rendering, paragraph spacing, and heading sizes against the verified school contract;
- check whether the school has issued a guide newer than the verified 2024 guide before final submission;
- audit factual claims and bibliography entries thesis-wide and remove unused sources/assets.

### Next

1. Finish evidence/provenance reconciliation.
2. Finish final manuscript/school review.
3. Run `bun run check`, `bun run web:acceptance`, and `bun run site` from the accepted revision.
4. Validate the Pages deployment.
5. Publish the exact-revision final release only after the manuscript and evidence are accepted.

### Coordination hygiene

After each review cycle:

- remove completed items from this section;
- promote newly actionable work from **Deferred work**;
- update the relevant governing section when a durable product, school, evidence, or sequencing decision changes;
- keep this file aligned with the repository; `README.md` is generated from `index.typ` and must not become a second hand-authored source.

---

## Execution roadmap — DarkFactory-Paper — Execution Plan

The Goal section defines the quality objective for the finished academic paper.

The **Product and thesis contract** section defines the finished product contract.

This file defines the concrete repository work and sequencing required to satisfy the goal and product contract.

the **Current queue** section of this file tracks the current/next actionable queue.

the **Deferred work** section of this file tracks accepted work that is intentionally deferred until its prerequisite or phase gate is reached.

### Workstream A — Build the paper from the argument

Primary files:

- `index.typ`
- `bib/references.bib`
- `img/**`

#### A1. Establish the manuscript architecture

Use this high-level structure as the working frame:

1. Úvod
2. Teoretická část
   - Jazykový model
   - Harness
   - Agentické inženýrství
3. Praktická část
   - DarkFactory
4. Výsledky a diskuse
5. Závěr

Use lower-level headings only where the argument genuinely benefits from them.

The final detailed structure is judged by reading flow, not by preserving a terminology taxonomy.

#### A2. Rebuild the paper around the engineering transition

Use the thesis direction in the **Product and thesis contract** section as the intellectual spine.

The paper should establish, with only the necessary historical context, the progression:

**IDE-centered development → code completion → integrated chat → integrated agents → agent-first/ADE-style development**

Use that progression to motivate the larger transition:

**software engineering → Agentic Engineering**

and:

**IDE-centered execution → harness-centered execution**

Make the chatbot → agent boundary explicit:

- chatbot: conversational output while the human remains the executor;
- coding agent: iterative repository/environment interaction through a harness, with tools, state, observations, controlled effects, verification, and continuation toward an acceptance condition.

Use that transition to introduce the concrete agent capability surface without turning it into a glossary:

- Tools;
- Skills;
- Hooks;
- MCP;
- state/context management;
- execution observations and verification;
- orchestration.

The theory should then explain only what is needed to support that argument:

- the relevant boundary of model inference;
- why delegated work requires a persistent execution environment;
- how a harness integrates state, tools, environment, effects, observations, verification, recovery, and orchestration;
- how Agentic Engineering improves AI-assisted software engineering through prompt/context engineering, explicit goals and acceptance criteria, goal loops, tool/harness design, verification feedback, and orchestration.

Agentic Engineering coverage should be practice-centered rather than definition-centered:

- prompt engineering;
- context engineering;
- explicit specifications, constraints, and acceptance criteria;
- goal loops driven by observations and verification;
- tool/harness engineering, including Skills, Hooks, MCP, permissions, and state;
- verification and feedback loops;
- multi-agent orchestration, including coordinator/subagent patterns, parallel workers, swarms, and graphs/workflows where useful;
- human supervision, review, and integration.

The paper should explain how these practices increase the efficiency and controllability of AI-assisted software engineering. Do not present them as isolated glossary entries or imply that maximum autonomy is the goal.

Current theory/visual acceptance decisions:

- keep tokenization conceptual and omit BPE-specific exposition;
- keep the embedding treatment to a concise king/queen example plus `img/vector-embedding-queen.svg`;
- do not use the previous 3D embedding diagram;
- keep Gradually;
- keep ReAct;
- allow workflow graphs for agent workflow planning without DAG-specific discussion;
- keep Vibe Coding and Prompt Injection outside the thesis.

Do not turn the historical progression into a product catalogue.

Do not organize the theory as a terminology taxonomy.

The conceptual emphasis should remain on the changing architecture of software development.

#### A3. Build the practical DarkFactory chapter from implementation truth

Use the `darkfactory` submodule as the local evidence source after pinning it to the selected canonical DarkFactory revision.

Before writing practical claims:

- update/fetch the submodule;
- choose one merged canonical DarkFactory revision;
- read its generated documentation, source, tests, workflows, package boundaries, and configuration;
- derive the practical chapter structure from the implementation.

The practical chapter should explain the architectural decisions that realize the theory, rather than enumerate files/packages.

#### A4. Rebuild Results and discussion from evidence

Use the pinned `darkfactory` submodule, source/tests/workflows, and cited external sources directly. Record provenance in the manuscript/bibliography where it is needed to support reproducibility rather than maintaining a parallel evidence database.

Results should be derived from verified evidence, then interpreted in prose.

#### A5. Write the framing last

After Theory, DarkFactory, and Results are stable:

- rewrite the Introduction;
- finalize the explanatory objective and concrete practical evaluation objective;
- finalize methodology;
- rewrite Conclusion;
- rewrite Czech annotation/English abstract;
- finalize concise keywords.

This ensures the front/back framing describes the paper that actually exists.

#### A6. Curate sources and visuals

For every bibliography entry and figure:

- identify the claim or argument it supports;
- keep it only if that contribution remains in the paper;
- prefer original research/specifications and first-party technical documentation;
- keep figures only when they communicate evidence/mechanism more effectively than prose.

The final visual set should be intentionally small.

### Workstream B — Simplify the Typst source

Primary file:

- `index.typ`

Target:

- manuscript content;
- citations;
- figures/tables;
- small presentation helpers.

Actions:

- express document structure directly with headings;
- express terminology directly in prose;
- use direct bibliography labels where practical;
- keep only formatting helpers that make the source clearer;
- keep review/comparison behavior outside the manuscript content model;
- keep paragraphs normally breakable;
- follow the verified heading pagination/layout choices recorded in this file;
- use no first-line paragraph indent;
- use 8 pt spacing after paragraphs with 1.5 line spacing;
- use conventional academic typography consistent with the verified school contract.

The source should be easy to read as a manuscript file without understanding a secondary semantic framework.

### Workstream C — Evidence support

Primary files:

- `darkfactory`
- `bib/references.bib`
- `img/darkfactory-pipeline.svg`
- `img/darkfactory-architecture.svg`
- `img/gradually-ai-usage-2026.svg`

Established invariants:

- the `darkfactory` gitlink is the authoritative evaluated implementation revision;
- DarkFactory-specific claims and figures must match that pinned revision;
- source provenance belongs in `bib/references.bib` and claim-local citations;
- the Gradually adoption figure is a static manuscript asset; its provenance is the local bibliography citation;
- generated figures that are no longer used by the manuscript are removed rather than retained historically;

Do not introduce a second evidence manifest or phase-numbered evidence files that duplicate authoritative repository state.

### Workstream D — Root Bun publication workspace

Primary files:

- `package.json`
- `index.typ`
- `scripts/publication.ts`
- `scripts/site.ts`

The publication architecture is established:

- the repository root is the Bun workspace;
- `index.typ` is the canonical manuscript;
- Typst is the document compiler;
- Bun owns orchestration;
- `ODBORNA_PRACE.pdf` and generated root `README.md` are the canonical publication artifacts;
- HTML is an internal temporary conversion format only for Markdown derivation and is not published;
- no Makefile, Python build layer, duplicate review build, or source-text contract validator is maintained.

Keep future changes on this single path. Do not recreate retired compatibility tooling.

### Workstream E — Direct school-guide reconciliation

Primary files:

- school-compliance section of `AGENTS.md`
- `index.typ`

Read the school PDF directly and resolve:

- title-page content;
- declaration wording;
- Czech/English annotation requirements;
- keywords;
- bibliography heading;
- page numbering;
- work-range/word/character-count requirement;
- figure/table lists;
- appendices;
- submission artifacts;
- page/word limits;
- similarity/plagiarism requirements;
- typography details.

Then encode only verified requirements in the school-compliance section and the Typst presentation layer.

### Workstream F — Generic IDE

The generic IDE completion lane is complete and merged.

Preserve:

- guided GitHub authentication;
- cross-surface tab movement;
- draggable and persistent root sidebar/panel sizing;
- generic repository editing/GitHub workflows;
- real Chromium acceptance;
- repository-agnostic behavior.

Typst editing remains source editing through Monaco. Canonical paper compilation remains a repository pipeline responsibility.

### Workstream G — CI, Pages, and Release

Primary files:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-docs.yml`
- `.github/workflows/release.yml`

Keep exactly these product automation responsibilities:

#### CI

- install the root Bun workspace;
- build the canonical publication;
- lint/typecheck/build the generic web app;
- run Chromium acceptance;
- assemble the Pages output.

#### Pages

- build from `main`;
- publish the generic workbench with `ODBORNA_PRACE.pdf` and generated `README.md`.

#### Release

- checkout an explicitly requested exact 40-character revision;
- build the canonical publication from that revision;
- publish `ODBORNA_PRACE.pdf` and `README.md` under the requested tag.

Do not recreate the retired autonomous-agent workflow or shared DarkFactory pipeline indirection.

### Execution order

#### Phase 1 — Paper foundation

Active until the theoretical and editorial foundation is stable enough that later work can focus on DarkFactory evidence rather than redesigning the thesis argument.

- rewrite the paper around the IDE → harness and Software Engineering → Agentic Engineering transition;
- use only light, sourced history for IDE → completion → chat → agents → agent-first/ADE development;
- keep model theory proportionate to the runtime/engineering argument;
- simplify `index.typ`;
- curate bibliography/figures alongside the rewrite;
- establish clean academic typography using the heading pagination and paragraph rhythm defined in PRD;
- keep Practical as a clean DarkFactory boundary until evidence is pinned;
- keep validators editorially generic rather than hard-coding level-2/3 prose structure;
- re-read the generated PDF end-to-end before accepting the phase.

Deliver as a PR for review.

#### Phase 2 — DarkFactory evidence + Practical

Begins from a stable DarkFactory revision.

- pin submodule;
- validate architecture;
- write Practical;
- refresh Results.

Deliver as a PR for review.

#### Phase 3 — Framing + school reconciliation

After the body/evidence are stable.

- finalize Introduction/objectives/RQs/methodology;
- finalize Conclusion;
- finalize abstract/annotation/keywords;
- complete direct guide audit;
- finalize typography/front/back matter.

Deliver as a PR for review.

#### Phase 4 — Publication pipeline

Complete. The repository uses the root Bun workspace and canonical root PDF/README artifact set.

#### Phase 5 — IDE + workflows

Complete. The generic IDE is merged and CI/Pages/Release use the root Bun/Typst command surface.

#### Phase 6 — Final integration

After all review PRs are accepted.

- re-read the final paper end-to-end;
- verify every factual claim/citation/evidence link;
- verify DarkFactory SHA/provenance;
- run the complete build/site/release matrix;
- inspect final PDF page by page;
- validate Pages;
- validate release assets from one final commit;
- keep the final repository free of unused paper assets, scripts, and workflow paths.

### Review gates

Every implementation phase ends in an open PR.

Workers do not merge their own PRs.

A PR is ready for review only when its relevant validation passes and its diff contains only its owned workstream.

### Canonical validation target

The canonical command surface is:

- `bun run publication`;
- `bun run check`;
- `bun run web:acceptance`;
- `bun run site`.

CI, Pages, Release, and contributor instructions must stay aligned with these commands.

---

## Deferred work — Backlog

This file contains **accepted work that is intentionally deferred**.

Items move to the **Current queue** section of this file when their prerequisite is satisfied or they become the next actionable work. Do not implement backlog items opportunistically in unrelated PRs.

### DarkFactory evidence and Practical

Prerequisite: paper foundation accepted and a stable DarkFactory revision selected.

- pin the `darkfactory` submodule to the canonical evaluated revision;
- validate implementation-specific architecture figures against the pinned revision;
- write the practical DarkFactory chapter from source/docs/tests/workflows/configuration;
- rebuild Results and discussion from that evidence;
- ensure manuscript, bibliography reference, figures, submodule SHA, and CI provenance agree.

### School-guide reconciliation

Prerequisite: stable paper body and direct access to the authoritative guide.

Resolve from the guide itself:

- title-page requirements;
- declaration wording;
- annotation/abstract and keyword requirements;
- bibliography heading;
- pagination;
- length/work-range rules;
- figure/table lists;
- appendices;
- submission artifacts;
- similarity/plagiarism requirements;
- typography details.

Resolved presentation rule:

- the verified school contract requires **no first-line indent** and **8 pt paragraph spacing**;
- the manuscript and validators must preserve that rule.

### Final delivery

Prerequisite: manuscript, evidence, web workbench, and publication pipeline accepted.

- final end-to-end manuscript edit;
- page-by-page PDF inspection;
- complete citation/evidence provenance audit;
- clean-checkout build validation;
- Pages validation;
- release artifact validation from the same accepted commit;
- remove unused assets/scripts/workflows;
- publish the canonical final release.

# Repository instructions — DarkFactory-Paper

## Governing document

`AGENTS.md` consolidates the quality objective, verified school-compliance contract, product and thesis plan, current work, deferred work, and Generic IDE workstream.
- `README.md` is generated from the manuscript by the canonical build; repository instructions live here.

Update the owning document when a durable decision changes. Do not recreate separate TODO, backlog, school-rules, or product-requirements documents.

## Canonical thesis source

`index.typ` is the only authored Typst manuscript.

Supporting resources may live in:

- `bib/`
- `img/`
- `fonts/`

Keep manuscript ownership singular. Do not add another authored `.typ` source or a separate review manuscript.

## Editorial standard

Optimize the manuscript for the Goal, thesis contract, and verified school requirements recorded in this file.

The argument must explain:

- the boundary between a chatbot and an executing coding agent;
- the shift from an IDE-centered workflow to a harness-centered runtime;
- Agentic Engineering as the practices that make AI-assisted software engineering effective, controlled, repeatable, and scalable.

Connect tools, skills, hooks, MCP, persistent state, verification, and orchestration to the harness/runtime. Explain Agentic Engineering through practices: explicit goals and acceptance criteria, prompt and context engineering, iterative goal loops, tool and harness design, verification feedback, multi-agent orchestration, and human review/integration.

Use connected academic prose, meaningful headings, concise explanations, claim-local citations, primary research or specifications where possible, and verified implementation evidence for practical claims. Distinguish observed evidence from interpretation and state limitations directly.

## Citations

Use one ISO 690 numeric bibliography.

In-text citations must be full-size numbers in round parentheses. Multiple sources must appear in one pair of parentheses separated by semicolons. Do not use superscript citation indices or collapsed numeric ranges.

Every bibliography entry must be cited, every citation must resolve, and sources must support the local claim. The Agent Swarm discussion must cite the Kimi K2.5 paper, not the retired OpenAI Swarm repository.

## DarkFactory evidence invariant

All DarkFactory-specific claims must refer to the single evaluated revision:

`e9c10221b40589512d262a0edb95f709b923150c`

The `darkfactory` submodule/gitlink, bibliography URL, manuscript, figures, and Results must agree on that revision. Use only the bibliography key `darkfactory-e9c10221` for DarkFactory implementation claims.

Do not conflate the production GitHub Actions/Python controller path with the co-located TypeScript declarative graph engine; describe their relationship exactly as implemented at the pinned revision.

## Publication artifacts

The canonical publication artifacts are:

- `ODBORNA_PRACE.pdf`
- `README.md` (generated Markdown publication)

Do not generate an HTML publication or separate final/review artifact types. Review happens through source diffs and the canonical outputs.

Use the repository's canonical build and validation commands and keep CI, Pages, and release metadata aligned with them.

## Author review and git

Do not stage changes to the thesis manuscript or its supporting thesis assets unless the author explicitly asks after reviewing them. Leave such edits unstaged for inspection.

Do not commit, push, merge, or delete branches merely because a build succeeds. A substantial phase is proposed through a pull request only after the author approves the unstaged thesis changes. The worker that opens a pull request does not merge it without an explicit author instruction.
