# DarkFactory-Paper — Completion Plan

This file contains only the **current active thesis execution path**. Deferred DarkFactory integration, evidence refresh, final closure, and publication work live in `BACKLOG.md`.

- Thesis source: `paper/PAPER.typ`
- Durable repository rules: `AGENTS.md`
- School contract: `SCHOOL_RULES.md`
- Backlog: `BACKLOG.md`
- Independent IDE lane: `web/PLAN.md`

## Source contract

`paper/PAPER.typ` is the only authored Typst manuscript source.

Supporting resources may live in:
- `paper/bib/`
- `paper/data/`
- `paper/img/`
- `paper/fonts/`

Do not recreate a schema, manifest, concept-file hierarchy, generated manuscript source, or another authored thesis `.typ`.

Generated PDF/HTML/Markdown/review/site artifacts are outputs, not sources.

## Locked title

**Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory**

Use this title consistently in document metadata, title page, README/documentation references that describe the thesis itself, and generated publication metadata when touched by the active manuscript phase.

## Central argument

The final manuscript follows one causal line:

**model capability makes increasingly complex software work possible → a model still operates only over the information and interfaces available in a particular inference → a harness adds continuity, tools, an executable environment, state, and control around inference → Agentic Engineering determines how those capabilities are used as a disciplined software-engineering process → DarkFactory is the concrete architecture implementing that approach → evaluation establishes which properties are actually supported by reproducible evidence.**

The text must continuously serve this argument.

Do not preserve material merely because it is accurate, sourced, already written, or part of the former concept taxonomy.

## Canonical final hierarchy

Maximum numbered heading depth is **3**.

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

Chapter 2 owns the general theory and methodology, including Agentic Engineering.

Chapter 3 is reserved exclusively for the actual DarkFactory architecture and implementation. Do not place generic Agentic Engineering material in Practical.

The subsection structure below 3.1 is intentionally **not invented before the DarkFactory evidence phase**. When that backlog item is promoted, subsection titles must be derived from the pinned canonical DarkFactory architecture and only then fixed. This is an evidence dependency, not editorial freedom for the current rewrite.

## Writing contract

The final text must read as one intertwined academic argument, not as a glossary, documentation site, or sequence of mini-articles.

### No filler or metadiscourse

Avoid prose whose main function is to announce the document rather than communicate substance.

Remove or rewrite constructions such as:
- “Tato práce se zabývá…”
- “V této práci…”
- “V této části…”
- “Následující kapitola…”
- “Jak bylo uvedeno…”
- “Tato část stanovuje…”
- “Úplné definice jsou ponechány…”
- chapter-by-chapter narration that merely repeats the Contents.

Use a structural sentence only when the reader genuinely needs orientation that cannot be obtained from the heading and surrounding argument.

### Paragraph rule

A paragraph exists only if it:
- advances the central argument;
- explains a mechanism required by a later claim;
- presents relevant evidence;
- interprets evidence;
- establishes a necessary limitation;
- or makes a substantive transition by showing why the next mechanism follows.

Do not add prose merely to make a section longer, smoother, or symmetrical.

Preferred paragraph logic:

**claim/context → necessary explanation → source/evidence where required → consequence or next inference**

A paragraph may perform several of these functions at once. Do not mechanically split definition, example, and implication into separate paragraphs.

### Terminology rule

Introduce terminology inline at the point where the reader needs it.

Define a term once, only to the depth needed by the thesis, then use it normally.

Do not create headings, cards, blocks, or repeated explanation for individual terms.

Do not explain concepts that are apparent to the intended reader unless a specific property of that concept matters to the argument.

Examples:
- Git, branch, Pull Request, CI, review, and test do not need textbook definitions; explain only their relevant engineering role.
- Session, Transcript, and State need a concise distinction because that distinction supports recovery and context separation.
- Tool versus Tool Calling needs only enough explanation to establish that the model requests an operation while the harness validates/routes/executes the external effect.

### Source and citation rule

The prose must remain source-driven without becoming source-shaped.

