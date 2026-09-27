# Brief: clean rewrite of the thesis (chapter 1 + chapter 2)

You are writing a **new** Czech academic text. You are not editing, patching or
"improving" an existing text. Read `/Users/user/Projects/DarkFactory/PAPER.pdf`
**only** for scope and intent. Reproducing its sentences is a failure, not
fidelity. Where the existing text is wrong (see §9), do not preserve it.

**Output language: Czech.** Academic register, third person. No contractions, no
rhetorical questions, no "v této práci se budeme zamýšlet".

## 1. What you produce

Text only, for chapters 1 and 2 (theory). Nothing else.

- **Do not** edit any file in the repository. No writes, no commits, no staging.
- **Do not** write the practical part (ch. 3), results (ch. 4) or conclusion
  (ch. 5). Those are a later pass. Ch. 1 must *set up* the practical part; it
  must not describe it in detail.
- Output one Markdown file per chapter, with `#`/`##`/`###` matching the
  headings required below.

## 2. This is a survey, and that is the method — not a retreat

The thesis evaluates **what the field currently applies**, and derives what can
be established objectively from that. The five principles are not presented as
rules the field obeys. They are the working methods, named by the field itself
and shown to work. The objectivity comes from the evidence, not from the
taxonomy.

This matters for how you write. A survey that only enumerates is a list. A survey
that weighs evidence, names disagreement, and says which claims are measured and
which are argued is a thesis. Hold the second standard.

**Cíl (goal), use this wording:**

> Rozhodující součástí agentického vývoje softwaru není schopnost jazykového
> modelu, ale návrh systému, v němž model pracuje. Cílem práce je tento názor
> vyargumentovat z dostupných zdrojů a prověřit na záměrně minimální
> implementaci, zda lze návrh systému oddělit od harnessu, který agenta
> pohání, aniž by tím řízenost narušila.

**Výzkumná otázka (research question), use this wording:**

> Které principy musí agentický systém splnit, aby vykonával inženýrskou práci?

Not an open question, and do not write it as one. `Musí splnit` commits the thesis
to necessity. A question shaped as "what makes such a system capable?" can be
answered by listing the field's vocabulary, which is a survey without an
argument. This one cannot: every principle named has to be argued, or the
answer is a list.

## 3. The finding

Three claims, in this order. Each is sourced; the sources are in §7.

**(a) The system layer is currently load-bearing.** Measured, not asserted:
across 5194 execution trajectories there is substantial variation in completion,
process quality, efficiency and failure behaviour across model–harness pairings,
and the conclusion is that agent capability should be reported at the
*model–harness configuration* level rather than attributed to the base model
alone. `@yao2026harnessbench`

**(b) What the harness does for performance can be learned by the model, and then
the scaffold can be taken away.** This is measured twice, independently.
Skills lifted a benchmark pass rate by 8.1 pp; after progressive distillation the
model still reached a 27.7 % pass rate **without any external scaffold**, a
retention rate of 85.2 %. `@ding2026scaffold` And the internalisation
*generalises across scaffolds*: a model fine-tuned on planning-aware trajectories
collected under a single scaffold gains consistently when deployed under
scaffolds it never trained on. `@thangarajah2026dcas`

**(c) The human gate is not an interim measure that better models will make
obsolete.** Performance is always gated by what the model is given, and no model
can be relied on to evaluate itself completely. The literature says this in the
vendor's own voice: a stronger model *„does not remove the need for explicit
mechanisms that govern what information is exposed, which actions are authorized,
and how failures are traced"* `@gu2026harness` The evaluator in Claude Code's own
goal loop *„does not call tools, so it can only judge what Claude has already
surfaced in the conversation"* `@claude-goal` and self-evaluation is known to fail
in a specific direction — agents *„respond by confidently praising the
work"* `@anthropic-harness-design`

**So the finding, stated once:** what the system layer contributes to
*performance* can be internalised into the model and the scaffold then removed;
what it contributes to *governance and verification* cannot. That asymmetry is
the thesis's own contribution, and it is what makes the human gate structural
rather than decorative.

