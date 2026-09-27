# Brief: clean rewrite of the thesis (chapter 1 + chapter 2)

You are writing a **new** Czech academic text. You are not editing, patching or
"improving" an existing text. Read `/Users/user/Projects/DarkFactory/PAPER.pdf`
**only** for scope, register and intent — for what the thesis is trying to
establish. Reproducing its sentences is a failure, not fidelity. Where the
existing text is wrong (see §8), do not preserve it.

**Output language: Czech.** Academic register, third person, past or present
tense as the sentence requires. No contractions, no rhetorical questions, no
"v této práci se budeme zamýšlet".

## 1. What you produce

Text only, for chapters 1 and 2 (theory). Nothing else.

- **Do not** edit any file in the repository. No writes, no commits, no staging.
- **Do not** write the practical part (ch. 3), results (ch. 4) or conclusion (ch. 5).
  Those are a later pass. Ch. 1 must *set up* the practical part; it must not
  describe it in detail.
- Output one Markdown file per chapter, in order, with `#`/`##`/`###` matching
  the heading levels required below.

## 2. The argument you are writing towards

This is fixed. Do not renegotiate it; if something does not fit, flag it in your
report instead of bending the argument.

**Thesis claim.** The load-bearing part of agentic software development is not
the language model's capability but the design of the system the model runs
inside. The system converts capability into reliable work — and cannot
manufacture capability.

**Cíl (goal), use this wording:**

> Rozhodující součástí agentického vývoje softwaru není schopnost jazykového
> modelu, ale návrh systému, v němž model pracuje. Cílem práce je tento názor
> vyargumentovat z dostupných zdrojů a prověřit na záměrně minimální
> implementaci, zda lze návrh systému oddělit od harnessu, který agenta
> pohání, aniž by tím řízenost narušila.

**Výzkumná otázka (research question), use this wording:**

> Lze získat **řízenou** autonomii ve vývoji softwaru kombinací cizích harnessů
> tak, že struktura, která práci řídí, se při jejich výměně nemění — a **co
> tímto oddělením získáme a co ztratíme**?

**Define "řízená" with three testable criteria** and say so explicitly, because
the term is worthless without them:

1. **Stav je mimo model a dohledatelný** — the run's state lives in the repository
   and can be inspected without asking the model.
2. **Brány jsou explicitní** — every transition has a named, reproducible check.
   Keep three kinds of check **apart** and never blend them: a deterministic
   check (CI, exit code), a model call (a review or plan that another model
   makes), and a human decision (what enters production).
3. **Člověk rozhoduje, co vstoupí do produkce** — merging is not the pipeline's call.

**Hypotéza (hypothesis), use this wording:**

> Praktická autonomie je dosažitelná i bez vlastního harnessu, protože je
> vlastností návrhu systému — trvalého stavu mimo model, explicitních bran a
> oddělené kontroly výstupu. Její hranicí je však rozhodování, které autor
> nevlastní: strukturu si navrhuje sám, ale úsudek o tom, co je hotovo a co dál,
> přebírá od cizí smyčky. Právě to je jediná věc, kterou vlastní harness odstraní.

## 3. The answer you must not overclaim

**The answer is division of labour with a coupling — not "the system beats the
model".** Three things are true at once, and the chapter must hold all three:

1. Model capability sets the ceiling, and decides whether a scaffold is usable
   at all. A weak model given a sophisticated scaffold still fails.
2. System design determines how much of that ceiling is reached — **and can
   degrade it**. Good scaffolding can make a model measurably worse.
3. The system cannot close the gap on its own. Pure system-side fixes have been
   measured and have done nothing.

There is a fourth actor, the human, and it is not decoration: specifying intent
and judging output is a distinct kind of work from executing the loop.

**Where the boundary sits.** The value of the scaffold is *conditional on the
task sitting beyond what the model does reliably on its own*. As models improve,
that boundary moves outward and parts of the harness stop earning their cost.
Write this as a finding, not as a slogan — see §7 for the vendor statements that
support it, including ones that cut against the thesis.

## 4. Chapter spine

Chapter 1 — **Úvod**
- Progression: editor completion → conversational chatbot → coding agent. One
  sentence on what changed: *who acts*. Do not open with adoption statistics.
- **Cíl, výzkumná otázka a vymezení** (one subsection, as §2 above)
- Terminology: keep it minimal. Define only what the argument needs at the point
  of use. Do not build a glossary.
- Scope: this thesis describes one specific revision of one deliberately minimal
  pipeline in which the agent loop is executed by a foreign tool. A later thesis
  covers the author's own harness.