- preserve claim-local citations for factual or externally verifiable claims;
- prefer original papers, specifications, and first-party documentation;
- synthesize multiple sources into one coherent paragraph where appropriate;
- do not create one paragraph per source merely to demonstrate coverage;
- use a source once where the claim belongs instead of repeating the same evidence later;
- do not retain a claim if its only purpose was to support a removed taxonomy item;
- do not invent current product behavior, API behavior, benchmark values, architecture facts, or empirical results;
- do not over-explain qualifications that are already apparent from precise wording;
- after the rewrite, remove bibliography entries no longer cited.

### Transition rule

A transition must carry an inference, not merely announce navigation.

Good:
> Modelová inference končí výstupem nad konečným aktivním kontextem; dlouhodobý stav a účinky proto musí spravovat okolní runtime.

Bad:
> Následující část se proto zabývá Harnessy.

### Repetition rule

Explain evidence and mechanisms once at their semantic owner.

Later sections should use the established result rather than redefine it.

Examples:
- Lost in the Middle belongs in 2.1.2; 2.3.3 should use the resulting context-engineering implication without re-explaining the experiment.
- the agent loop belongs in 2.2.1; 2.3 should discuss control of the loop, not redefine the loop.
- Git/PR/CI mechanics belong in the relevant Agentic Engineering workflow passage and should not be repeated in Results.

## Locked editorial decisions

These decisions are no longer open during implementation.

### Keep

High-value visuals/evidence:
- Gradually adoption figure;
- Epoch ECI capability-trend figure;
- ReAct agent-loop diagram.

Core conceptual distinctions:
- model inference versus harness runtime;
- finite active context versus persistent external state;
- Session versus Transcript versus State, expressed compactly;
- model-requested tool use versus externally executed effects;
- sandbox/permission boundary;
- explicit specification/planning before implementation;
- exact revision / branch / PR / CI verification boundary;
- context selection and compaction for long-running work;
- deterministic controls and human approval where needed;
- Workflow Graph versus DAG distinction if needed by the DarkFactory connection.

### Remove

From the final manuscript:
- Karpathy Vibe Coding tweet screenshot;
- Artificial Analysis benchmark table and detailed model ranking comparison;
- both embedding diagrams;
- Claude Code UI screenshot;
- Antigravity IDE screenshot;
- standalone Model Provider treatment;
- standalone Inference Engine treatment;
- standalone Temperature treatment;
- standalone KV Cache treatment;
- product quickstarts/examples whose only purpose is to prove a term exists;
- Plugin as an independent theory topic;
- Script as an independent theory topic;
- `.agents/` as an independent theory topic;
- `.claude/` as an independent theory topic;
- Slop as a formal concept;
- Kimi Agent Swarm discussion unless the future pinned DarkFactory implementation uses “swarm” as a material architecture concept;
- standalone RAG theory detour unless retrieval is actually needed to explain the final context strategy;
- all encyclopedia/glossary/term-index material;
- empty appendix machinery if no real appendix remains and the school guide does not require it.

### Compress

- Vibe Coding: at most a concise contemporary contrast in 1.1; no standalone definition or image.
- embeddings: remove as a teaching topic; mention vector retrieval only if later prose genuinely requires it.
- tokenization: only enough to explain that model context is represented and limited in tokens.
- Skills/Hooks/MCP: one compact 2.2.3 subsection about reusable extensions, event-driven enforcement, and interoperable external capabilities.
- AGENTS.md and CLAUDE.md: one concise comparative passage in 2.3.3 as product-specific examples of persistent repository instructions.
- Handoff: retain only if needed to distinguish ownership transfer from central orchestration.
- repository evidence in Chapter 4: prefer a compact evidence table over repetitive SHA/run prose when it improves readability.

## Section-by-section rewrite specification

### 1.1 Motivace a vymezení problému

Purpose: establish the actual engineering problem quickly.

Required order:
1. capable models can perform meaningful software tasks, but plausible generated output is not equivalent to a controlled engineering process;
2. concise Gradually adoption evidence establishes the contemporary context;
3. Epoch ECI establishes rapidly improving model capability;
4. benchmark/model capability still does not provide persistent task state, verified effects, isolated change, deterministic checks, recovery, or controlled integration;
5. Vibe Coding may appear only as a short contrast between unstructured natural-language iteration and disciplined engineering;
6. close on the substantive chain from model capability to harness and controlled agentic engineering.

