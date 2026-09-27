# Brief: clean rewrite of the thesis (chapter 1 + chapter 2)

**Revision 2.** Two independent reviewers audited revision 1. Their blocking
findings are fixed here and are marked **[R2]**. Do not re-litigate them; if you
think one is still wrong, say so in your report rather than working around it.

You are writing a **new** Czech academic text. You are not editing, patching or
"improving" an existing text. Read `PAPER.pdf` **only** for scope and intent.
Reproducing its sentences is a failure, not fidelity.

**Output: Czech.** Academic register, third person.

## 0. Resulting structure, and its status **[R2]**

```
1 Úvod
  1.1 Cíl, výzkumná otázka, hypotéza a vymezení
  1.2 Terminologie               ← KEEP, unchanged, cross-referenced
2 Teoretická část
  2.1 Softwareová továrna         ← promoted, was 2.4
  2.2 Model a harness             ← absorbs the old 2.1
  2.3 Agentické inženýrství
  2.4 Co posunuli agenti          ← promoted from a 2.4 subsection
3 Metodická část                 ← NEW top-level chapter, the guide's own
                                  structure, NOT a subsection of the practical
4 Praktická část
5 Výsledky a diskuse
6 Závěr
```

**Methodology is its own top-level chapter, positioned between theory and
practice** — which is the structure `guide.md`'s own table describes. It is
numbered 3, so the practical part moves to 4, results to 5 and the conclusion
to 6. The current deviation (methodology buried as 3.1 inside the practical
part) is abandoned in favour of the guide's structure, so the documented
deviation disappears rather than multiplying.

**This pass writes chapters 1 and 2 only.** Chapter 3 is designed here so the
structure is settled, but it is written in a later pass — §5 below is its
specification, not your assignment.

**Chapter 1 relies on Terminologie for every specific term.** `1.2 Terminologie`
declares the coinages; `1.1` points to it and does not define terms itself. The
existing `10-intro.typ:14` cross-reference (`sezbrán v @terminologie`) must
survive — **removing the section breaks the Typst build.**

**Also now false and needing a later pass:** `components/metadata.typ` lines 24
and 27 (the annotation and the English abstract) both state the old research
question and a hypothesis you are replacing, and both claim the process structure
is "invariant to the choice of tool". `rules.md` A9 records the annotation and
abstract matching the scope as a *previously fixed* defect, so this is a repeat
of a logged error unless it is fixed. `rules.md` A6 records the hypothesis's
absence as fixed too — which is why you must write one. Chapter and section
numbers change throughout, including in the annotation, the abstract, the
contents, the list of figures, and every cross-reference.

**Report these consequences. Do not edit those files yourself** (§1).

## 1. What you produce

Text only, for chapters 1 and 2.

- **Do not** write to the repository. No edits, no commits, no staging, no
  scratch files inside it. Write your output to `/tmp/df-rewrite/` and report the
  paths. **[R2]** Revision 1 said "no writes" and "output two files" in adjacent
  bullets; a second writer resolved that by writing into the repository.
- **Do not** write chapters 3, 4 or 5. Chapter 1 must *set up* the practical part,
  not describe it.
- One file per chapter.

### Output format **[R2]**

The deliverable is consumed by a human who will place it into a Typst project.
Write **Typst-shaped Markdown**:

| You write | It becomes |
| :-- | :-- |
| `# ` | `#heading(level: 1)` |
| `## ` | `#heading(level: 2)` |
| `### ` | `#heading(level: 3)` |
| `*term*` | `#emph[term]` |
| `**term**` | `#strong[term]` |
| `@key` | stays literal; Typst resolves it |
| a figure | a fenced block with the `#figure(...)` call to be reconstructed |

**Emit heading text with no numbers.** `styles/headings.typ` applies `1.1`
numbering at build time; a number you type will print twice. **Do not number
citations either** — order is resolved at build time. Your obligation is to cite
at first mention and to use only keys that already exist in
`paper/components/bib/references.bib`.

## 2. The argument