**Where the boundary sits.** The value of the scaffold is conditional on how far
the task sits beyond what the model does unaided. HarnessX measures this
directly: +14.5 % average across five benchmarks, *„with gains largest where
baselines are lowest."* `@chen2026harnessx` Anthropic's own component ablation
reached the same conclusion independently. `@anthropic-harness-design`

## 4. Do NOT claim these

- **Not "the system beats the model."** The dichotomy is a category error; the
  answer is a relation. The field's own position paper is careful about this and
  you should be too: progress will depend *as much* on system design as on
  stronger models, not instead of them.
- **Not "we can make the agent do anything."** The literature raises this as an
  objection and answers it: a stronger model *reduces* the frequency of some
  failures, and *does not remove* the governance layer. Anything stronger is
  refuted in one sentence. What you may say: anything we can design a harness
  around can be performed by a model with well-placed human gates, and can then
  be learned on.
- **Not "the control structure is portable across harnesses."** Dropped. The
  practical part does **not** show this, and claiming it would be wrong twice
  over. What the practical part built is a harness *on top of* other harnesses,
  using them as inference engines — see §5.
- **Not absolute necessity.** Necessity is conditional on what the model
  achieves unaided. Absolute necessity is refutable by a better model.

## 5. The composition question — what the practical part is actually about

This is the thesis's own angle, and it is worth developing. Nobody has published
on it.

The pipeline described in chapter 3 wraps vendor harnesses inside its own
control layer — the runner, the gates and the stored state *are themselves a
harness*, and the vendor CLIs are used as inference engines underneath it. So the
model meets **two** sets of scaffold conventions at once.

That is precisely the situation `@thangarajah2026dcas` measures, and it found:
open trajectory datasets for fine-tuning are collected *"almost exclusively under
OpenHands"*; models fine-tuned on them score well under that scaffold and
*„degrade substantially when deployed under any non-training scaffold"*; and
critically, *„Untrained base models do not show this divergence"* — the gap is
induced by fine-tuning, not a property of the model. Planning separates into
*explicit* (a plan as a first-class artefact) and *implicit* (structural
conventions shaping execution through the loop), and a controlled intervention
found plan-quality gains *„exceeding the cross-scaffold drops we observe."*

So the open question the practice can speak to: **when a harness is composed on
top of another harness, whose conventions is the model actually following, and
what does the outer layer cost?** Chapter 1's Metodika should set this up as the
question chapter 3 answers. Do not answer it in chapter 2.

## 6. Chapter spine

Chapter 1 — **Úvod**
- Progression: editor completion → conversational chatbot → coding agent. One
  sentence on what changed: *who acts*. Do not open with adoption statistics.
- **Cíl, výzkumná otázka a vymezení**
- **Metodika** — see below. An epistemic section, not a description of the
  implementation.
- Terminology: minimal. Define only what the argument needs at the point of use.
  Do not build a glossary.
- Scope: one specific revision of one deliberately minimal pipeline. A later
  thesis covers the author's own harness.

### The Metodika subsection

Establishes that the thesis describes the field as it is, not the author's private
model. Three lines of evidence, all citation-based:

**1. The source rule.** A principle counts as belonging to the field only if it is
named in a **primary source from a laboratory or vendor that builds the product**.
Not a blog about it, not commentary, not a summary. State why: a secondary summary
can be too late (this work has already been burned by a 1970 text cited to
establish a 1968 origin) or unreadable (an article cited that nobody can open).

**2. Independent convergence.** The five principles count because independent labs
arrived at them separately, without citing each other. That is what separates a
working method from one vendor's product decision. Show it three ways:
- *Independent naming.* Anthropic on context, harness and the goal loop; OpenAI on
  prompt engineering and agent orchestration; Google's own CLI shipping skills,
  MCP, hooks and subagents.