Actions:
- remove current boxed opening paragraph;
- remove Karpathy tweet image and its standalone explanation;
- remove Artificial Analysis table and the detailed GPT/Claude comparison;
- do not spend multiple paragraphs defending the adoption visualization;
- do not include “the paper proceeds in four steps” or equivalent structure narration.

### 1.2 Cíl práce a výzkumné otázky

Merge current:
- Východisko a argument práce;
- Cíle;
- Hlavní cíl;
- Dílčí cíle;
- Výzkumné otázky.

Required content:
- one direct paragraph stating the main objective: design and technically evaluate a harness architecture for long-running agentic software development, with DarkFactory as the implementation artefact;
- a short subgoal list only if useful for school compliance/readability, reduced to approximately:
  1. establish the necessary model/harness theoretical basis;
  2. formulate a controlled Agentic Engineering methodology;
  3. realize it in DarkFactory;
  4. evaluate implementation, integration, and repository evidence;
- retain three RQ themes:
  - controlled autonomy;
  - interruption/recovery;
  - persistent state versus active model context.

Do not add prose that merely explains that goals and questions are being listed.

### 1.3 Metodika

Keep only substantive methodology:
- literature/specification/first-party documentation review;
- design-science construction of the artefact;
- evidence categories: source implementation, automated tests, CI, integration evidence, repository evidence;
- conclusions must be limited to what those evidence classes actually establish.

Remove the separate “Struktura práce” section entirely unless the direct school guide later proves it mandatory.

Do not narrate what every following chapter contains.

### 2.1 Jazykový model

Opening function:
- establish that a language model transforms active context into probabilistic output;
- make clear that persistent workflow state and external effects are outside the model itself.

Do not turn the opening into a definition card.

#### 2.1.1 Architektura a reprezentace

Target: approximately 3–4 substantive paragraphs.

Paragraph flow:
1. combine LLM and Transformer into one explanation of autoregressive generation over context and attention-based processing;
2. combine tokenizer/token into one concise explanation sufficient to establish token-bounded context;
3. mention learned vector representations only if required to explain representation/retrieval; no embedding tutorial;
4. transition directly to inference limits.

Delete:
- separate LLM/Transformer/Tokenizer/Token/Embedding headings;
- GPT-3 example box;
- BPE/Sonnensystem example;
- token example;
- embedding analogy exposition;
- 2D embedding figure;
- 3D embedding figure.

#### 2.1.2 Inference a kontext

Target: approximately 3–4 substantive paragraphs.

Required flow:
1. explain inference over the current context;
2. explain finite context-window capacity;
3. use Lost in the Middle evidence to establish that fitting information into the window does not guarantee equally reliable use of it;
4. conclude that a single inference cannot provide durable task continuity, which motivates the harness.

Delete:
- dedicated Model Provider section;
- dedicated Inference Engine section;
- vLLM/PagedAttention example;
- Temperature section;
- KV Cache section and capacity discussion.

If provider/runtime distinctions are needed later for DarkFactory, introduce them there against the actual implementation rather than teaching them generically here.

### 2.2 Harness

Opening function:
- contrast model inference with the stateful runtime around it;
- define “Harness” once in prose;
- establish that the harness repeats model steps, maintains continuity, mediates tools/environment, executes effects, and constrains access.

Delete both generic product UI screenshots.

#### 2.2.1 Smyčka a stav

Target: approximately 4 substantive paragraphs plus the ReAct figure.

Required flow:
1. explain the action/observation loop: Model → action → tool/environment → observation → Model, with optional terminal result;
2. retain ReAct as the source and retain the diagram;
3. explain continuity/session;
4. distinguish transcript/history from currently valid persisted state and from active model context;
5. end on recovery/continuation across inference boundaries.

Do not retain separate Session, Transcript, State headings or their product example boxes.

#### 2.2.2 Prostředí a nástroje