This is a **survey, and that is the method, not a retreat.** The five principles
are not rules the field obeys; they are the working methods, named by the field
itself and shown to work. Objectivity comes from the evidence, not the taxonomy.
A survey that only enumerates is a list. A survey that weighs evidence, names
disagreement, distinguishes *measured* from *argued*, and is allowed to return a
negative result is a thesis. Hold that standard. **[R2]** Revision 1 said
"the thesis's own contribution" in §3 and "Nobody has published on it" in §5,
which contradicts the survey framing and is an absolute novelty claim no source
supports. Both phrases are deleted. Say what the sources converge on; pose the
rest as questions.

**Cíl (goal), use this wording: [R5]**

> Rozhodující součástí agentického vývoje softwaru není schopnost jazykového
> modelu, ale návrh systému, v němž model pracuje. Cílem práce je tento názor
> vyargumentovat z dostupných zdrojů a prověřit na záměrně minimální
> implementaci, že právě tento návrh je nositelem schopnosti, o níž mluvíme.

**The goal mentions no separation from a harness, and neither may anything else.**
Revision 2 asked the writer to test *„zda lze návrh systému oddělit od harnessu,
který agenta pohání"*. That is not what this work does, and the author has
removed it. The pipeline in chapter 3 **is** a harness — the runner, the gates and
the stored state are its harness. It uses production harnesses underneath as its
execution engines, for simplicity; a later thesis replaces them, and that fact is
not part of this thesis's argument. **Do not describe the pipeline as a way of
working without a harness, as a harness-free pipeline, or as a way of separating
design from harness.** Those framings are wrong, not merely unused.

**Hypotéza (hypothesis) — you must include this. [R2]** Revision 1 dropped it,
which re-opens a defect `rules.md` records as fixed. Use this wording, which is
also free of the separation framing:

> Praktická autonomie je vlastností návrhu systému, který práci řídí, a nikoli
> vlastností modelu, který v něm pracuje. Strukturu, kterou práce popisuje,
> autor navrhuje sám; úsudek o tom, co je v jednotlivém kroku správné, však
> přebírá od smyčky, kterou nevlastní — a právě v tomto rozdílu leží hranice,
> za kterou teprve vlastní harness pomůže.

**Výzkumná otázka (research question), use this wording:**

> Které principy musí agentický systém splnit, aby vykonával inženýrskou práci?

**"Inženýrská práce" must be defined. [R2]** It is the object of the research
question and it appears nowhere in the brief or the paper. One sentence, in 1.1:
*engineering work is a change to a repository that a person other than the author
can review and merge without asking the agent anything.* That is the sense in
which the thesis measures capability, and it is the sense in which the human gate
is load-bearing.

**Reconcile `musí splnit` with conditional necessity. [R2]** The question commits
to necessity; §3 forbids absolute necessity. These are compatible and the
distinction is the thesis: the answer is **necessity relative to what the model
achieves unaided**. State it once, explicitly, in 1.1 — and do not let chapter 2
quietly slide into "always necessary", which is refutable by a better model.

**The three criteria for "řízená" — the author has approved these. [R3]** They
exist nowhere in the repository; the brief previously demanded them without
supplying them. They are the author's operationalisation, not the field's, and
**§5 places them in chapter 3, which is a later pass.** For chapters 1–2 you need
only to establish that `řízenost` is a defined term: say once, in `1.1`, that the
thesis uses it in a specific sense and that the sense is set out in the
methodological chapter, and leave the detail there. Do not define the criteria
inline.

1. **Stav je mimo model a dohledatelný** — the run's state lives in the repository
   and is inspectable without asking the model.
2. **Brány jsou explicitní** — every transition has a named, reproducible check.
   Keep three kinds **apart** and never blend them: a deterministic check (CI exit
   code), a model call (a review or plan another model makes), a human decision.
3. **O tom, co vstoupí do produkce, rozhoduje člověk** — merging is not the
   pipeline's call.

## 3. The finding

Three claims, in order. **[R2]** Revision 1 stated the third as an impossibility
and called it a contribution. Both are corrected below.

**(a) The system layer is currently load-bearing.** Across 5194 execution
trajectories there is substantial variation in completion, process quality,
efficiency and failure behaviour across model–harness pairings, and the
conclusion is that agent capability should be reported at the *model–harness
configuration* level, not attributed to the base model alone.
`@yao2026harnessbench`