- *Independent shipping in a short window.* Claude Code and Codex both ship
  `/goal`; both ship subagent and handoff primitives, neither citing the other's
  design. Anthropic credits the Ralph Wiggum method as community convergence.
- *Institutional standardisation.* `AGENTS.md` is stewarded by the Agentic AI
  Foundation under the Linux Foundation, with OpenAI Codex, Amp, Jules, Cursor and
  Factory participating. `@agents-md`

**3. What the practical part establishes, and what it does not.** Say it plainly
and early — it is the question you will otherwise be asked, and volunteering it
is stronger than conceding it. The practice instantiates the principles in one
deliberately minimal pipeline and instantiates a *composed* harness (§5). It is
**not** an ablation study and does not prove necessity. Also state the three
criteria used to judge whether the pipeline is *řízená*.

Do not describe the implementation here. The practical part does that, and the
guide requires the methodological part to be separate from the practical one.

Chapter 2 — **Teorie**
- **2.1 Softwareová továrna** — FIRST, as lineage. Ground the term: 1968, not a
  2026 marketing word. The conference report quotes Bemer's working paper on its
  own page 94; the coinage claim rests on his biography, not on the report. Then
  the part that carries the argument: the people who invented the term worried
  that automation would remove judgement. McIlroy: *„It would be immoral for
  programmers to automate everybody but themselves."* Bemer, nine years later:
  *„One does not build a successful factory with just tools and environment. The
  workers must be trained, and the assembly methodology … must be in place."*
- **2.2 Model a harness** — what the model supplies, what the harness supplies,
  why the boundary is a question of responsibility rather than implementation.
  Then context window, context rot, compaction. Note that compaction alone is not
  sufficient: Anthropic distinguishes compaction from a context reset and reports
  compaction alone did not suffice for long-task performance. Then the agentic loop.
- **2.3 Agentické inženýrství** — the five principles, each developed, none a bare
  list item: **Prompt, Context, Loop, Workflow/Graph, Harness.** Give each the
  evidence that it is load-bearing. Within it: goal loop, orchestration, human gate.
- **2.4 Co posunuli agenti** — the shift from automating predetermined steps to
  automating judgement, and what that does and does not remove.

**Taxonomy warning.** Two different lists are in play and you must not merge
them. Gu decomposes a harness into *components*: memory substrate, context
constructor, skill-routing layer, orchestration loop, verification-and-governance
layer. HarnessX defines the harness as *„the prompts, tools, memory, and control
flow"*. The field's five are *discipline names* — how practitioners name the work.
Different levels of description. Say so if you use more than one.

## 7. Source discipline

**Read the sources. Do not work from memory of them.**

- **Primary before secondary.** Cite the conference report, not a blog about it.
  Wiegold is *secondary* to Huntley and says so himself.
- **Every substantive claim needs a citation.** Use the existing `@key` names
  from `paper/components/bib/references.bib`. If you need a source not there, say
  so in your report — do not invent a key.
- **Never cite a source you have not read.** The bibliography already lost two
  entries this way: a paywalled article, and a 1970 text two years too late to
  establish a 1968 origin. Do not repeat it.
- **Say what kind of paper each source is.** `@gu2026harness` is a position paper
  with a reference implementation — citable for vocabulary and framing, **not**
  for measured claims. `@yao2026harnessbench`, `@ding2026scaffold`,
  `@chen2026harnessx` and `@thangarajah2026dcas` are measurement papers. A
  reviewer will ask; answer before being asked.
- **All five are 2026 arXiv preprints.** None of them is confirmed peer-reviewed.
  `@thangarajah2026dcas` has an ASE '26 footer in its PDF but the arXiv record
  lists no venue, so do **not** call it peer-reviewed. If a preprint is central to
  an argument, say that it is a preprint.
- **Numeric citation order** is by first appearance. `@key` handles that.

**Produce a quotation ledger** at the end: for every direct quotation, the exact
words, the `@key`, and where in the source it is. An unverifiable quotation is
worse than a paraphrase.

### Verified material — wording exact, read first-hand