Chapter 2 — **Teorie**
- **2.1 Softwareová továrna** — FIRST, as lineage. Ground the term: 1968, not a
  2026 marketing word. The conference report quotes Bemer's working paper on
  its own page 94; the coinage claim rests on his biography, not on the report.
  Then the part that carries the argument: the people who invented the term
  worried that automation would remove judgement. McIlroy: *„It would be
  immoral for programmers to automate everybody but themselves."* Bemer himself,
  nine years later: *„One does not build a successful factory with just tools
  and environment. The workers must be trained, and the assembly methodology …
  must be in place."*
- **2.2 Model a harness** — what the model supplies, what the harness supplies,
  and why the boundary is a question of responsibility rather than of
  implementation. Then context window, context rot, compaction. Note that
  compaction alone is not sufficient: Anthropic distinguishes compaction
  (summarise in place, continuity preserved) from a context reset (clean slate,
  requires a handoff artefact), and reports that compaction alone did not
  suffice for long-task performance. Then the agentic loop.
- **2.3 Agentické inženýrství** — the five areas, each developed, none a bare
  list item: **Prompt, Context, Loop, Workflow/Graph, Harness engineering.**
  This is the chapter the thesis is actually about; give it the most space.
  Within it: goal loop, orchestration, and the human gate.
- **2.4 Co posunuli agenti** — the shift from automating predetermined steps to
  automating judgement, and what that does and does not remove.

## 5. Length — this is a hard constraint

Minimum for the whole thesis is 18,000 characters. Current total body is 33,285.
**Do not grow it.** The existing chapter 2 is 12,984 characters; yours must be
at or below that, and shorter is better.

Rule: **write only what is necessary, while capturing everything we want to
say.** Concretely — one governing claim per subsection, stated once; delete any
sentence that only restates the heading; no throat-clearing; no paragraph that
exists to reach the next one. If you feel you need a sixth paragraph, you
probably need a better first one.

Report the character count per chapter when you finish.

## 6. Style

Model it on how the field writes when it writes well — Geoffrey Huntley's Ralph
post, Thomas Wiegold's explainer, the Claude Code and Codex documentation. Take
the **techniques**, never the sentences.

- Open a subsection with the concrete artefact or the claim, never with a
  restatement of the heading.
- One governing claim per subsection, early, as a single declarative sentence.
- Prefer the source's actual wording over your paraphrase of it. Direct quotation
  is the goal, not the exception.
- Name the failure mode in the same subsection that makes the claim, not only in
  a limitations section.
- Concede the counter-evidence in the same breath as the claim.
- Attribute every number to whoever measured it, and say when it is a
  self-report. Never write a vendor's benchmark as a fact.
- Tables for choices; prose for arguments.
- Short declaratives. First person only where a judgement is genuinely being made.

## 7. Source discipline

**Read the sources. Do not work from memory of them.**

- **Primary before secondary.** If a primary source exists, cite it. Bemer:
  cite the conference report, not a blog about it. Wiegold is *secondary* to
  Huntley and says so himself.
- **Every substantive claim needs a citation.** Use the existing `@key` names
  from `paper/components/bib/references.bib`. If you need a source that is not
  there, say so in your report — do not invent a key.
- **Never cite a source you have not read.** The bibliography already lost two
  entries this way: an article behind a paywall, and a 1970 text that was two
  years too late to establish a 1968 origin. That error is already made once.
  Do not repeat it.
- **Numeric citation order** is by first appearance in the text (ISO 690
  numeric, style confirmed with the supervisor). `@key` handles that for you.

**Produce a quotation ledger** at the end of your output. For every direct
quotation: the exact words as they appear in the source, the `@key`, and where
in the source it is (section, page). This is how your work will be checked, and
an unverifiable quotation is worse than a paraphrase.

### Verified material you may use

These I have read in full. Wording is exact; you may quote them directly.

**The disconfirming one — you must engage with this, not route around it.**
OpenAI, on codex-1: *„On coding evaluations and internal benchmarks, codex-1
shows strong performance even without AGENTS.md files or custom scaffolding."*
The sentence before it: *„Like human developers, Codex agents perform best when
provided with configured dev environments, reliable testing setups, and clear
documentation."* `@openai-codex-2025` — note this launch post now carries a
banner saying it is outdated, which is itself worth one clause.

**The vendor confirming the thesis's own design.** Anthropic: *„When asked to
evaluate work they've produced, agents tend to respond by confidently praising
the work—even when, to a human observer, the quality is obviously mediocre."*
And: *„Separating the agent doing the work from the agent judging it proves to
be a strong lever to address this issue. The separation doesn't immediately
eliminate that leniency on its own; the evaluator is still an LLM that is
inclined to be generous towards LLM-generated outputs. But tuning a standalone
evaluator to be skeptical turns out to be far more tractable than making a
generator critical of its own work."* `@anthropic-harness-design`