**(b) What the harness contributes to performance can be internalised — and the
scaffold is then only partly removable.** **[R2]** Revision 1 said "the scaffold
can be taken away". That is wrong on the arithmetic, and both reviewers caught it:
27.7 % at a stated retention of 85.2 % implies a scaffolded figure near 32.5 %,
so roughly 4.8 pp is lost. Write the number, do not round it into a triumph: the
model retained 85.2 % of its scaffolded pass rate and then ran with no external
scaffold at all. `@ding2026scaffold` Internalisation also *generalises*: a model
fine-tuned on planning-aware trajectories from a single scaffold gains
consistently on scaffolds it never trained on. `@thangarajah2026dcas`

**(c) What the harness contributes to deciding what counts as finished is not
shown to be internalisable — and the thesis argues that only as asymmetry of
available evidence, never as impossibility.** **[R2]** Revision 1 converted a gap
in the literature into a positive impossibility claim. That is an argument from
silence and it is the most exposed sentence in the document. The defensible form:

> Every source in this thesis that measures performance separates the worker from
> the judge. None of them reports the judge being internalised. That is not proof
> that it cannot be; it is the state of the evidence, and the thesis says so.

The positive support is that the judging function is defined by reference to
external evidence in every case: a stronger model *„does not remove the need for
explicit mechanisms that govern what information is exposed, which actions are
authorized, and how failures are traced"* `@gu2026harness`; the evaluator in
Claude Code's own goal loop *„does not call tools, so it can only judge what
Claude has already surfaced in the conversation"* `@claude-goal`; and self-
evaluation fails in a specific direction — agents *„respond by confidently
praising the work"* `@anthropic-harness-design`

**Say the limitation in one sentence in 2.3:** absence of a reported
internalisation is not proof of non-internalisability.

**Where the boundary sits.** Conditional, and measured twice: +14.5 % average
across five benchmarks, *„with gains largest where baselines are lowest"*
`@chen2026harnessx`; and Anthropic's own component ablation, which found the
evaluator's worth depends on the task sitting *„beyond what the current model does
reliably solo"* and became *„unnecessary overhead"* on a newer model.
`@anthropic-harness-design`

## 4. Do NOT claim these

- **Not "the system beats the model."** A category error; the answer is a
  relation. The field's own position paper is careful: progress will depend *as
  much* on system design as on stronger models, not instead of them.
- **Not "we can make the agent do anything."** The literature raises this as an
  objection and answers it. What you may say: anything we can design a harness
  around can be performed by a model with well-placed human gates, and can then
  be learned on.
- **Not that the control structure is invariant to the choice of tool. [R2]**
  Revision 1 told you to retract "portability across harnesses" — a phrase that
  appears **nowhere in the paper**. The claim that *is* there is stronger, in four
  places:

  | Where | Wording |
  | :-- | :-- |
  | `components/metadata.typ:24` (anotace) | *„její struktura je vůči volbě nástroje invariantní"* |
  | `components/metadata.typ:27` (abstract) | *„its structure is invariant to the choice of tool"* |
  | `pages/41-discussion.typ:20` | *„Tato struktura je vůči tomu, kdo vykonává modelové kroky, invariantní"* |
  | `pages/50-conclusion.typ:12` | *„invariantní, což je tvrzení, z něhož lze prokazatelně vycházet"* |

  Note the difference, because it is now the other way round. The **discussion**
  makes a narrow claim: the process structure is the author's own and does not
  depend on *who* executes the model steps. That is **true and is the thesis's own
  property** — the runner, gates and stored state are the author's design, so this
  independence is a fact about his own work, not a general law. The **conclusion
  and both abstracts** inflate it into a general claim and add *„prokazatelně"* —
  provably. That does not survive, because cross-scaffold degradation is
  documented: what a model has internalised from *one* scaffold's conventions is
  not portable to another. So: keep the narrow claim, attributed to this work;
  drop the general one, and do not repeat *„prokazatelně"*.
