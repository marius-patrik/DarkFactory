# STATE — DarkFactory thesis

Written 2026-09-30. Describes the paper as it stands at `f6f1e0b9`. Anything not listed
under **Open** is either done or was checked and rejected. Superseded reasoning is gone
rather than kept for history; the commits hold that.

## Identity

- Thesis: *Agentické inženýrství ve vývoji softwaru — Návrh a implementace DarkFactory*
- Author Patrik Marius, supervisor Michal Dočekal, Gymnázium J. K. Tyla, 2026
- Artefact under study: `DarkFactory`, pinned at revision `d576ec8f`
- Build: `cd paper && bun scripts/paper/publication.ts` → repo-root `PAPER.pdf`
- **33 pages.** 13 figures, 1 table, 31 bibliography entries, all cited.
- The list of figures and tables is on p32–33 and lists all 13 plus the one table.

## Structure as built

```
1 Úvod
  1.1 Motivace: Vývoj a adopce generativní AI
  1.2 Cíl, výzkumná otázka, hypotéza a vymezení
  1.3 Terminologie
2 Teoretická část
  2.1 Agent: Co to je a jak funguje
      2.1.1 Jazykový model (LLM)   2.1.2 Smyčka (Loop)
      2.1.3 Nástroje (Tools)      2.1.4 Kontext (Context)
  2.2 Agentické inženýrství
      Specifikace (Specification)  Orchestrace (Orchestration)
  2.3 Softwareová továrna
3 Praktická část
  3.1 Metodika
  3.2 Architektura produkčního běhu
  3.3 Interpretace a plánování požadavku
  3.4 Implementace a automatická revize
  3.5 Zpětná vazba, schválení a úklid
4 Závěr
  4.1 Zjištění a diskuse      356 words, argument only
  4.2 Shrnutí                111 words
```

**4.1 no longer narrates the run.** It used to spend nine paragraphs describing what the
pipeline does before arguing. Those were chapter 3 restatements and are deleted (`819b4ba5`).
It now opens on the research question and carries: two conditions, how the configuration
meets them, the plan-boundary finding, the verdict, the counter-argument.

**Chapter 3 states mechanisms; chapter 4 judges them.** One judgement had leaked back into
3.4 and was moved to 4.1 (`f6f1e0b9`).

## Research question and hypothesis

- Question: *Za jakých podmínek agentický systém spolehlivě vykonává inženýrskou práci?*
- Hypothesis: *Praktická autonomie agentického systému není dána pouze schopnostmi modelu,
  ale především návrhem systému, který řídí stav, nástroje, rozhodovací brány a integraci
  výsledku.*
- Verdict, in 4.1: *… je pro zkoumaný artefakt podpořena, nikoli univerzálně dokázána.*

The hypothesis previously read „… a nikoli vlastností modelu, který v něm pracuje", which
denied outright that model capability matters. Replaced (`7e9d1aeb`).

**The scoped verdict is load-bearing.** There are deliberately no *Limity* or *Omezení
výzkumu* subsections, by the author's instruction. That one sentence carries all the
scoping the paper has.

## Figures

| Figure | File | Note |
| --- | --- | --- |
| Od jazykového modelu k agentickému systému | `harness-layers.svg` | §2.1. New. Visualises the central claim |
| Vzor ReAct | `react-loop.svg` | §2.1.2. Rebuilt as a four-box attributed cycle |
| Architektura pipeline | `darkfactory-architecture.svg` | §3.2 |
| Průchod požadavku | `darkfactory-pipeline.svg` | §3.2. Third phase + durable state |

All three figures from the GPT rewrite in `~/Downloads/` have been taken. Style stays ours:
Caladea, `1a1a1a` strokes, `f2f2f2`/`#e0e0e0` fills.

`react-loop.svg` uses `#e0e0e0`, not `#f2f2f2`. At the old value the harness steps were
invisible on a white page, so the figure asserted a model/harness split it never drew.

## Decisions taken

- **No evaluation criteria.** Removed from the whole paper. `rules.md` and `guide.md` require
  none; the word *kritérium* in `guide.md` refers to the grading protocol.
- **No *Limity* / *Omezení výzkumu* subsections.**
- **No iteration cap on the review loop.** The rewrite states „max. 3 iterace"; not adopted,
  unverified against `d576ec8f`.
- **One approval account**, the repository owner. The bot only relays.
- Practical claims describe `d576ec8f` only, never current HEAD.
- Each manuscript edit is shown and confirmed before it is applied.

## Verification

```sh
cd paper && bun scripts/paper/publication.ts        # structure only, never content
pdftotext ../PAPER.pdf - | less                      # what actually printed
```

`publication.ts` validates PDF structure, not claims. Never report a build as passing from
a command whose output went through a pipe — `$?` is then the pipe's.

**Six figures carry no in-text reference** (the theory figures). This predates the current
work and is a deliberate tension against `rules.md` R1, which is scored under *odkazování*.
Unresolved; the author has not chosen a direction.


## Working framing draft — NOT YET APPLIED TO MANUSCRIPT

This section records the wording currently being worked on in conversation. It is not a
final manuscript instruction. Do not copy it into the paper without explicit confirmation.

### Motivation

The motivation is the gap between broad adoption of generative AI and the much narrower
use of coding agents, together with the rapid increase in what these systems can do.