**On the system layer being load-bearing.** `@yao2026harnessbench` defines the
harness as *„the system layer that manages context, tools, state, constraints,
permissions, tracing, and recovery"*, and concludes that *„agent capability
should be reported at the model-harness configuration level rather than
attributed to the base model alone."* It also names a recurring failure mode:
*„execution-alignment failures, where plausible reasoning becomes decoupled from
tool feedback, workspace state, evidence, or verifiable output contracts."* That
is a gift for chapter 2.2 — reasoning that looks fine and has drifted from
reality is precisely the failure a deterministic gate catches.

**On the taxonomy.** `@gu2026harness`: *„Together, these components form the
agent harness, which translates model capability into long-horizon agent
behavior."* Also: evaluation is *„largely model-centric, often reducing agents to
final-task success while treating memory, retrieval, tool use, orchestration,
verification, and governance as secondary implementation details"*. Note the
threshold condition: *„once models reach a sufficient capability threshold, many
additional gains in long-horizon agent performance increasingly depend on how the
system around the model is designed."*

**On the boundary, measured.** `@chen2026harnessx`: *„the runtime harness,
comprising the prompts, tools, memory, and control flow"*; *+14.5% average across
five benchmarks, „with gains largest where baselines are lowest"*; and the
diagnosis of the status quo — *„today's harnesses remain largely hand-crafted and
static … the rich traces produced during execution are rarely distilled back into
systematic improvement."*

**On internalisation, measured.** `@ding2026scaffold`: *„Post-training of large
language models optimizes only parameters, while inference-time procedural
scaffolds are typically designed independently of parameter training. This
disconnect makes it difficult to automatically acquire and internalize complex
strategies."* Result: skills +8.1 pp; *„after progressive distillation the model
still achieves a 27.7% passed rate without any external scaffold (distillation
retention rate 85.2%)."* The mechanism has a name: co-evolution *„through
discovery, distillation, and dynamic recompilation"*.

**On portability, and the counter-result.** `@thangarajah2026dcas`: fine-tuning
data is *„collected almost exclusively under OpenHands"*; models *„degrade
substantially when deployed under any non-training scaffold"*; and the decisive
control — *„Untrained base models do not show this divergence, indicating the gap
is fine-tuning-induced and tied to the conventions of the training scaffold."*
Planning splits into *„explicit planning, a pre-execution plan produced as a
first-class artifact"* and *„implicit planning, the structural conventions that
shape execution throughout the agent loop."* Their scaffold definition is usable:
*„the harness that turns a language model into an autonomous coding agent: it
manages the agent loop, exposes a set of tools to the model, structures multi-turn
conversations, and decides when the agent has finished."* Also a small
measurement worth quoting: *mini-swe-agent* reaches *„above 74% Pass@1 with a
strong frontier model despite its minimal harness, illustrating that as model
capability grows, scaffold complexity matters less."*

**On the human gate, from the vendors.** `@anthropic-harness-design`: *„When asked
to evaluate work they've produced, agents tend to respond by confidently praising
the work—even when, to a human observer, the quality is obviously mediocre."* And
the necessary-but-insufficient version: *„Separating the agent doing the work from
the agent judging it proves to be a strong lever … The separation doesn't
immediately eliminate that leniency on its own; the evaluator is still an LLM that
is inclined to be generous towards LLM-generated outputs."* And the boundary:
*„The practical implication is that the evaluator is not a fixed yes-or-no
decision. It is worth the cost when the task sits beyond what the current model
does reliably solo."* Honest cost, same source: solo 20 min / $9 versus full harness
6 hr / $200, *„over 20x more expensive, but the difference in output quality was
immediately apparent"*; the simplified harness 3 hr 50 / $124.70. First-party
admission: *„Out of the box, Claude is a poor QA agent. In early runs, I watched
it identify legitimate issues, then talk itself into deciding they weren't a big
deal and approve the work anyway."*