- **Not absolute necessity.** Conditional on the model's unaided ability.
- **Not a negative result the survey may not return. [R2]** "The literature does
  not answer this" is a permitted result. A survey that can only return positive
  findings reads as advocacy.

## 5. Chapter 3, Metodická část — specification only, NOT this pass **[R3]**

Revision 2 put this in `1.2`; the author has moved it to its own top-level
chapter between theory and practice. You are not writing it. It is specified
here so the structure is settled and so chapter 1 knows what to point forward to.

It has two halves, and they are **not** substitutes for each other:

- **the source protocol** — how sources were found, screened, typed and weighted;
- **the reproducibility record** — what was built and under what conditions, so
  the research can be repeated. This is currently `pages/31-practical-method.typ`
  and it is the content `guide.md` weights highest of any item, asking whether
  the method is *"poplána tak, že podle ní lze výzkum opakovat?"*. **It must be
  carried over substantially unchanged, not shortened to make room, and the
  source protocol does not replace it.**

Restructure the source protocol as a **protocol**, in this order. Three numbers
beat zero.

1. **Corpus.** State the search space (which indexes, venues and vendors), the
   window (*sources published up to [date]; nothing later was consulted*), the
   number screened, the number used, the number rejected. **[R2]** Without a
   cut-off date the survey is false by the time of the defence — the five arXiv
   papers are ten weeks old.
