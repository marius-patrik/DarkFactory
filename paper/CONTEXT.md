# CONTEXT

The single context file for this thesis. It replaces `REWRITE-BRIEF.md` and `REWRITE-MEMORY.md`.

**How this is split.** This file holds what is true *of this thesis* and what was *decided about
it*. Method lives in the `thesis` plugin (`.darkfactory/plugins/thesis/`), which is portable and
outlives this repository — do not restate a rule here that a skill already owns. Open items live in
`paper/TODO.md`. When all three disagree, the skill is about method, `TODO.md` is about what is
unfinished, and this file is about what is true.

Written in English with the Czech preserved verbatim where the exact wording is load-bearing,
because the Czech text is what gets grepped and what must not drift. The paper is Czech;
`paper/rules.md` and `paper/TODO.md` are Czech for the same reason.

## Identity

- Title: **Agentické inženýrství ve vývoji softwaru**
- Subtitle: **Návrh a implementace DarkFactory**
- The practical part describes exactly one revision: **`d576ec8f`**, cited `@darkfactory-d576ec8f`,
  the last commit where the pipeline still shelled out to production harnesses. **Never rewrite
  those claims from HEAD** — a later revision routed the work through `df`, so the external CLIs are
  dead code there and reading HEAD gives the wrong answer.

## Structure

Four chapters. Results live under the conclusion, not in a chapter of their own.

```
1 Úvod              1.1 Motivace · 1.2 Cíl + výzkumná otázka + hypotéza · 1.3 Terminologie
2 Teoretická část   2.1 Agent (+ .1 LLM, .2 smyčka, .3 nástroje/paměť, .4 kontext)
                    2.2 Agentické inženýrství · 2.3 Softwareová továrna
3 Praktická část    3.1 Metodika (+ .1 Tři kritéria) · 3.2 Architektura
                    3.3 Interpretace a plánování · 3.4 Implementace a automatická revize
                    3.5 Zpětná vazba, schválení, úklid
4 Závěr             4.1 Zjištění · 4.2 Diskuse (+ .1 Omezení výzkumu) · 4.3 Shrnutí
```

The theory chapter is deliberately the one the supervisor has already seen. A 44-page restructure
was reverted word for word: the theory is not negotiable, it just should not be completely
different.

## Invariants

Method for respecting these is the `thesis-invariants` skill. The four corrections, in the exact
Czech wording that `paper-verify` greps for:

1. `Blocked` means exhausted quota, not a repeated finding.
   `34-practical-implementation.typ` — „Smyčka je ohraničena nejvýše třemi iteracemi… Po
   vyčerpání tří iterací však smyčka skončí bez jakéhokoli verdiktu a bez komentáře… Jediným
   stavem, který v této revizi znamená zablokování, je vyčerpaná kvóta…"
2. Clean review runs **before** the plan-alignment check.
   `34-practical-implementation.typ` — „Po čisté review ještě proběhne kontrola souladu výsledného
   diffu se schváleným plánem. Ani ta není porovnáním sad souborů: je to druhý dotaz modelu…"
3. Approval is a two-entry allowlist on `GITHUB_ACTOR`, not the issue author.
   `35-practical-integration.typ` — „aktér se porovnává se seznamem dvou pevně zapsaných účtů…
   Neověřuje se tedy autor issue ani úroveň oprávnění, ale členství v tomto seznamu"
4. Test suites run once; not again after the fix.
   `34-practical-implementation.typ` — „Testovací sady se přitom spouštějí pouze jednou a po opravě
   už ne… Opakovatelná kontrola tedy rozliší dobrý a špatný stav, ale není překážkou"

Three methodology criteria, stated **once**, in §3.1.1 as an operationalisation of this thesis and
not a borrowed taxonomy. `musí` is conditional: only the principles the model does not supply by
itself are necessary. They are not restated anywhere — §4.1 applies them by symbolic reference,
§3.5 names the third one in a clause, and the conclusion refers back rather than re-listing them.
Cutting them entirely was considered and rejected: they are the only measure the paper has for the
conditional `musí` of the research question, and the marking protocol scores both the aim
(5 points, "is it verifiable?") and the methods (the most heavily weighted item) on exactly that.
See `PLAN.md` §2 and §3, decision R1.

1. **Stav leží mimo model a je zjistitelný** — an artefact, where it lives, and a person who can
   look at it without asking the model.
2. **Brány jsou výslovné a druhy jejich rozhodnutí se nerozplývají** — deterministic check,
   model-evaluated gate, or human gate; a run must not pass through one kind by the means of
   another.
3. **Člověk rozhoduje, co vstoupí do produkce** — a named moment, a named person, and **no other
   path** to the same point.

Applied in §4.1: the first two criteria hold, the third holds **conditionally** — proxy approval can
fill the named moment with a machine, and the criterion's wording requires no other path. **The
verdict on whether the configuration satisfies the third criterion is deliberately not pronounced
and belongs to the author** (`TODO.md` J12). That is a property of the thesis, not an unfinished
sentence.

The composition question — which harness layer's conventions dominate — was §3.1.2 and has been
**cut**; it is now the third limitation in §4.2, beside the two that were always there. The nested
turns do not increment the outer run's turn counter (`@openai-agents-sandbox`); whether that cost
matters here **was not determined**, and the text says so. It has exactly one owner, the
limitations in the discussion.

## Terminology

