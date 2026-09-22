# DarkFactory-Paper — Completion Plan

This file contains only the **current active thesis execution path**. Deferred closure and publication work lives in `BACKLOG.md`.

- Thesis source: `paper/PAPER.typ`
- Durable manuscript rules: `AGENTS.md`
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

Do not recreate a schema/manifest/concept-file manuscript architecture or another authored thesis `.typ`.

Generated PDF/HTML/Markdown/review/site artifacts are outputs, not sources.

## Work title

**AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory**

## Thesis argument

The manuscript follows one causal argument:

**rapid AI adoption → coding agents remain a small subset of overall use → practices such as Vibe Coding show that access to capable AI is not equivalent to disciplined engineering → model capability is improving rapidly → a harness turns model inference into an agentic runtime → Agentic Engineering is required to use those capabilities deliberately and reliably → DarkFactory realizes those practices → evaluation tests the resulting system and workflow.**

Do not claim that most coding-agent users are vibe coding unless representative evidence supports that exact population-level claim.

## Canonical hierarchy

1. **Úvod**
   - 1.1 Motivace a vymezení problému
   - 1.2 Východisko a argument práce
   - 1.3 Cíle
     - 1.3.1 Hlavní cíl
     - 1.3.2 Dílčí cíle
   - 1.4 Výzkumné otázky
   - 1.5 Metodika
   - 1.6 Struktura práce
2. **Teoretická část**
   - 2.1 Jazykový model
     - 2.1.1 Architektura a reprezentace
     - 2.1.2 Inference
   - 2.2 Harness
     - 2.2.1 Smyčka a stav
     - 2.2.2 Prostředí a nástroje
     - 2.2.3 Rozšíření
3. **Praktická část**
   - 3.1 Agentické inženýrství
     - 3.1.1 Zadání a způsob práce
     - 3.1.2 Řízení změny
     - 3.1.3 Kvalita a ověřování
     - 3.1.4 Instrukce a kontext
     - 3.1.5 Řízení agentního chování
     - 3.1.6 Orchestrace agentů
   - 3.2 DarkFactory
4. **Výsledky a diskuse**
   - 4.1 Ověření mechanismů
   - 4.2 Ověření systému
   - 4.3 Ověření na repozitářích
   - 4.4 Výzkumné otázky
   - 4.5 Diskuse a omezení
5. **Závěr**

Use only real document headings. The authored manuscript must not use per-term semantic headings or glossary-style concept sections.

## Prose contract

The thesis must read as one continuous academic argument, not as a catalogue of definitions.

Rules:
- headings are reserved for actual chapters and subchapters;
- introduce necessary terminology inline in ordinary prose;
- define a term once, only where the argument needs it, then continue using it normally;
- integrate examples and consequences into paragraphs rather than boxed definition/example/“Praktický význam” units;
- every paragraph must advance the argument, explain a necessary mechanism, present evidence, or connect sections;
- remove material that exists only to make the terminology system exhaustive;
- preserve claim-local citations, but do not let citation structure dictate prose structure;
- use explicit transitions between model → Harness → Agentic Engineering → DarkFactory → evaluation;
- prefer fewer, stronger figures and examples over comprehensive illustration of every term.

## Evidence ownership

**Introduction**
- Gradually adoption/coding-agent evidence
- Vibe Coding motivation/baseline
- Epoch ECI capability trend
- Artificial Analysis v4.3.2 benchmark

**Theory**
- model/representation/inference
- harness mechanisms

**Practical**
- Agentic Engineering practices
- DarkFactory implementation

**Results and discussion**
- observed evidence
- interpretation
- limitations
- research-question answers

## Content invariants

The existing factual/source work in 2.1, 2.2, and 3.1 is evidence to preserve, not a prose structure to preserve.

During the coherence rewrite:
- retain correct sourced claims that materially support the thesis;
- freely merge, shorten, move, or delete glossary-like passages;
- preserve the ReAct mechanism where useful, but integrate it into normal Harness prose;
- preserve the distinction between Session, Transcript, and State without requiring separate term headings;
- preserve the distinction between AGENTS.md and CLAUDE.md where it remains relevant;
- preserve the distinction between Workflow Graph and DAG, and the cautious treatment of Swarm, if those details survive the relevance cut;
- do not invent new empirical claims;
- remove examples, figures, terminology, and implementation detail that do not materially support the paper's argument.

DarkFactory integration remains intentionally backlogged. Do not fill §3.2 with unsupported or aspirational prose.

## School contract

Use `SCHOOL_RULES.md` for any school-sensitive decision.

Do not substitute IVT maturita-topic requirements for Odborná-práce rules.

Use the recovered school contract as the current formatting floor. During the active rewrite, verify only the guide details needed to avoid formatting the manuscript incorrectly; exhaustive publication QA remains deferred in `BACKLOG.md`.

## Remaining execution

### Phase 1 — Whole-paper coherence and formatting rewrite — NEXT

Perform one aggressive, bounded pass over the existing manuscript so it reads as a conventional academic paper rather than a concept catalogue.

This phase supersedes the earlier standalone encyclopedia-removal phase and absorbs that cleanup.

#### Structure

Keep only meaningful chapter/subchapter headings.

Target maximum heading depth: **level 3**.

Required top-level flow:
1. Úvod
2. Teoretická část
3. Praktická část
4. Výsledky a diskuse
5. Závěr