2. **Inclusion rule.** A principle counts as belonging to the field only if it is
   named in a **primary source from a vendor that ships the product**. Justify it
   on its merits — verifiability (`rules.md`: *„Zdroj musí být dohledatelný"*) —
   and cite the bibliography's two past accidents as evidence the rule is not
   pedantic, not as its reason. **[R2]** Revision 1 used the accidents as the
   justification, which a commission hears as rationalisation.
3. **Typing.** Every load-bearing claim carries, in the prose, one of
   *measured · argued · documented in vendor documentation · the author's own
   hypothesis*. This is the strongest defence in the document. **[R2]** Note the
   three bodies are Anthropic, OpenAI and Google — all **vendors**. Do not call
   them laboratories; in Czech *laboratoř* means something specific and wrong here.
4. **Convergence.** The principles count because independent vendors arrived at
   them separately, without citing each other. Give each instance a **checkable
   form** — publication date and venue for each independent naming. **[R2]**
   Revision 1 asserted a negative ("neither citing the other's design") that you
   cannot establish by reading two product documents. Write instead *"nemají
   společný primární zdroj"*, which you can.
5. **The three criteria for *řízená*** (§2), stated here as the author's
   operationalisation, not a definition of the field.

## 6. The composition question

**The pipeline in chapter 3 is a harness.** The runner, the gates and the stored
state are its harness. It uses production harnesses underneath as its execution
engines, because that is simpler; a later thesis replaces them, and this thesis
makes nothing of it. The consequence for the argument is narrow and worth stating:
because the outer layer is a harness in its own right, the model meets **two**
sets of scaffold conventions at once.

That is the situation `@thangarajah2026dcas` measures: open trajectory datasets
for fine-tuning are collected *"almost exclusively under OpenHands"*; models
fine-tuned on them *„degrade substantially when deployed under any non-training
scaffold"*; and decisively, *„Untrained base models do not show this
divergence"* — the gap is induced by fine-tuning, not a property of the model.
Planning separates into *explicit* (a plan as a first-class artefact) and
*implicit* (structural conventions shaping execution through the loop), and a
controlled intervention found plan-quality gains *„exceeding the cross-scaffold
drops we observe."*

So the question chapter 3 answers: **this author's harness runs on top of other
harnesses — whose conventions is the model following, and what does the outer
layer cost?** Pose it in 1.1. **Do not answer it in chapter 2, and do not claim it is
unpublished** — say the literature does not address composition, which is a claim
you can support by what the sources cover.

## 7. Chapter 2 spine

- **2.1 Softwareová továrna** — FIRST, as lineage. The conference report quotes
  Bemer's working paper on its own page 94; the coinage claim rests on his
  biography, not the report. **[R2]** Say *„s. 94 původního vydání"* — the
  downloadable PDF is a 136-page 2001 OCR reprint and a reader who lands on
  page 94 of it will think you fabricated it. Then the part that carries the
  argument: the inventors worried automation would remove judgement. McIlroy:
  *„It would be immoral for programmers to automate everybody but themselves."*
  `@nato1969` Bemer, nine years later: *„One does not build a successful factory
  with just tools and environment. The workers must be trained, and the assembly
  methodology … must be in place."* `@bemer1977factory`
- **2.2 Model a harness** — absorbs the old 2.1. Two or three sentences on what the
  model is; what each side supplies; the boundary is a question of responsibility,
  not implementation. Then context window, context rot, compaction — and note
  compaction alone was not sufficient, per Anthropic's context-reset finding.
  Then the agentic loop and ReAct. `@yao2022` `@anthropic2024tooluse`
  `@langchain-harness` Use Harness-Bench's named failure mode here: *„execution-
  alignment failures, where plausible reasoning becomes decoupled from tool
  feedback, workspace state, evidence, or verifiable output contracts"* — that is
  exactly what a deterministic gate catches.
- **2.3 Agentické inženýrství** — the five principles, each developed, none a bare
  list item: **Prompt, Context, Loop, Workflow/Graph, Harness.** Give each its
  load-bearing evidence. Within it: the goal loop (origin Huntley, not ReAct),
  orchestration, the human gate, the internalisation argument, the boundary.
- **2.4 Co posunuli agenti** — steps → judgement, and what that does not remove.

**§7's own subsections are renumbered. [R2]** No sentence anywhere may refer to a
section by number; refer by name or by label. `12-intro-terminology.typ`'s header
comment maps terms to the *old* numbers and will become false — flag it.

**The old 2.1 and its figure. [R2]** `21-theory-language.typ` and
`@fig-embedding-queen` are not mentioned in this brief and their fate is
undecided. Do not cite Mikolov or Vaswani for anything about agents — Vaswani
contains no agent, harness, tool or orchestration content. **Compression to two
or three sentences inside 2.2, dropping the figure, is the recommended course** —
but say in your report that you dropped a figure, because a removed figure changes
the generated list of components (`rules.md`: a component not in the list is a
graded defect).

**Taxonomy warning. [R2]** Two lists are in play at different levels and must not
be merged. Gu decomposes a harness into *components* — memory substrate, context
constructor, skill-routing layer, orchestration loop, verification-and-governance
layer. HarnessX defines the harness as *„the prompts, tools, memory, and control
flow"*. The field's five are *discipline names*. One sentence is enough.

## 8. Source discipline

**Read the sources. Do not work from memory of them.**

- **Primary before secondary.** Wiegold is *secondary* to Huntley and says so
  himself.
- **Every substantive claim needs a citation**, using only keys already in
  `references.bib`. If you need a source that is not there, see the rule below.
- **Never cite a source you have not read.**
- **Never cite one of the five preprints alone. [R2]** Pair every preprint claim
  with a source a supervisor can open in a browser without an account — an
  Anthropic, OpenAI or Google engineering post, `AGENTS.md`, Huntley's original.
  Where no pairing exists, downgrade the wording from *proved* to *reported by a
  single unrefereed study*.
- **Preprint policy. [R2]** Say in the prose, once per source, that it is an
  unpublished preprint. Never in a `note` — the CSL drops those. **Print the year
  only, not the day**: `@ding2026scaffold`'s arXiv record (ID `2608.05156`) states
  22 May 2026, which contradicts its own August identifier, and a reviewer who
  checks will notice. Do **not** describe `@thangarajah2026dcas` as peer-reviewed:
  it carries an ASE '26 footer but the arXiv record lists no venue.
- **Declare conflicts of interest. [R2]** HarnessX is a product; Anthropic's
  ablation is first-party; Gu's paper ships a reference implementation. One clause
  each: *the authors ship a competing implementation, so the result is theirs.*
- **Say what kind of paper each source is.** `@gu2026harness` is a position paper
  with a reference implementation — citable for vocabulary and framing, **not**
  for measured claims. The other four are measurement papers.
- **Resolve the missing keys. [R2]** Revision 1 required claims it had no sources
  for. These are **not** to be written until fixed: Google's hooks (no source
  exists), and the `AGENTS.md` participant list (unverified whether the page
  enumerates participants). If you need a key that is not in the bibliography,
  follow the rule below rather than improvising.