Target: approximately 4 substantive paragraphs.

Required flow:
1. the environment is real external state, such as repository files/processes/services;
2. combine Tools and Tool Calling: the model chooses/requests, while the harness validates/routes/executes;
3. actual code execution provides observations from real builds/tests/commands instead of model predictions;
4. sandbox/permissions bound the consequences of those effects.

Delete independent headings and product quickstarts for Environment, Tools, Tool Calling, Code Execution, and Sandbox.

Keep concrete first-party evidence only where it supports a mechanism the prose actually needs.

#### 2.2.3 Rozšíření

Target: approximately 2–3 paragraphs.

Required flow:
1. reusable instruction/resource packages, with Skills as a concise example;
2. runtime event enforcement, with Hooks as a concise example;
3. interoperable external capability integration, with MCP as the protocol example.

Delete independent theory treatment of:
- Plugin;
- Script;
- `.agents/`;
- `.claude/`.

The subsection must explain extension mechanisms, not catalogue platform packaging conventions.

### 2.3 Agentické inženýrství

This entire material moves from Practical into Theory.

Opening function:
- establish Agentic Engineering as the software-engineering methodology for deliberately using the harness mechanisms described in 2.2;
- do not present it as another runtime layer;
- state the process once, then develop it through the four subsections below.

Delete the current boxed definition and explicit “Praktický význam”.

#### 2.3.1 Zadání a plánování

Target: approximately 3–4 paragraphs.

Required flow:
1. a software change begins with desired outcome, constraints, non-goals, and acceptance conditions;
2. specification separates required behavior from premature implementation detail;
3. planning decomposes the specification into bounded work and verification steps;
4. the specification/plan remain the reference point for later review.

Use GitHub Spec Kit briefly as concrete first-party evidence for the pattern.

Do not retain separate Spec-Driven Development / Planning / Review articles.

Move Review into 2.3.2.

#### 2.3.2 Řízení změny a ověřování

Merge current change-control, quality/verification, and review material.

Target: approximately 5–6 paragraphs.

Required flow:
1. generated code is a candidate change, not evidence of correctness;
2. version control and branch isolation provide an exact, reviewable change history;
3. a Pull Request provides the integration boundary around a concrete diff;
4. deterministic checks convert acceptance conditions into builds, static analysis, tests, integration tests, generated-artifact checks, or other machine-verifiable gates;
5. CI attaches those checks to the exact revision being considered;
6. review compares that verified revision with the original requirements and either accepts it or returns a concrete defect to the next repair iteration.

Delete textbook definitions of Git, branch, PR, CI, and integration test.

Delete “Slop” as a formal concept. Preserve only the useful principle that vague quality judgments should be converted into explicit reproducible criteria where possible.

#### 2.3.3 Instrukce, kontext a autonomie

Merge current instruction/context and behavior-control material.

Target: approximately 5–7 paragraphs.

Required flow:
1. distinguish stable system rules, repository/project instructions, task specification, and dynamic runtime context;
2. use AGENTS.md and CLAUDE.md only as concise product-specific examples of versioned repository instructions, preserving that they are separate mechanisms;
3. explain context engineering as selecting information for the current decision instead of accumulating all history;
4. combine just-in-time retrieval/injection and compaction into the same context-management argument;
5. mention RAG only if necessary as one retrieval technique, not as its own theory topic;
6. address untrusted external context / prompt injection only to the degree necessary to motivate provenance, least privilege, validation, and separation of data from authoritative instructions;
7. combine goal loops and guardrails into the principle that autonomous iteration needs explicit completion criteria, budgets, and programmatically enforced boundaries;
8. use HITL for decisions that cannot or should not be resolved automatically.

Do not re-explain context-window evidence from 2.1.2.

Do not create separate headings for Prompt Engineering, System Prompt, AGENTS.md, CLAUDE.md, Context Engineering, Context Injection, Compaction, RAG, Prompt Injection, Goal Loops, Guardrail, or HITL.

#### 2.3.4 Orchestrace

Target: approximately 4 paragraphs.