The current figure/source in the paper uses:
- free AI chatbots: ~28% of world population;
- regular AI coding-agent users: editorial estimate ~0.36% of world population.

The 0.36% value is an estimate, not a census. Do **not** replace it with 0.08%: that number
belongs to a different metric (Copilot Coding Agent's share among a tracked set of GitHub
agent commits), not global population adoption.

Intended framing:

> Generative AI has spread rapidly while its capabilities have expanded from text
> completion and chat toward agents that can act in development environments. General
> chatbot use is already broad, while regular coding-agent use remains much narrower.
> The motivation of the paper is therefore to show what these more capable tools can
> achieve when they are placed inside a deliberately engineered process rather than used
> as isolated model calls.

The last paragraph of §1.1 should eventually express that idea without turning the
motivation into a market-adoption study.

### Goal — current preferred wording

> Cílem práce je popsat a systematizovat principy současného agentického inženýrství ve
> vývoji softwaru a na systému DarkFactory ukázat, co jejich propojení umožňuje v praxi.

This should replace the currently applied first sentence of §1.2 if approved. The research
question can remain:

> Jaké architektonické a procesní principy se opakují v současném agentickém vývoji
> softwaru a jak jsou realizovány v systému DarkFactory?

### Annotation — working draft

> Práce se zabývá současným agentickým inženýrstvím ve vývoji softwaru a zkoumá, jaké
> principy se opakují v dnešních agentických systémech. Teoretická část vysvětluje vztah
> mezi jazykovým modelem, agentem a harness vrstvou a shrnuje práci s kontextem,
> nástroji, trvalým stavem, orchestrací, ověřováním a lidskými rozhodovacími body.
>
> Praktická část má podobu případové studie systému DarkFactory, agentické softwarové
> továrny nativně postavené na GitHubu. DarkFactory řídí práci coding agentů od přijetí
> požadavku přes jeho interpretaci, plánování a implementaci až po revizi a lidské
> schválení výsledku. Případová studie nesleduje obecnou úspěšnost modelů, ale způsob,
> jakým jsou tyto principy spojeny v jednom konkrétním systému.
>
> Studie ukazuje, že jazykový model je pouze jednou částí širšího systému. Okolní vrstvy
> zajišťují stav, nástroje, pořadí kroků, programové kontroly a rozhodovací brány.
> Přínosem práce je tyto principy systematizovat a ukázat jejich praktickou realizaci na
> konkrétním případu, včetně omezení zvoleného návrhu.
>
> Výsledkem je praktický příklad toho, jak lze současné postupy agentického inženýrství
> spojit do jednoho řízeného vývojového procesu.

The abstract should be translated only after the Czech annotation is final.

## Open

Ordered as the author sequenced them.

1. **Name the methodology in §3.1.** It currently names none — no *design science*, no
   citation. This is the case-study-versus-experiment objection, and the rewrite's answer is
   four sentences plus a Hevner reference.
2. **Verify CI run `34831795919`** before citing it as an operational record. GPT names it
   with Python 3.10–3.13. It is the only remaining way to answer *what evidence backs the
   claim*, now that limits sections are gone. **Unverified.**
3. **§3.1–§3.5 headings**, if the author still wants *Architektura / Požadavek / Implementace /
   Zpětná vazba*. Current names are descriptive rather than the requested four words.
4. **Chapter 5 outline.** The author approved the rewrite's 5-chapter shape in principle;
   not applied. Currently `4 Závěr / 4.1 / 4.2`.
5. **The *druh rozhodnutí* taxonomy** is used in 4.1 but introduced nowhere in chapter 2.
   The rewrite's four mechanisms are grounded in its chapter 2 and would replace it.
6. **4.1 vs 4.2.** 4.2 does not restate 4.1's two conditions, and now also omits the
   plan-boundary finding.
7. **Counter-argument in 4.1** restates the verdict rather than arguing. Its „člověk je čte"
   proves auditability, not reliability — a bad model can produce a readable bad diff.
8. **The no-verdict fact** lives only in a figure caption; 4.1 never uses it.
9. **Annotation and abstract** credit the commercial coding agents but never state the
   author's own contribution, which `guide.md` requires. Also: add *Komerční* before harness.
10. **Theory overstatements**: ReAct as a universal loop; the model knows nothing outside its
    text; `.agents/` treated as one standard; *context rot* conflating three failure modes.
11. **Figures**: a medical ChatGPT screenshot; two captions citing documentation for images
    that came from a community post; `0.36%` is an editorial estimate presented as a statistic.
12. **No research gap** in the introduction; the three-stage history reads as clean succession
    rather than overlapping models.
13. **`STATE.md` was this file.** The previous 905-line version described a structure that no
    longer exists, prescribed content that was never written, and carried four verification
    greps of which three matched nothing. Its useful content — house rules, standing
    constraints, the school-rule assessment, the record of expensive mistakes — is not
    reproduced here and is recoverable from git history if wanted.

## Not to be done

- Do not add evaluation criteria, a *Limity* subsection, or an iteration cap.
- Do not state the iteration count anywhere in the paper.
- Do not describe the loop as ending without a verdict in the body text; the claim belongs to
  the figure caption.
- Do not cite the current HEAD for practical claims.