**The boundary — the most important passage in the whole file.** Same source:
*„every component in a harness encodes an assumption about what the model can't
do on its own, and those assumptions are worth stress testing, both because they
may be incorrect, and because they can quickly go stale as models improve."*
And: *„The practical implication is that the evaluator is not a fixed yes-or-no
decision. It is worth the cost when the task sits beyond what the current model
does reliably solo."* — followed by the observation that on a newer model the
evaluator *„became unnecessary overhead"*, and the conclusion that *„the space of
interesting harness combinations doesn't shrink as models improve. Instead, it
moves."*

**Honest cost.** Same source: solo run 20 min / \$9 versus full harness 6 hr /
\$200 — *„over 20x more expensive, but the difference in output quality was
immediately apparent"*; the simplified harness 3 hr 50 min / \$124.70. Also
first-party: *„Out of the box, Claude is a poor QA agent. In early runs, I
watched it identify legitimate issues, then talk itself into deciding they
weren't a big deal and approve the work anyway."*

**Negotiated acceptance.** Same source: before each sprint the generator and
evaluator *„negotiated a sprint contract: agreeing on what 'done' looked like
for that chunk of work before any code was written"* — and the two iterated
until they agreed. That is a plan file with a human in the loop, in 1968's
vocabulary.

**The goal loop, and that it is now a shipped feature.** Claude Code: *„`/goal`
adds a separate evaluator that checks your condition after every turn, so
completion is decided by a fresh model rather than the one doing the work."*
Codex: *„completion must be evidence-based"* and *„the evidence decides whether
it's done."* `@claude-goal` `@openai-goals` The pattern's origin is Huntley's
Ralph loop, July 2025, not ReAct. `@huntley2025ralph`

**The strongest limitation available, and it is the vendor's own.** Claude Code
docs: the evaluator *„does not call tools, so it can only judge what Claude has
already surfaced in the conversation."* So a goal loop is **not** a substitute
for a deterministic gate — it grades what the worker chose to show it. Use this.
Also from the same page: the Stop hook *„can run a script for deterministic
checks or a prompt for model-evaluated ones"* — Anthropic making your
three-kinds-of-check distinction in one sentence. And three verdicts — not yet
met / met / **impossible** — meaning a model can terminate a run negatively.

**The human gate as architecture.** Codex: *„Pausing, resuming, clearing, and
budget-limited transitions remain controlled by the user or the system."* And:
*„Reaching a budget limit is not the same as completing the objective."*
OpenAI, on the launch post: *„It still remains essential for users to manually
review and validate all agent-generated code before integration and
execution."*

**Context.** Anthropic: *„LLMs have an 'attention budget' that they draw on when
parsing large volumes of context. Every new token introduced depletes this
budget by some amount"*; *„good context engineering means finding the smallest
possible set of high-signal tokens that maximize the likelihood of some desired
outcome."* On tools: *„If a human engineer can't definitively say which tool
should be used in a given situation, an AI agent can't be expected to do
better."* `@anthropic-context-engineering` For the mechanism — the U-shaped
degradation, the closed-book baseline, and that self-attention is *„technically
equally capable of retrieving any token from their contexts"* — use `@liu2024`.

**The vocabulary for a plan, if you need it sharper than the thesis currently
has.** Codex goals specify six things: outcome, verification surface,
constraints, boundaries, iteration policy, blocked stop condition.
`@openai-goals`

## 8. Known traps in the existing text — do not reproduce

- The **goal loop was cited to ReAct**. ReAct is about interleaving reasoning
  and acting; it says nothing about an outer loop with acceptance criteria.
  `yao2022` belongs in §2.2 on the agentic loop, not here.
- **Vaswani 2017 contains no agent, harness, tool or orchestration content.** The
  words do not appear. Using it for an agent-systems claim is a category error.
  Same for the 2013 Mikolov word-embedding paper: it is off-topic, and it
  actually argues the other way.
- `@gradually-ai-usage-2026` is an AI-marketing blog. Its adoption numbers are
  the author's own editorial range and the source itself says so. You may keep
  the figure, but the numbers must never carry an argument, and the text must
  say they are an estimate.
- `@guild2026`, `@bcg2026`, `@factory2026` are vendor marketing. Guild's
  percentages are self-measured. Use them for definition and architecture, never
  as evidence of an industry trend.
- **The bibliography template silently drops `note` fields.** Provenance
  qualifications must live in the prose, not in a bib note, or they will not
  print.
- Never write a claim that no source in the bibliography supports. The old text
  asserted that a factory "automates execution, not decision" — Cusumano never
  said that, and he could not be read. It is now sourced from the conference
  debate instead.

## 9. Report back

- The two chapter files.
- Character count per chapter.
- The quotation ledger.
- Anything you could not source, stated plainly.
- Anything you think is wrong in §2 or §3 of this brief. If the argument does not
  hold, say so — do not write around it.