Required flow:
1. multi-agent execution is useful only where work can be partitioned with clear ownership and integration responsibility;
2. explain subagents/orchestrator-workers as bounded delegation with explicit return contracts;
3. mention handoff only if the distinction between delegated work and ownership transfer is necessary;
4. explain Workflow Graph where explicit ordering/branching/loops matter and preserve the graph-versus-DAG distinction;
5. conclude that parallelism does not replace ownership, verification, or the integration boundary.

Remove Kimi Agent Swarm and the dedicated “Swarm” concept unless the future pinned DarkFactory implementation materially uses that abstraction.

### 3 Praktická část / 3.1 DarkFactory

The active coherence phase must:
- move Agentic Engineering out of Practical;
- leave Chapter 3 structurally reserved for DarkFactory;
- keep 3.1 **DarkFactory** empty or minimally placeholder-only;
- not invent architecture prose;
- not derive subsection titles from stale DarkFactory plans or open PRs.

The future backlogged DarkFactory phase will:
- pin a canonical merged revision;
- generate/read canonical docs;
- verify implementation truth;
- then establish the exact 3.1.x structure from the actual architecture.

### 4 Výsledky a diskuse

The active coherence phase may rewrite the existing evidence presentation for style and structure but must not refresh or strengthen DarkFactory evidence.

Preserve current evidentiary limitations until the backlogged DarkFactory phase replaces the snapshot.

#### 4.1 Ověření implementace a systému

Merge current “Ověření mechanismů” and “Ověření systému”.

Required flow:
1. identify the currently evaluated snapshot once;
2. summarize component/test evidence;
3. summarize integration evidence;
4. state explicitly what is not established, especially a missing full live lifecycle where still true.

Do not re-explain DarkFactory architecture here.

#### 4.2 Ověření na repozitářích

Keep repository-level evidence only.

Prefer a compact table:
**Repozitář | Revize | Důkaz | Výsledek**

Follow it with concise interpretation and limitations.

Do not repeat full SHA/workflow prose if the table already carries it.

#### 4.3 Odpovědi na výzkumné otázky

Three concise paragraphs:
- **O1** immediate answer → evidence → limitation;
- **O2** immediate answer → evidence → limitation;
- **O3** immediate answer → evidence → limitation.

Do not add subsections for individual questions.

#### 4.4 Diskuse a omezení

State:
- what the evidence supports;
- what it does not support;
- lack of representative performance/cost/latency benchmarking;
- missing full lifecycle/fleet evidence where still true;
- any limits of generalizing from the selected repositories.

Do not repeat Chapter 4 results sentence by sentence.

### 5 Závěr

Target: approximately 3 substantive paragraphs.

Required flow:
1. contribution: why reliable agentic software work requires runtime/state/control beyond model generation;
2. findings: what the implementation/evidence establishes relative to the research questions;
3. strongest limitations and the direct remaining validation boundary.

No new information.

Avoid citations unless an external factual claim is truly unavoidable.

Do not repeat the entire abstract or Results chapter.

## Front matter

Keep:
- title page;
- declaration;
- Czech annotation;
- English abstract only if confirmed by the school contract;
- concise keywords;
- Contents.

### Keywords

Replace the current glossary dump with approximately 5–8 thesis-level keywords.

Working set:
- agentní AI;
- agentické inženýrství;
- agentní harness;
- softwarové inženýrství;
- jazykové modely;
- autonomní agenti;
- DarkFactory.

Exact Czech/English presentation is finalized during direct school-guide reconciliation.

### Annotation / abstract

Rewrite after the body coherence pass so both describe the manuscript that actually remains.

Use concise factual prose. Do not enumerate chapter structure.

## Back matter

Keep bibliography and only genuinely applicable lists.

Remove:
- encyclopedia;
- term index;
- concept backlinks;
- glossary navigation;
- empty appendix infrastructure when no appendix remains and the school guide does not require it.

The combined Seznam obrázků a tabulek remains only if still applicable/required after the visual cut.

## Visual policy

Every visual must explain or establish something more efficiently than concise prose.