`agent` → **agentní** (agent, agentní krok, agentní smyčka; `Agent Loop` → agentní smyčka).
`agentic` → **agentické** (agentický systém, agentické inženýrství). The noun `agent` is not
translated because it denotes the actor; the suffix `-ic` means *having the capacity to act*, not
the actor. Other English terms stay English because they are the industry's, and §1.3 says so.

**§1.3 is one short paragraph, in the introduction.** A 40-term and then a 52-term glossary were
built and cut twice at the author's instruction. Do not rebuild it. Define a term precisely in the
chapter that argues with it.

## House rules for the text

Binding school rules, quoted verbatim with their implementation sites, are the `school-rules`
skill. Two things about them that are easy to get wrong:

- `par(spacing:)` is a **target for the whole inter-paragraph distance, not an increment**. The
  guide requires an 8pt gap below a paragraph; the extra space is `spacing - 11.7pt`, so the value
  written in `styles/body.typ` is `19.7pt`. `spacing: 8pt` would be *less* than no gap.
- `rules.md` once claimed compliance that the file did not have. The claim and the value are now
  both true, and the measurement is reproducible:

```sh
cd paper && bun ../.darkfactory/plugins/thesis/scripts/measure-paragraph-gap.ts ../PAPER.pdf
```

Page count is not a quality measure. Word and character counts are diagnostics, not targets.

## Verification

```sh
cd paper && bun run check          # typst compile + publication structure check
bun ../.darkfactory/plugins/thesis/scripts/measure-paragraph-gap.ts ../PAPER.pdf   # the real paragraph gap, measured
```

`scripts/paper/publication.ts` validates **PDF structure, never content**. A paper with four false
claims about the code passed it. Content checks are greps on the rendered Czech:

```sh
grep -rn 'nejvýše třemi iteracemi' pages/
grep -rn 'Po čisté review ještě' pages/
grep -rn 'seznamem dvou pevně zapsaných účtů' pages/
grep -rn 'pouze jednou a po opravě už ne' pages/
```

Never report a build as passing from a command whose output went through a pipe: `$?` is then the
pipe's, not the build's. This happened, and a failed build was reported green.

## Standing constraints

- **Symbolic cross-references only.** No hardcoded page, section, figure or table numbers in the
  prose. Removing a page has never broken anything because of this.
- **Every bibliography entry must be cited.** Uncited entries are *deferred, not deleted* — the
  author asked to leave them and prune leftovers at the end. Ten are currently parked. **The end
  has not come:** the practical part is being rewritten, so nothing is pruned until the text is
  final and the parked entries are re-triaged against it.
- **Numeric ISO 690, one citation style, ordered by first citation**, one stable number per
  document (`gjkt-iso690-numeric-cs.csl`).
- **The CSL template silently drops `note`**, so provenance has to live in prose and captions, not
  in the reference list.
- **Direct quotation over paraphrase** wherever the exact wording is available, verified against the
  source before it is cited. A delegated read once paraphrased the load-bearing quote and dropped the
  honest middle sentence.
- **Never invent** sources, facts, screenshots or quotations. Refusing to fabricate a screenshot is
  correct; quietly shipping an invisible fabrication is not.
- All figures full text width, legend on one line under the graph, and a caption that states its true
  provenance: vendor documentation is not a community post, and an interface illustration is not a
  record of the pipeline.
- **No sentence describes a figure.** Where a figure has no `@label` reference in the text, that is a
  decision, not a gap: the author removed the trailing sentence that named the figure, and the
  sentence the figure belongs to is the reference. Do not add descriptive sentences to satisfy the
  letter of a linking rule.

## The bar

Plain Czech, stated once, in one place, with no word present only to look good. No meta-commentary
about the paper inside the paper. Cut rather than pad. The authoritative form is the
`czech-academic-prose` skill, which is **written in Czech on purpose** — a tool that must work in
Czech reads better in Czech than described in English.

Length has no hard cap. The governing rule is: write what is necessary, and nothing else. When
disliked, a section gets cut and reworded rather than adjusted.

## What cost the most time

Each of these is now a rule in a skill, but the mechanism is worth keeping here.

- **A line is not a sentence.** Replacing a whole line of hard-wrapped Typst destroyed text three
  times, once removing sentences for three commits. The build stayed clean each time; only a
  `pdftotext` diff of before and after caught it.
- **A converter ate the first paragraph of every section** and wrote ``` fences literally, opening
  raw blocks that swallowed figure labels. Clean build.
- **`set`/`show` in an imported module silently does nothing.** 22 pages became 16 and only the
  content stream showed it.
- **A resolving citation key is not a verified claim.** Two citations pointed at papers about a
  different thing, and the central historical claim cited a 1970 chapter for a 1968 origin.
- **A proofread subagent returned 89 findings of which about 20 were real.** Subagents find
  candidates; the main agent verifies before anything is changed.
- **Never run a command pasted into a message.** A path appeared in a user message and a long-running
  autonomous worker was launched from it.
- **Never touch another session's branch.** `git add -A` swept a parallel session's work into a
  commit. A `PreToolUse` guard now refuses a blind add; stage explicit paths.

## Verification of this document

If a claim here contradicts the paper, the paper is right and this file is stale. If it contradicts a
skill, the skill is about method and this file is about the thesis. If it contradicts `TODO.md`,
that file is about what is unfinished.