**When a required sentence has no source. [R2]** Revision 1 said "report it",
which is unusable mid-paragraph. Do this instead, in the moment:
1. Use the nearest existing primary source, and record the mismatch in your report.
2. If none is defensible, weaken the sentence to a definition-level statement that
   needs no citation, and mark the paragraph `<!-- NEEDS SOURCE: … -->`.
3. **Never invent a key.**
4. You **may** propose a `.bib` entry — type, author, title, year, URL, and the
   exact claim it would support — for the author to add. Proposing is authorised;
   writing into the repository is not.

**Produce a quotation ledger**: for every direct quotation, the exact words, the
`@key`, and where in the source it is. An unverifiable quotation is worse than a
paraphrase.

### Verified material — wording exact, read first-hand

Quoted **words** stay in the source language, in Czech quotation marks. Numbers
are localised: decimal comma, non-breaking space before `%` and before the unit,
`o 8,1 procentního bodu`. **Never `pp`.** **[R2]** Revision 1 wrote its own
numbers in English style, which would have introduced `14.5 %` into a document
that elsewhere prints `0,36~%`.

**On the system layer being load-bearing.** `@yao2026harnessbench` defines the
harness as *„the system layer that manages context, tools, state, constraints,
permissions, tracing, and recovery"*, and concludes that *„agent capability
should be reported at the model-harness configuration level rather than
attributed to the base model alone."*

**On the taxonomy and the threshold.** `@gu2026harness`: *„Together, these
components form the agent harness, which translates model capability into
long-horizon agent behavior."* And: *„once models reach a sufficient capability
threshold, many additional gains in long-horizon agent performance increasingly
depend on how the system around the model is designed."* Note also that
evaluation is *„largely model-centric, often reducing agents to final-task
success while treating memory, retrieval, tool use, orchestration, verification,
and governance as secondary implementation details"* — a fair criticism of how
the field measures itself, and a good sentence for your survey.

**On the boundary, measured.** `@chen2026harnessx`: *„the runtime harness,
comprising the prompts, tools, memory, and control flow"*; +14.5 % average across
five benchmarks, *„with gains largest where baselines are lowest"*; and the
diagnosis: *„today's harnesses remain largely hand-crafted and static … the rich
traces produced during execution are rarely distilled back into systematic
improvement."*

**On internalisation.** `@ding2026scaffold`: *„Post-training of large language
models optimizes only parameters, while inference-time procedural scaffolds are
typically designed independently of parameter training. This disconnect makes it
difficult to automatically acquire and internalize complex strategies."* Result:
skills +8.1 pp; *„after progressive distillation the model still achieves a
27.7% passed rate without any external scaffold (distillation retention rate
85.2%)."* Mechanism named: co-evolution *„through discovery, distillation, and
dynamic recompilation."*

**On the portability counter-result.** `@thangarajah2026dcas`: data collected
*„almost exclusively under OpenHands"*; models *„degrade substantially when
deployed under any non-training scaffold"*; *„Untrained base models do not show
this divergence, indicating the gap is fine-tuning-induced and tied to the
conventions of the training scaffold."* Their scaffold definition is usable:
*„the harness that turns a language model into an autonomous coding agent: it
manages the agent loop, exposes a set of tools to the model, structures multi-turn
conversations, and decides when the agent has finished."* A small measurement
worth quoting: *mini-swe-agent* reaches *„above 74% Pass@1 with a strong frontier
model despite its minimal harness, illustrating that as model capability grows,
scaffold complexity matters less."*

**On the human gate, from the vendors.** `@anthropic-harness-design`: *„When asked
to evaluate work they've produced, agents tend to respond by confidently praising
the work—even when, to a human observer, the quality is obviously mediocre."* And
the necessary-but-insufficient version: *„Separating the agent doing the work from
the agent judging it proves to be a strong lever … The separation doesn't
immediately eliminate that leniency on its own; the evaluator is still an LLM that
is inclined to be generous towards LLM-generated outputs."* Honest cost, same
source: solo 20 min / $9 versus full harness 6 hr / $200, *„over 20x more
expensive, but the difference in output quality was immediately apparent"*; the
simplified harness 3 hr 50 / $124.70. First-party admission: *„Out of the box,
Claude is a poor QA agent. In early runs, I watched it identify legitimate issues,
then talk itself into deciding they weren't a big deal and approve the work
anyway."*