Final active-pass target:
1. Gradually adoption figure — keep;
2. Epoch capability-trend figure — keep;
3. ReAct agent-loop diagram — keep;
4. future DarkFactory architecture/workflow figure — only after the pinned DarkFactory phase and only if supported by the actual architecture.

Remove:
- Karpathy tweet screenshot;
- Artificial Analysis benchmark table;
- both embedding diagrams;
- Claude Code interface screenshot;
- Antigravity interface screenshot.

Remove image-generation/data plumbing used only by deleted visuals when safe and in scope.

## Typst simplification

The source must stop modelling manuscript semantics.

Remove where no longer required:
- bibliographic alias variables and the `bib` alias map; prefer direct bibliography labels;
- `terms` registry;
- `semantic-term`;
- `term-full-name`;
- `term-link-label`;
- `term()`, `kw`, and `render-term`;
- term superscript asterisks;
- concept-only labels used by the encyclopedia;
- example labels used only by the old concept architecture;
- review-mode callouts;
- `alert`, `note`, `issue`, `critique`, `scope-note`;
- `added`, `draft`, `accepted`, `finalized`, `removed`, `diff`;
- definition/example wrappers;
- one-off figure macros whose only purpose is to hide fixed content;
- Artificial Analysis JSON/table plumbing after that table is removed;
- custom text-tree / word-count machinery unless the direct school guide proves that a generated word/character count on the title page is required.

If the current title-page range count depends on the custom word-count machinery, remove the machinery during Phase 1 and leave final range presentation to Phase 2 unless a simple direct implementation is clearly required by verified school text.

Keep only small presentation helpers that reduce straightforward formatting duplication.

Do not build another abstraction layer while removing the old one.

## Typography contract

Use conventional academic typography.

- A4;
- school-compliant margins;
- readable 12 pt serif body;
- justified paragraphs;
- school-required line and paragraph spacing;
- ordinary breakable paragraphs;
- remove the global `#show par` rule that makes every paragraph unbreakable;
- left-aligned headings;
- no decorative heading indentation;
- level 1: approximately 16 pt bold;
- level 2: approximately 14 pt bold;
- level 3: approximately 12 pt bold;
- no level 4–6 manuscript styles after the rewrite;
- level-1 chapters may begin on a new page;
- simple 10 pt figure/table captions;
- monochrome/print-friendly code;
- remove dark IDE-style code-block styling;
- restrained print-friendly link styling;
- no decorative callout boxes in final output.

Use `SCHOOL_RULES.md` as the current floor. If an unresolved formatting choice materially affects the rewrite, inspect the direct school-guide text rather than guessing.

## Active execution

### Phase 1 — Whole-paper coherence, theoretical restructure, and formatting rewrite — NEXT

This is one coordinated editorial pass over the existing manuscript.

It supersedes the old concept-based structure and absorbs encyclopedia removal.

#### Exact execution order

1. **Establish clean source skeleton**
   - update title;
   - establish the canonical hierarchy above;
   - move Agentic Engineering from 3.1 to 2.3;
   - reserve Chapter 3 / 3.1 for DarkFactory only;
   - remove all level-4 concept headings;
   - remove encyclopedia/term index and appendix plumbing tied only to it.

2. **Remove semantic/review abstractions**
   - delete term registry/link/marker machinery;
   - delete review/diff/callout machinery;
   - remove definition/example wrappers;
   - simplify citation calls toward direct bibliography labels;
   - remove unneeded word-count/text-tree machinery;
   - remove unneeded one-off content macros.

3. **Rebuild typography**
   - implement the typography contract above;
   - restore normal paragraph breaking;
   - simplify heading styles;
   - simplify code/link/caption presentation.

4. **Rewrite Chapter 1**
   - implement 1.1, 1.2, 1.3 exactly as specified;
   - remove structure narration and filler metadiscourse;
   - keep Gradually + Epoch;
   - remove Karpathy image + Artificial Analysis table.

5. **Rewrite 2.1**
   - merge glossary concepts into continuous prose;
   - remove embedding/inference-runtime detours;
   - preserve only theory needed for context limits and the model/harness boundary.