Within Theory, retain only the chapter structure needed to explain:
- jazykový model / reprezentace / inference;
- Harness / smyčka a stav / prostředí a nástroje / rozšíření.

Within Practical, restructure Agentické inženýrství into a small number of coherent process sections. The current six sections may be merged where that improves flow. Prefer approximately:
- zadání a plánování;
- řízení změny a ověřování;
- instrukce, kontext a řízení chování;
- orchestrace a škálování.

Do not create headings for individual terms.

DarkFactory §3.2 remains backlogged and must not be invented in this phase.

#### Prose rewrite

Rewrite the manuscript so each real section consists of normal connected paragraphs.

Remove:
- all per-term level-4 headings;
- standalone definition blocks;
- square/bracket-style definition wrappers;
- every explicit **Praktický význam** block/label;
- glossary-style example boxes;
- repetitive “term A means…, term B means…” sequencing;
- encyclopedia/term index and its plumbing;
- redundant transitions and repeated definitions;
- nonessential terminology and examples.

Integrate useful definition, example, mechanism, and consequence material directly into the surrounding prose.

The desired paragraph logic is:
**claim/context → explanation/mechanism → evidence/example where useful → consequence/transition**.

Apply the same prose style to Introduction, Theory, Practical, Results, and Conclusion so the work has one voice.

#### Relevance cut

Every paragraph, term, citation, figure, and table must justify its place by supporting the thesis argument or evaluation.

Aggressively remove decorative or tangential material.

In particular, review whether the following are necessary:
- the Vibe Coding tweet image;
- duplicate embedding illustrations;
- the large benchmark snapshot table;
- product-specific examples whose only purpose is to define a term;
- exhaustive extension/tool catalogues.

Prefer a small set of high-value visuals. Keep a figure only when it materially explains or supports an argument better than concise prose.

#### Keywords and front matter

Replace the current glossary-like keyword dump with a short thesis-level keyword set, approximately 5–8 items.

Keywords should describe the work, not enumerate terminology.

Keep annotation/abstract concise and aligned with what the paper actually contains.

#### Typst simplification

Delete semantic/content abstraction machinery that no longer serves the final paper.

Remove where no longer required:
- the semantic term registry;
- `term()` / `kw` / term marker stars and term-link machinery;
- concept-only labels and encyclopedia backreferences;
- review/diff/callout abstractions;
- definition/example block abstractions;
- custom text-tree/word-stat machinery unless a verified school requirement truly needs it;
- citation alias maps when direct bibliography labels can be used cleanly;
- figure/content macros that merely hide one-off content.

Keep only small formatting helpers that genuinely reduce simple presentation duplication. Do not maintain a content model inside Typst.

#### Typography

Rebuild the manuscript styling as simple academic typography:
- A4 and school-compliant margins;
- 12 pt readable serif body text;
- justified paragraphs;
- school-required line spacing / paragraph spacing;
- normal breakable paragraphs;
- no `#show par` rule that makes every paragraph unbreakable;
- left-aligned headings with no decorative indentation;
- level 1 / 2 / 3 only, with clear size hierarchy;
- simple figure/table captions;
- restrained print-friendly links and code;
- no decorative callout boxes in the final manuscript.

Use direct-text school-guide evidence where necessary to choose between competing formatting rules, but do not turn this phase into the full final publication audit.

#### Results and conclusion

Do not refresh the DarkFactory evidence snapshot in this phase.

However, rewrite the existing Results and Conclusion stylistically so they match the rest of the paper:
- ordinary paragraphs rather than introductory definition blocks;
- less repetition;
- clear separation of result, interpretation, and limitation;
- direct RQ answers;
- no glossary tone.

Preserve the current evidentiary limits until the backlogged DarkFactory evidence phase replaces or updates them.

#### Exit

The phase is complete when:
- there are no per-term headings;
- there are no `Praktický význam` blocks;
- there is no standalone encyclopedia/term index;
- terminology is introduced inline;
- the paper reads continuously within and between sections;
- unnecessary material has been removed rather than reformatted;
- the Typst source is substantially simpler and contains no semantic glossary/review abstraction layer;
- heading depth is at most 3;
- front-matter keywords are concise;
- formatting is conventional, clean, and print-oriented;
- existing factual claims retained by the rewrite still have appropriate citations;
- all canonical builds pass;
- the PDF is visually inspected end-to-end for flow, spacing, headings, figures, page breaks, and back matter.

### Phase 2 — Direct Odborná-práce guide reconciliation

After the manuscript is structurally clean, perform the remaining direct-text audit of the school guide and correct only requirements that are still unresolved.

Resolve:
- declaration wording;
- annotation/English-annotation requirements;
- bibliography heading;
- submission artifacts;
- page/word limits if any;
- similarity/plagiarism rules if any;
- remaining title-page, pagination, figure/table, appendix, and typography requirements.

Reconcile `SCHOOL_RULES.md` and make the corresponding final formatting corrections.

## Current-plan exit

The active plan ends after Phase 2.

At that checkpoint:
- the existing manuscript reads as one coherent academic work rather than a concept catalogue;
- the source is simplified to ordinary manuscript content plus clean presentation code;
- the encyclopedia and per-term heading system are gone;
- school-sensitive formatting has been directly reconciled;
- DarkFactory §3.2 and its implementation-evidence refresh remain intentionally backlogged;
- the dependent final Results/evidence refresh remains backlogged with DarkFactory;
- final post-DarkFactory closure/publication QA remains deferred in `BACKLOG.md`.