`@claude-goal`: *„`/goal` adds a separate evaluator that checks your condition
after every turn, so completion is decided by a fresh model rather than the one
doing the work."* Three verdicts — not yet met / met / **impossible** — so a model
can end a run negatively. A Stop hook *„can run a script for deterministic checks
or a prompt for model-evaluated ones"*.

`@openai-goals`: *„completion must be evidence-based"*; *„the evidence decides
whether it's done"*; *„Reaching a budget limit is not the same as completing the
objective."* Human gate as architecture: *„Pausing, resuming, clearing, and
budget-limited transitions remain controlled by the user or the system."* The
six-part goal vocabulary — outcome, verification surface, constraints, boundaries,
iteration policy, blocked stop condition — is sharper than anything the thesis
has for planning.

`@openai-codex-2025`: *„It still remains essential for users to manually review
and validate all agent-generated code before integration and execution."* And the
one that cuts against everything: *„On coding evaluations and internal benchmarks,
codex-1 shows strong performance even without AGENTS.md files or custom
scaffolding."* Engage with it — it removes one artefact, not the control layer.
The page now carries a banner saying the post is outdated; worth one clause.

**On context.** `@anthropic-context-engineering`: *„LLMs have an 'attention
budget' that they draw on when parsing large volumes of context. Every new token
introduced depletes this budget by some amount"*; *„good context engineering means
finding the smallest possible set of high-signal tokens that maximize the
likelihood of some desired outcome."* On tools: *„If a human engineer can't
definitively say which tool should be used in a given situation, an AI agent can't
be expected to do better."* Mechanism — the U-shaped degradation, the closed-book
baseline, self-attention *„technically equally capable of retrieving any token
from their contexts"* — `@liu2024`

**On the goal loop's origin.** Huntley's Ralph loop, July 2025, not ReAct.
`@huntley2025ralph` `@wiegold2026ralph` `@claude-goal` `@openai-goals`

## 9. Length **[R2]**

Revision 1 gave a minimisation rule and a maximisation rule in one sentence with
no priority, and a ceiling measured by a method it never stated. Both reviewers
found the content list does not fit inside it.

**Measurement, so the number is reproducible:** non-whitespace characters of the
**rendered Czech body text**, excluding `//` comments, Typst markup, `@key`
citation keys, code blocks and figure captions. Report the count *and* the method
you used. Current chapter 2 measures **12,984** by that definition; current body
**33,285**.

**A budget with a cut order, not a ceiling.** Target 11,000–12,900 for chapter 2:
2.1 Továrna 2,600 · 2.2 Model a harness 3,200 · 2.3 Agentické inženýrství 5,000 ·
2.4 Co posunuli agenti 2,100.

**Compress in this order and no other:**
1. any sentence that restates its heading;
2. a vendor restating a claim already sourced elsewhere in the chapter;
3. an example that does not change a verdict.

**Never compress, even if a subsection exceeds its budget:** a source
qualification · a counter-result · a boundary condition · a sentence the
practical part or the annotation depends on.

**If a subsection lands below 80 % of its target, it is wrong, not short** — say
which protected item it is missing. If it exceeds by more than 10 %, you have
added an *argument* rather than a paragraph: name it and defend it, or cut it.

**Sentences may be long. [R2]** A thesis that reads as telegraphic to save
characters loses more on language (15 of 200 marks, and no tool distinguishes
collocation from error) than it gains on length. Polish last, count first.

**Chapter 1 has no ceiling and will grow** — it gains a Metodika. The new
subtotal is ~6,500–7,500 against a current 5,543, so chapter 2 must give back the
same amount for the body not to grow. **Report the projected page count alongside
the character count and flag it as the author's decision, not yours.** A shorter
document is a real cost against the cohort and there is no written assignment to
check scope against.