6. **Rewrite 2.2**
   - integrate loop/state/tools/environment/extensions;
   - retain ReAct figure;
   - remove product UI screenshots and extension catalogue.

7. **Move and rewrite Agentic Engineering as 2.3**
   - create exactly four subsections;
   - synthesize existing sourced material into one methodology;
   - delete per-term treatment and irrelevant product taxonomy.

8. **Normalize Chapter 3 boundary**
   - Chapter 3 contains only 3.1 DarkFactory;
   - leave implementation content deferred;
   - do not invent 3.1.x subsections.

9. **Rewrite Chapter 4 stylistically**
   - merge 4.1/4.2 into new 4.1;
   - preserve existing evidence snapshot and limits;
   - compact repository evidence;
   - provide direct RQ answers;
   - remove definition-block presentation.

10. **Rewrite Chapter 5**
    - three-paragraph synthesis;
    - no new information;
    - no unnecessary citations.

11. **Rewrite front/back matter**
    - concise annotation/abstract aligned to actual body;
    - 5–8 keywords;
    - remove encyclopedia and empty appendix structures;
    - retain only applicable figure/table lists.

12. **Prune supporting material**
    - remove assets/data used only by deleted figures/benchmark table where safe;
    - remove bibliography entries no longer cited;
    - search for stale concept labels, `Praktický význam`, old section numbers, old title, term markers, and deleted visual references.

13. **Validate**
    - run `make all BOOK=DarkFactory`;
    - run `make ci BOOK=DarkFactory`;
    - run `make site BOOK=DarkFactory`;
    - run any narrower validator/tests affected by source simplification.

14. **Read the generated paper end-to-end**
    - inspect final and review PDF from title page through bibliography/back matter;
    - verify prose continuity, page breaks, heading hierarchy, figures, captions, bibliography, whitespace, and absence of glossary artifacts;
    - fix presentation or continuity defects discovered by actual reading, not just grep/build checks.

#### Phase 1 exit

All must be true:
- title is the locked title;
- canonical hierarchy matches this plan;
- Agentic Engineering is 2.3 under Theory;
- Practical contains only DarkFactory;
- no level-4 term headings remain;
- no explicit `Praktický význam` remains;
- no standalone definition/example cards remain;
- no encyclopedia/term index remains;
- no semantic term registry remains;
- no term-star/linking framework remains;
- no review/diff content framework remains;
- prose is continuous and source-backed;
- no paragraph exists merely to announce structure or restate an obvious point;
- retained technical detail is necessary for the central argument;
- removed visuals and their dead plumbing are gone;
- keywords are concise;
- paragraphs break normally;
- typography is conventional and print-oriented;
- retained factual claims have appropriate citations;
- unused bibliography records from removed content are cleaned up;
- full builds pass;
- generated PDF has been read/inspected end-to-end.

### Phase 2 — Direct Odborná-práce guide reconciliation

After the manuscript is structurally and editorially clean, complete the remaining direct-text audit of the actual school guide.

Resolve exactly:
- declaration wording;
- whether English annotation/keywords are mandatory;
- annotation requirements;
- bibliography heading;
- title-page requirements;
- whether work range / word or character count must be printed and how;
- submission artifacts;
- page/word limits if any;
- similarity/plagiarism requirements if any;
- exact pagination requirements;
- figure/table-list rules;
- appendix/list-of-appendices rules;
- any remaining typography requirements not already verified.

Then:
- reconcile `SCHOOL_RULES.md`;
- apply only verified corrections;
- rerun all canonical builds;
- inspect the final school-sensitive pages visually.

## Current-plan exit

The active plan ends after Phase 2.

At that checkpoint:
- the paper has one coherent editorial voice and causal argument;
- Theory contains model, harness, and Agentic Engineering;
- Practical is reserved exclusively for actual DarkFactory architecture;
- semantic/glossary machinery is gone;
- formatting is clean and school-sensitive rules are directly reconciled;
- DarkFactory implementation/evidence integration remains intentionally backlogged;
- final evidence refresh of Chapter 4 remains downstream of that DarkFactory phase;
- final closure/publication QA remains deferred in `BACKLOG.md`.