`@claude-goal`: *„`/goal` adds a separate evaluator that checks your condition
after every turn, so completion is decided by a fresh model rather than the one
doing the work."* Three verdicts — not yet met / met / **impossible** — so a model
can terminate a run negatively. A Stop hook *„can run a script for deterministic
checks or a prompt for model-evaluated ones"*: Anthropic making the
three-kinds-of-check distinction in one sentence.

`@openai-goals`: *„completion must be evidence-based"*; *„the evidence decides
whether it's done"*; *„Reaching a budget limit is not the same as completing the
objective."* And the human gate as architecture: *„Pausing, resuming, clearing,
and budget-limited transitions remain controlled by the user or the system."*
The six-part goal vocabulary — outcome, verification surface, constraints,
boundaries, iteration policy, blocked stop condition — is sharper than anything
the thesis currently has for planning.

`@openai-codex-2025`: *„It still remains essential for users to manually review
and validate all agent-generated code before integration and execution."* And the
one that cuts against everything: *„On coding evaluations and internal benchmarks,
codex-1 shows strong performance even without AGENTS.md files or custom
scaffolding."* Engage with it — it removes one artefact, not the control layer.
Note the page now carries a banner saying the post is outdated, which is worth
one clause.

**On context.** `@anthropic-context-engineering`: *„LLMs have an 'attention
budget' that they draw on when parsing large volumes of context. Every new token
introduced depletes this budget by some amount"*; *„good context engineering means
finding the smallest possible set of high-signal tokens that maximize the
likelihood of some desired outcome."* On tools: *„If a human engineer can't
definitively say which tool should be used in a given situation, an AI agent can't
be expected to do better."* For the mechanism — the U-shaped degradation, the
closed-book baseline, and that self-attention is *„technically equally capable of
retrieving any token from their contexts"* — use `@liu2024`.

**On the goal loop's origin.** Huntley's Ralph loop, July 2025, not ReAct.
`@huntley2025ralph` `@wiegold2026ralph` `@claude-goal` `@openai-goals`

## 8. Length — hard constraint

Minimum for the whole thesis is 18,000 characters. Current body is 33,285.
**Do not grow it.** Chapter 2 is currently 12,984 characters; yours must be at or
below that, and shorter is better.

Rule: **write only what is necessary, while capturing everything we want to say.**
One governing claim per subsection, stated once. Delete any sentence that only
restates the heading. No throat-clearing. If you think you need a sixth paragraph,
you probably need a better first one. Report character counts per chapter.

## 9. Known traps in the existing text — do not reproduce

- **The goal loop was cited to ReAct.** ReAct is about interleaving reasoning and
  acting; it says nothing about an outer loop with acceptance criteria.
  `yao2022` belongs in §2.2, not here.
- **The control structure was described as portable across harnesses.** It is not
  what was shown. See §5.
- **Vaswani 2017 contains no agent, harness, tool or orchestration content** — the
  words do not appear. Using it for an agent-systems claim is a category error.
  Same for the 2013 Mikolov word-embedding paper: off-topic, and it argues the
  other way.
- **`@gradually-ai-usage-2026` is an AI-marketing blog** whose adoption numbers
  are the author's own editorial range. Keep the figure if you like it; the
  numbers must never carry an argument and the text must say they are an estimate.
- **`@guild2026`, `@bcg2026`, `@factory2026` are vendor marketing.** Guild's
  percentages are self-measured. Definition and architecture only, never evidence
  of an industry trend.
- **The bibliography template silently drops `note` fields.** Provenance
  qualifications must live in the prose, or they will not print. This matters
  especially for the five preprints.
- Never write a claim no source supports. The old text asserted a factory
  "automates execution, not decision" — Cusumano never said that and he could not
  be read. It is now sourced from the conference debate.

## 10. Report back

- The two chapter files.
- Character count per chapter.
- The quotation ledger.
- Anything you could not source, stated plainly.
- Anything you think is wrong in §2, §3 or §5 of this brief. If the argument does
  not hold, say so — do not write around it.