## 10. Known traps in the existing text

- **The goal loop was cited to ReAct.** ReAct is about interleaving reasoning and
  acting; nothing about an outer loop with acceptance criteria. `yao2022` belongs
  in 2.2.
- **The invariance claim — see §4.** Four locations, two different claims, one of
  them inflated.
- **`23-theory-agentic.typ:38` needs a bridge sentence. [R2]** It says *„Oba tak
  řeší totéž, co sleduje i tato práce: práci koná jeden model a její přijetí
  posuzuje druhý."* The most attackable sentence in the paper: the practice has
  two **model-evaluated** gates and admits it (*41-discussion.typ`: *„ani druhá
  brána — kontrola souladu s plánem — deterministická není"*), so the theory
  claims to solve a governance weakness the practice concedes. Note that
  `@claude-goal`'s evaluator has the identical defect. Bridge it or a commission
  finds it in thirty seconds.
- **`24-theory-factory.typ` — delete the Guild percentages.** **[R2]** Revision 1
  said the numbers are self-measured but not to delete them. Printed numbers read
  as evidence. Also `24-theory-factory.typ:20` (*„odpovídá tomu, co popisují i
  systémy postavené mimo tuto práci"*, citing `@factory2026 @bcg2026`) **is** the
  trend claim §10 restricts those two sources from making. Self-defeating.
- **`@gradually-ai-usage-2026` — KEEP the figure. [R3]** The author has decided:
  the visualisation stays. It carries no argument; it motivates the introduction,
  and the numbers are an estimate the caption already says they are. So:
  - keep `@fig-gradually-usage` and keep it in the introduction;
  - **the caption must keep stating the figures are an estimate**, because the
    bibliography's `note` does not print (§8) and the caption is the only place
    that reaches the reader;
  - keep the in-text reference **and** the figure-list entry — a component
    without a reference is a graded defect (`rules.md`: *odkaz v textu je
    povinný*);
  - the numbers must still not be used to support any claim. If the only sentence
    containing them is the one introducing the figure, that is the whole extent
    of their use.
  Do not open the chapter with them; they sit after the statement of what
  changed.
- **The CSL silently drops `note` fields** (verified: `text macro="note"` appears
  only in the fallback branch of the CSL). Provenance must live in the prose.
- **Never write a claim no source supports.** The old text asserted a factory
  "automates execution, not decision" — Cusumano never said that and he could not
  be read.
- **`@ref`/label orphans. [R2]** Report every key the current chapters 1–2 cite
  that your rewrite does not, and every key nothing cites any more. The
  bibliography must be pruned or the printed list is wrong. Note the `.bib` holds
  49 entries and the document cites 30 — verify what the build prints before
  trusting any count.
- **The Terminologie section is not a glossary and must survive. [R2]** It
  declares a coinage, it is cross-referenced live from `10-intro.typ:14`
  (`sezbrán v @terminologie`), and removing it **breaks the Typst build**. Keep it,
  keep the cross-reference. Add one sentence that *agentické inženýrství* means the
  set of practices — it exists today at `10-intro.typ:19` and would otherwise be
  lost.
- **`governance` stays untranslated. [R3]** The author has decided this. Set it in
  `#emph[]` on first use, consistently with the paper's existing practice of
  keeping English terms (`review smyčka`, `spec-driven development`,
  `coordinator/subagent`), and **define it once at first use** — it carries half
  the finding and currently appears undefined. Suggested gloss: *řízení a
  ověřování*. Keep the gloss as a gloss; do not substitute it for the term.
- **Your own voice.** §1 says third person; several verified quotations are
  first-person vendor prose. Quoting them is fine. Do not adopt the register.

## 11. Report back

- The two chapter files, with their paths.
- Character count per chapter, and the measurement method.
- **Projected page count**, flagged as the author's decision.
- The quotation ledger.
- Every `<!-- NEEDS SOURCE -->` marker you left.
- Every key that needs adding to the bibliography, with full details.
- Every cross-file consequence in §0 you found but did not touch.
- Anything you think is wrong in this brief. If the argument does not hold, say so
  — do not write around it.
