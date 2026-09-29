# STATE — the one file about this thesis

*Agentické inženýrství ve vývoji softwaru — Návrh a implementace DarkFactory.*
Single state file. It replaced `TODO.md`, `PLAN.md` and `CONTEXT.md`; those three are gone, and their content
lives here unchanged. Git keeps their history.

**Anchor: `docs/thesis` at `b6ae110f`. 40 pages. Paper builds green. `bun run check` has one
error, in `src/cli.ts` — an import sort that predates this work and is unrelated to the paper.**

**How this file is used.** Part 1 is what is *true* of the thesis. Part 2 is what has been
*decided* and by whom, and what is still open. Part 3 is the cleanup pass, phase by phase,
with exact steps. Part 4 is the open-items log, the historical record of what was found and
fixed. Part 5 is run state: what has actually been done to the manuscript, and the rule for
what happens next.

**Two rules that outrank everything in this file.**
1. *Each concept is stated once in the whole paper.* Where it is needed again it is referred to
   symbolically or not at all. The author's words, unqualified. The test an agent used to split
   38 "echoes" from 18 "applications" is **unconfirmed** — see Q-D.
2. *Nothing is written to the manuscript without the author's confirmation immediately before
   it.* Ask with the question tool, show the exact change, then apply.

---

# Part 1 — What is true of this thesis

The single context file for this thesis. It replaces `REWRITE-BRIEF.md` and `REWRITE-MEMORY.md`.

**How this is split.** Part 1 holds what is true *of this thesis*. Part 3 holds the cleanup
pass. Part 4 holds what is unfinished. Method lives in the `thesis` plugin
(`.darkfactory/plugins/thesis/`), which is portable and outlives this repository — do not
restate a rule here that a skill already owns.

Written in English with the Czech preserved verbatim where the exact wording is load-bearing,
because the Czech text is what gets grepped and what must not drift. The paper is Czech;
`paper/rules.md` are Czech for the same reason; this file is Czech too, except where the
author's own rulings are quoted.

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
3 Praktická část    3.1 Metodika · 3.2 Architektura
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

1. `Blocked` means exhausted quota, not a repeated finding, and the review loop can end with no
   verdict recorded at all.
   `34-practical-implementation.typ` — „Smyčka však může skončit bez jakéhokoli verdiktu a bez
   komentáře… Jediným stavem, který v této revizi znamená zablokování, je vyčerpaná kvóta…"

   **The iteration count is deliberately not stated anywhere.** It was removed from every site at
   the author's instruction — §3.1, §3.4, the `@fig-darkfactory-pipeline` caption, the SVG's own
   description and label, the fifth finding, and the conclusion. The consequence the author kept
   is the interesting one: the loop can stop without recording why, so a later reader cannot
   tell a clean review from a stopped one. The count itself lives in Part 4, item J1, and is verified
   there against `d576ec8f`, not asserted in the paper.
2. Clean review runs **before** the plan-alignment check.
   `34-practical-implementation.typ` — „Po čisté review ještě proběhne kontrola souladu výsledného
   diffu se schváleným plánem. Ani ta není porovnáním sad souborů: je to druhý dotaz modelu…"
3. Approval is a two-entry allowlist on `GITHUB_ACTOR`, not the issue author.
   `35-practical-integration.typ` — „aktér se porovnává s jedním pevně zapsaným účtem, vlastníkem repozitáře…
   Neověřuje se tedy autor issue ani úroveň oprávnění, ale členství v tomto seznamu"
4. Test suites run once; not again after the fix.
   `34-practical-implementation.typ` — „Testovací sady se přitom spouštějí pouze jednou a po opravě
   už ne… Opakovatelná kontrola tedy rozliší dobrý a špatný stav, ale není překážkou"

The three methodology criteria are **gone from the paper**. R15 supersedes R11, R12 and R13:
the author dropped the sub-questions and the criteria, keeping only the main research question.
The school was checked first — `rules.md` and `guide.md` require a methodological part and
score methods, but never mention criteria — so §3.1 Metodika stays as the reproducibility
record and §3.1.1 is deleted (`1615ddf0`). §4.1 now answers the main question in prose.

**What "proxy approval" means**, since the term is easy to misread, and it has been got wrong
twice in this file. It is not an agent acting under the author's account, and it is not a machine
issuing the decision. The facts, from `handle_pr_approval.py` and `pr-approval-automerge.yml` at
`d576ec8f`:

- The allowlist is `{repo_owner.lower(), "marius-patrik"}` and `REPO_OWNER` is `marius-patrik`, so
  the set **deduplicates to one account** — the repository owner, acting from his own machine.
  The paper said "two hardcoded accounts" in two places and STATE.md in four more; all corrected
  in `b6ae110f`. It is one.
- A GitHub App mints an installation token and does the issue and pull-request work, with its own
  rate limit. A personal access token (`GH_PROJECT_TOKEN`) is used **only** for the Projects v2
  board, because GitHub scopes project permissions to organisations and the boards are
  user-owned. The App cannot reach it, so the board feature works only because of that split.
- The proxy approval is carried by `github-actions[bot]` via `BOT_TOKEN`. It must be neither the
  App nor the owner, because GitHub rejects an author approving their own pull request, and the
  pull request is opened by the App or the owner.

So: **a human decides, and the bot only carries that decision into the review field.** The honest
concession is not that a machine stood in for a person. It is that the approval recorded in
GitHub carries the bot's name, not the owner's. That now sits in §4.1's fourth finding, where the
system is judged rather than described; the confessional paragraph in §3.5 was deleted
(`b6ae110f`).

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
built and cut twice at the author's instruction. Do not rebuild it. Define a term precisely in
the chapter that argues with it. This constrains where the three criteria may be stated: §1.2
may name them as the work's own principles, but must not turn into a term list.

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
grep -rn 'může skončit bez jakéhokoli verdiktu' pages/   # loop can end with no verdict
grep -rn 'Po čisté review ještě' pages/
grep -rn 'pevně zapsaným účtem, vlastníkem repozitáře' pages/
grep -rn 'pouze jednou a po opravě už ne' pages/
```

**The first grep changed, and that is deliberate.** It used to look for
`nejvýše třemi iteracemi`, which asserted the iteration count. The count is no longer stated
anywhere in the paper, at the author's instruction; what the paper now commits to is the
consequence — the loop can end without recording why. The grep follows the claim, not the other
way round. The count is verified against `d576ec8f` in Part 4, item J1, instead, which is where it
belongs: it is a fact about the code, and the paper does not rest on it.

Never report a build as passing from a command whose output went through a pipe: `$?` is then the
pipe's, not the build's. This happened, and a failed build was reported green.

## Standing constraints

- **Each concept is stated once in the whole paper.** Where it is needed again, it is referred to
  symbolically or not at all. The author's words, unqualified, and it applies across the paper.
  *Not yet settled:* the test an agent used to split 38 "echoes" from 18 "applications" — the
  author never confirmed it, and until they do, that split is not a licence to keep anything
  (Q-D (Část 2)).
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
- **No sentence describes a figure.** The author removed the trailing sentence that named a
  figure, and the sentence the figure *belongs to* — not the one that introduces it — is the
  reference. Do not add a descriptive sentence to satisfy the letter of a linking rule.
  *Settled separately:* every figure is to carry a reference, inserted into that existing
  sentence. Six have none today; which sentence each attaches to is recorded in Část 3, Fáze 2.
  An earlier draft of that phase said "leading sentence", which is the sentence the author wants
  gone — corrected.

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
skill, the skill is about method and this file is about the thesis. If it contradicts Part 4,
that part is about what is unfinished.

---

# Part 2 — Decisions

**Stav: NÁVRH. Není hotový, dokud autor nepotvrdí.** Každá položka je záměr s uvedeným
důkazem; nic zde nebylo provedeno bez souhlasu. Cesty do souborů jsou `paper/pages/…`,
řádky odpovídají revizi `e9e9a063` a při každé fázi se posunou — proto je u každé položky
citát, ne číslo řádku.

**Co je rozhodnuto a co ne.** Sekce 3 dělí na `PŘIJATO` a `NEROZHODNUTO`. Kde je
`NEROZHODNUTO`, rozhoduje autor, a žádný krok v tomto plánu to nepředbíhá.

---

## 1. Zásada

**Zásada autora, nepodmíněná:** *„any concept should only be in the paper once"*, a má platit
*v celé práci* — „the principle should be applied across the whole paper". V této podobě je
v Části 1 mezi stálými omezeními.

**K testu, který použil průzkum, je třeba se vyjádřit.** Agent si ho vymyslel, aby v 38
opakováních a 18 „aplikacích" rozhodl, co se má smazat. Autor ho nepotvrdil. Bez jeho
potvrzení je práce s těmito dvěma čísly neodůvodněná, protože se na ně dá opřít kteréž
z těch 38 položek, které se autorovi nebudou zdát opakováním. **Čeká na rozhodnutí.**

Průzkum přesto zjistil, že opakování nejsou rozložena náhodně — sbíhají na třech místech:

| Kde | Co dělá |
| :--- | :--- |
| §4.1 | znovu popisuje §§3.3–3.5. Zjištění 1–4 chodí po pipeline, kterou tyto kapitoly už popsaly. |
| §4.3 | znovu vypisuje §4.1. Závěr má potvrzovat, ne enumerovat. |
| §2.1.1 a §3.1 | obě místa si nárokují stejnou myšlenku (model versus systém) a ani jedno neodkazuje na druhé. |

Teoretická kapitola je jinak čistá: čtyři podkapitoly §2.1, dva odstavce §2.3 i celá
diskuze o kompakci staví každou myšlenku jednou.

---

## 2. Co průvodce skutečně platí — a co z toho plyne

Odpověď na otázku, zda řezání odporuje školním pravidlům. `rules.md` (závazné) a
`guide.md` (doporučující) byly proti návrhu prověřeny.

### Porušení závazného pravidla: žádné

| Požadavek | Stav po řezu |
| :--- | :--- |
| kap. 2 — metodická část | `§3.1 Metodika` zůstává; ubývají jen její podkapitoly. |
| kap. 2.3 — výzkumná otázka a hypotéza | v §1.2, nedotčeno. |
| kap. 2.5 — limity výzkumu v diskusi | v §4.2, naopak zesíleny o třetí. |
| kap. 2.6 — závěr hodnotí naplnění cíle | v §4.1 a §4.3. |
| kap. 2.6 — doporučení pro další výzkum | v §4.3, zůstává. |
| kap. 4/6 — sazba, součásti textu, citace | nedotčeno. |

### Riziko pro body: ano, dvě položky

1. **Cíl práce, 5 bodů** — „je ověřitelný, dosažitelný, dostatečně konkrétní?". Bez měřítka je
   otázka nedoložitelná. Kritéria byla jediné měřítko práce, ale autor je zrušil (R15); otázku
   teď zodpovídá §4.1 v próze. Bod 5 tedy stojí na konkrétnosti zjištění, ne na seznamu.
2. **Metody, bodově nejvýše** — „je popsána tak, že podle ní lze výzkum opakovat?". To
   nesou čtyři vrstvy, připnutá revize a zjednodušení s cenou, ne kritéria. Tady řez neškodí.

### Rámec otázky — co zlepšit

Otázka je formulovaná správně, ale „principy" je slovo bez měřítka. Bod 5 proto dostane práce,
která ukáže, **jak** otázku zodpověděla. Tuto funkci teď plní §4.1, které na ni odpovídá
prozou. Kritéria i podmíněné `musí` jsou pryč (R15) a §2a, která je plánovala, je smazána.

---


### Přijato

| # | Rozhodnutí | Kdo | Zdůvodnění |
| :-- | :--- | :-- | :--- |
| R2 | §3.1.2 odstraněn, jeho jediná živá myšlenka přesunuta do omezení v §4.2. | autor + agent | Bylo to omezení, tak patří mezi omezení; třetí bod v §4.2. **Provedeno** (`55155a11`). |
| R3 | Věta, která obrázek popisuje, je z textu pryč. Odkazem je věta, se kterou obrázek souvisí. | autor | Výraz autora. Zapsáno jako stálé omezení v Části 1, aby to pozdější průchod nezvrátil. |
| R4 | Počet stran není míra kvality. | autor | Dříve B15 v Části 4. |
| R8 | `§4.2.1 Omezení výzkumu` zrušeno jako podkapitola; tři omezení zůstávají jako průběžný text v §4.2. | autor | „Flatten it into 4.2". Strom kapitol se zploští; kap. 2.5 průvodce tím není dotčena. **Provedeno** (`e9e9a063`). |
| R9 | Anotace se **nekrátí**; po Fázi 5 se jen ověří, že popisuje skutečný rozsah. | autor | „Leave the length, re-check the content". 159 slov je uvnitř 150–250. |
| R10 | `STATE.md` je v repu, stejně jako `rules.md` a `guide.md`. | autor | „Track it like the other working docs". |
| R11 | Podmínka `musí` ve výzkumné otázce se **vyhodí**. | autor | „Drop the conditional". |
| ~~R12~~ | ~~Kritéria se neodvozují z chyb.~~ **Zastaralé** | autor | „shouldnt we choose something we can prove we achieved?" Rozhodnutí zrušeno po R15: kritéria v práci nejsou, takže se neodvozují ani neuvádějí. |
| ~~R13~~ | ~~Kritéria se vyjmenují jednou v §1.2 a zodpovědí se v §4.1; §3.1.1 se ruší.~~ **Zastaralé** | autor | „state once in 1.2 answer in 4.1". Překonáno R15: kritéria se mažou všude, ne jen v §3.1.1. |
| **R15** | Kritéria se **mažou z celé práce**; hlavní výzkumná otázka zůstává. | autor | „keep the main question drop the three completely", pak „unless the aschool requires them delete everywhere". Ověřeno v `rules.md` a `guide.md`: škola vyžaduje metodickou část a hodnotí metody, ale kritéria neuvádí. Zrušuje R11, R12, R13. |
| R14 | Necitované položky bibliografie se nechají do konce. | autor | „leave them until the end like the plan says". |

### Nerozhodnuto — patří autorovi

| # | Otázka | Proč dosud nerozhodnuto |
| :-- | :--- | :--- |
| ~~Q-A~~ | ~~Kolik principů, v jakém znění, a zda vůbec zůstat u trojice.~~ **VYŘEŠENO** | R15. Trojice nezaniká žádnou jinou cestou — maže se celá. Škola kritéria nevyžaduje. |
| ~~Q-B~~ | ~~Zda v §1.2 uvést „vlastní principy, nikoli převzatou taxonomii".~~ **VYŘEŠENO** | Autor: „Delete the line". V práci už není, odstraněna dřív — `grep -rn taxonomi pages/` je prázdný. Nebyla co mazat. |
| ~~Q-C~~ | ~~Tvar §4.1.~~ **VYŘEŠENO** | Autorova pochybnost, zda vůbec zachovat tři otázky: „40:23 doesnt make sense". Zrušeno spolu s kritérii; §4.1 musí hlavní otázce odpovědět bez nich. Viz R15 a editaci 40:23. |
| **Q-D** | Zda test 38/18 platí. | Agentův vynález, autor ho nepotvrdil. Bez něj je rozdělení těch 38 neodůvodněné. |
| **Q-E** | ~~Hranice tří iterací.~~ **VYŘEŠENO** | Autor: „cut it there too". Počet odstraněn ze všech osmi míst (§3.1, §3.4, popisek @fig-darkfactory-pipeline, popis i nápis v `darkfactory-pipeline.svg`, páté zjištění, závěr). V práci zůstává následek — smyčka může skončit bez verdiktu — počet nefiguruje nikde a je ověřen v Části 4, položce J1. Viz Fáze 8. |
| **Q-F** | Pět popisků, které tvrdí víc, než obrázek ukazuje. | Autor: „the first is good so is the second and third and fourth not sure about the fifth". |
| **Q-G** | Proč odkaz na obrázek nesmí být v úvodní větě. | Plán říká „upravit existující úvodní větu"; autor řekl „the **related** sentences". Úvodní věta je přesně ta, kterou autor nechá smazat. Viz §5. |

---

## 4. Fáze — pořadí, jak bude probíhat

Každá fáze: subagenti **navrhují**, hlavní agent **ověřuje v souboru**, teprve potom se
mění. Změna se commituje po každé fázi. Bez schválení autora se do souborů nepíše.

**Změněno 2026-09-29 (R15, `1615ddf0`, `b6ae110f`).** Trojice kritérií je z celé práce smazána,
§3.1.1 je zrušen, §4.1 odpovídá hlavní otázce v próze a přiznání o botím zápisu schválení je ve
čtvrtém zjištění. §2a (99 řádků plánování kritérií) je smazána. Fáze níže jsou pořád platné,
kromě řádků, které odkazovaly na kritéria — ty jsou označeny ~~přeškrtnutím~~ nebo opraveny.
Fáze 5 má nový úkol: autor chce, aby shrnutí shrnovalo celou práci, ne jen praktickou část.

### Fáze 1 — Čeština
Cíl: B1, B2, B4 z Části 4. Jazyková úroveň nese 15 ze 200 bodů.
Subagenti hlásí **pouze kandidáty**, s přesnou citací, pravidlem a důkadem. Nic, co nemá
důkaz, se neopravuje. Minulý kontrolní průchod: 89 nálezů, z toho asi 20 skutečných.
Hotovo: `10:38` `agentůje` (`1615ddf0`).
Měření: průměrná věta pod 14 slov, žádná nad 30.
Podch. 1a `10`,`12` · 1b `21`,`22`,`23` · 1c `30`–`35` · 1d `40`,`41`,`50`.

**Průzkum hotov, čeká na provedení.** Zjištěno:

*Mechanické, bez úsudku — asi 23 položek.* Chybějící mezery (`10:38` `agentůje`,
`21:114`, `22:57`), rod slovesný vedle sebe (`31:27` `určený`/`určené`, `32:13`
`implementace`×2, `41:4` `odpovídá`/`odpověd`, `41:18` `dosažitelnou`×2), čárka místo tečky
(`34:13`, `35:25`, `22:34`), dvojtečka spojující dvě celé věty (`33:70`, `34:11`,
`35:11`), rod (`40:17` `čistá review` → `čisté`, `50:20` `kterých následuje`,
`50:16` `vyčeratou`), překlep `31:32` `Jge o` → `Jde o`, a jedna **nerozložitelná věta**
`31:27` — „Oproti ní je však reprodukovatelný, dohledatelný a jehož každé rozhodnutí
zůstává vidět" — kde jedno `je` vládne dvěma přívlastím *i* vztažným odstavci, takže po
`dohledatelný` nemá věta žádnou predikaci.

*Meta-komentář k práci — 4 jisté, 7 na hranici.* Jisté: `31:25` „o kterém **tato část
pojednává**", `35:13` „a **práce** to záměrně nerozšiřuje", `35:21` „**Zde je tedy
přesnější dodat**", `35:25` „a **zde to záměrně není rozvedeno**". Na hranici: `31:32`
„převádí **práce**…", `31:36` „není vynalézeno zde", `32:20` „**Tvrzení, že** struktura
procesu…", `35:21` „který **práce** záměrně nepopisuje".

*Nadsázka bez měřítka — 3.* `31:38` „konference v Garmischi odmítla **bez důvodu**" tvrdí
*poměr* k rozhodnutí z roku 1969, který práce neměří. `35:13` „rozdíl je malý v textu a
**velký** v tom, co z něj plyne". `32:20` „je proto v této revizi **doslova pravdivé**".

*Latinismy a kolokace — na rozhodnutí.* `měřitelné hranice`, `zdroj pravdy`, `akceptační
podmínky`, `nativně propojené`, `grafového orchestrátoru`, `změna dat`, `ekonomickou a
epistemickou cenu`, `nepodléhající vyjednávání`, `podmínka „určený" je ostrá`,
`náročky`, `nad /workspace`.

*Měření.* Průměrná věta: úvod 16,6 · agent 16,3 · agentické 20,3 · továrna 23,2 · metodika
21,1 · architektura 17,8 · plánování 16,8 · implementace 18,8 · integrace 17,9 · zjištění
17,8 · diskuse 19,2 · **shrnutí 24,1**. Cíl je pod 14 — tě ho nesplňuje žádný soubor,
shrnutí nejhůř. Přes 30 slov má 31 vět. Dvojteček je v praktické části 19× ve 118 větách
(16 %).

### Fáze 2 — Odkazy na obrázky
Cíl: aby každý obrázek měl v textu odkaz, **bez přidávání věty, která ho popisuje**.
Výslovně **ne** úvodní větou — tu autor nechává smazat. Odkaz nese věta, **se kterou
obrázek souvisí**. Viz Q-G; průzkum pro každý obrázek určil tuto větu:

| Obrázek | Věta, která nese odkaz | Vložit |
| :--- | :--- | :--- |
| `fig-copilot-inline` | „Nejprve doplňovaly kód v editoru @github-copilot-completion." | za citaci na konec |
| `fig-chatgpt-cannot-see` | „…takže i nadále všechno provedl uživatel." | **jen poslední klauzule** — předchozí mluví o nedostupných *nástrojích*, snímek o nemožnosti *vnímat* |
| `fig-claude-code-plan` | „…teprve potom se agent pustí do změn." | na konec |
| `fig-antigravity-subagents` | „**Coordinator/subagent** rozdělí rozsáhlou úlohu na dílčí běhy…" | za hlavní podstatné jméno — jediné, kde to sedí |
| `fig-dynamic-workflows` | „…plán je program, který lze přečíst a znovu spustit @anthropic-dynamic-workflows." | na konec. **Ne** do věty o Kimi nad ní — snímek Claude Code by pak důkazil tvrzení o Kimi |
| `fig-codex-goal` | „Dnes je to běžná funkce Claude Code i Codexu @claude-goal @openai-goals." | na konec. První věta prázdu popisuje dvouramenné větvení, snímek jen jeho konec |

Současně: popisek `32:8` přestat opakovat vrstvy (viz Fáze 4). Popisek `32:13` i SVG
tohoto obrázku jsou hotové — hranice smyčky z nich je pryč.

**Koliduje se stálým omezením v Části 1**, které dnes říká, že obrázek *bez* odkazu je
rozhodnutí, ne nedostatek, a že se nemá přidávat popisná věta. Autor přesto nařídil
odkazy doplnit. Oba příkazy jsou slučitelné jen tak, že se doplní **do stávající věty** —
proto musí být to omezení v Části 1 upraveno dřív, než se cokoli začne měnit.

### Fáze 3 — Teoretická část
Cíl: jedna myšlenka na sekci, žádné mluvení o práci uvnitř práce.
| Kde | Co |
| :--- | :--- |
| `22-theory-agentic.typ:4` | „není samotný agent ani jeho model, ale systém" = `21:12`. Nahradit odkazem. |
| `22-theory-agentic.typ:58` | „Spolehlivost tu nevzniká z modelu" = `21:15`. Vymazat první klauzuli. |
| `23-theory-factory.typ:12` | **Přidat `1968`.** Rok je v obou abstraktech, v těle chybí — tělo podpírá tvrzení abstraktu. |
| `23-theory-factory.typ:18` | „co smí do výroby vstoupit" — tvrzení bez opory, které drželo třetí kritérium, ale to je zrušené. Stále potřebuje `@nato1969` jako zdroj, jinak je to jen autorovo tvrzení. Viz Q-A: pokud kritéria zůstanou v §1.2, patří tato formulace tam. |

### Fáze 4 — Praktická část (přepis)
Cíl: zkrátit. Dnes `§3.1`–`§3.5` dohromady opakují to, co figury a popisky už říkají.
| Kde | Co |
| :--- | :--- |
| `32:8` (popisek) | Vrstvy už jsou v `32:4` těsně nad ním. V popisku nechat jen provenienci a „osm / čtyři". |
| `35:15` | Třetí prosový výrok o vrstvách. Vymazat první větu; zůstane cena a závislost. |
| `35:15` | „snadná reprodukovatelnost a viditelnost" = `31:27`. Vymazat výhodu, nechat nevýhodu. |
| `§3.4` | Mechanika patří do `34`; to je její jediné místo. Kvóta, jednonásobné testy, druhý dotaz modelu — každé jen jednou, tady. |
| `§3.3` | Ověřit, že Tabulka 1 je stále jen jedno místo, kde se předloha ukazuje. |
| `§3.5` | Scope boundary už je dvakrát (`1.2` a `3.5`) — to je podle Části 1 správně, obě místa jsou legitimní. Neměnit. |

### Fáze 5 — Závěr
Cíl: zkrátit. **Největší řez v práci.** Tvar §4.1 je nerozhodnutý (Q-C): autor navrhl
„just the three questions and answers", průzkum však pracoval s pěti zjištěními. **Dokud
se nerozhodne, Fáze 5 se nespouští** — níže jsou řezy, které platí při obou tvarech.

*Řezy v §4.2 a §4.3, nezávislé na tvaru §4.1:*
| Kde | Co |
| :--- | :--- |
| `41:4` | Hypothesis v parafrázi **a** vrstvy podruhé v téže větě. Vymazat vše za dvojtečkou. |
| `41:6` | „jde o druhý dotaz modelu" = `34:17`; „tři iterace" = `34:13`. Odkázat, nechat důsledek. |
| `41:8` | „rozliší dobrý a špatný stav, ale není překážkou" doslova z `34:11`. Vymazat; nechat až od „Rozlišení mezi kontrolou, která brání…". |
| `41:10` | Výhoda i nevýhoda už v `31:27` a `35:15`. Nechat rámec a poslední větu o odpovědnosti. |
| `41:22` | „Hypotéza se potvrdila: strukturu… přebírá od smyčky" = `50:18`. Vymazat poslední větu; argument o nezávislosti je bez ní úplný. |
| `50:10` | ✅ **HOTOVO `1615ddf0`** — tři principy i podmíněnost `musí` smazány. Zbývá v tomto řádku: „model sám o sobě" = `21:29`, „agent vzniká propojením" = `21:12`. Z celého odstavce zůstane jedna věta. |
| `50:12` | Známost celé architektury i posloupnosti fází podruhé. Vymazat celý odstavec kromě první věty. |
| `50:16` | Třetí výrok o třech iteracích, kvótě i testech. Vymazat vše kromě „Modelové review může být opakované, ale není deterministickou zárukou správnosti". |
| `50:18` | Potvrzení hypotézy **ponechat** — to je jeho úkol. Druhá půlka vět = `41:22`. Vymazat, nechat hranici. |
| `50:20` | „protože dnes hlásí, ale nebrání" pátá výpověď. Vymazat; body do budoucího výzkumu obstojí. |
| `50:22` | Deskriptivní klauzule čtvrtá; nechat **normativní pravidlo** — kdo bránu vykonává, musí být zapsán. To je jediný předpis práce. |

### Fáze 6 — Citace
Curlát na konec, jak autor rozhodl. Deset necitovaných položek se znovu posoudí *proti
finálnímu textu*, ne proti dnešnímu. Každá dostane verdikt: použít, nebo odstranit.
Zbývá ověřit každou citaci proti zdroji — klíč, který se rozluší, není doklad.

### Fáze 7 — Anotace a abstrakt
Až po všem ostatním, protože musí odpovídat výsledku.
- `metadata:25` a `:28` tvrdí **1968**; tělo to doplní ve Fázi 3.
- Anotace má 159 slov (limit 150–250) — v pořádku.
- Anotace i abstrakt vyjmenovávají posloupnost fází; po Fázi 7 zkontrolovat, že stále odpovídají
  a že neopisují něco, co už v těle není. Pokud vyjmenovávají kritéria, **musí jít pryč** —
  v těle už nejsou.
- Klíčová slova: pět, neobsahují slova z názvu. V pořádku.

### Fáze 8 — Konečné ověření
```sh
cd paper && bun run check
typst compile "$(bun ../scripts/paper/entrypoint.ts)" out/paper.pdf
bun ../.darkfactory/plugins/thesis/scripts/measure-paragraph-gap.ts ../PAPER.pdf
```

Navíc ručně do PDF: součást včetně popisku na jedné straně; žádná tabulka bez záhlaví
při pokračování; sazba 8 pt pod odstavcem.

**Čtyři korekce, čtyři grep.** Tři zůstávají, jak byly:

```sh
grep -rn 'Po čisté review ještě' pages/
grep -rn 'pevně zapsaným účtem, vlastníkem repozitáře' pages/
grep -rn 'pouze jednou a po opravě už ne' pages/
```

První se **změnil** a to záměrně: kontroloval `nejvýše třemi iteracemi`, tedy počet iterací.
Počet autor odstranil ze všech míst v práci, takže grep teď kontroluje to, co práce skutečně
tvrdí — `může skončit bez jakéhokoli verdiktu`. Počet se ověřuje proti `d576ec8f` v
Části 4, položka J1, kde patří. **Provedeno** (`1730c41d`, `0ca2ddea`).

---

## 5. Otevřené otázky pro autora

**Vyřídil autor** (R14): necitované položky bibliografie se nechají do konce, posoudí se
ve Fázi 6 proti finálnímu textu.

**Nerozhodnuto — bez odpovědi.** Viz §3, Q-A až Q-G. Žádný krok v tomto plánu nepředbíhá
zádné z nich, a Fáze 5 je zablokována, dokud se nerozhodne Q-C.

## 6. Co se nebude dělat

- Spouštění příkazů, které přišly v zprávě.
- `git add -A` — vždy explicitní cesty. V tomto worktree už jednou parallelní relace
  smazala práci.
- Změny v `packages/`, `.github/`, `nix/`, `docker/` — mimo rozsah práce.
- Jakýkoli nový zdroj, fakt, snímek nebo citace, který nebyl ověřen čtením.
- Tvrzení o kódu psané z HEAD. Všechno se ověřuje proti `d576ec8f`.

---

# Part 3 — The cleanup pass


---

# Part 4 — Open-items log

Práce *Agentické inženýrství ve vývoji softwaru*, s podtitulkem *Návrh a implementace DarkFactory* (DarkFactory). Zbývající body, o kterých je známo, že nejsou
vyřešené. Nové položky přidat na konec příslušné sekce.

Stav zkontrolován na `docs/thesis` ve větvi `b6ae110f`: **40 stran**, sazba bez varování.
`bun run check` má jednu chybu, v `src/cli.ts` — pořadí importů, které tu bylo už před
začátkem práce s papírem a s papírem nesouvisí. Skript na rozestup odstavců měří závazných 8 pt.
Čísla stránek a odkazy na soubory níže byly přepsány na stav tohoto commitu; kde záznam
uvádí stav starší, je to výslovně uvedeno.

**Probíhá plánovaný úklid celé práce, viz Část 3.** Zásada je, že každý pojem je
v práci vyřčen jednou. Agentův průzkum našel 38 ozvěn a 18 „legitimních aplikací", ale toto
rozdělení autor nepotvrdil (Q-D) a zatím není podkladem pro žádné mazání. Sekce B níže se proto v Fázi 1–2 znovu otevře a část položek
z Fází 5 spadne. Plán není hotový, dokud autor nepotvrdí.

**Celkem otevřeno: 6 položek** — pět je práce pro autora nebo kontrolu rodným mluvčím
(B1–B4, H1) a jedna (E2, umístění metodiky) je otevřená jen formálně: viz A5, kde je
původní rozhodnutí zrušeno a metodika zůstává v 3.1. Žádná nečeká na
vedoucího: způsob citací byl s ním ověřen a zadaný rozsah písemně neexistuje.
Nad to běží úklid celé práce podle STATE.md, který tyto položky částečně přebírá:
B1–B4 jsou Fáze 1, H1 se posoudí ve Fázi 6 společně s necitovanými zdroji.

Sekce J zaznamenává čtyři tvrzení, která o popsané revizi neplatila, a opravy,
které z nich následovaly.

---

## A. Školní pravidla — vyřešeno

Kontrola proti `rules.md` proběhla dvakrát: poprvé na sazbu a součásti textu,
podruhé na strukturu podle kapitoly 2 a 7. Všechny nedostatky jsou opravené,
každý vlastním commitem.

| # | Co | Stav |
| :-- | :--- | :--- |
| A1 | Odkazy v textě u čtyř součástí | ✅ `1051e437` |
| A2 | `Výpis 1` chyběl v seznamu součástí | ✅ `487e0b06` |
| A3 | Anotace 128 slov | ✅ `89109fc7` |
| A4 | Šest klíčových slov | ✅ `1d0d4fe9` |
| A5 | Metodika — původně rozhodnuto přesunout do kap. 1 jako epistemickou podkapitolu. **Rozhodnutí zrušeno autorem:** teoretická část byla autorovi oznámena jako hotová a přesun by ji znovu otevřel. Metodika zůstává podkapitolou 3.1 uvnitř praktické části, jak uvádí `guide.md`. Podkapitola 3.1.2 (otázka o složení vrstev) byla odstraněna a její myšlenka přešla jako třetí omezení do 4.2 (`55155a11`). Zbývá jediná podkapitola, 3.1.1 Tři kritéria, ale autor pak rozhodl „state once in 1.2 answer in 4.1", takže ani ta není ve svém stavu konečná — viz Část 3 Q-A. Věta o určení revize byla z úvodu 3.1 odstraněna na autorův pokyn; revize se stále uvádí v popiscích a v citacích `@darkfactory-d576ec8f` v těle. | ✅ zrušeno, viz E2; 3.1.1 viz Q-A |
| A6 | Chyběla výzkumná otázka a hypotéza (kap. 2.3) | ✅ `34ad2ca1` |
| A7 | Závěr nehodnotil naplnění cíle a neměl doporučení (kap. 2.6) | ✅ `4b53cb88` |
| A8 | Omezení výzkumu v Diskusi (kap. 2.5) | ✅ `fbbfb7b6` |
| A9 | Anotace a abstrakt neodpovídaly rozsahu | ✅ `0147a69b` |

## B. Jazyková a stylistická korektura — částečně

| # | Co | Kde | Stav |
| :-- | :--- | :--- | :--- |
| B1 | **Nejvyšší priorita.** Procházet celý text s rodným mluvčím. Jazyková úroveň nese 15 ze 200 bodů (5 gramatická správnost, 10 stylistická). Žádný nástroj nerozezná kolokaci od chyby. | celá práce | ⏳ |
| B2 | Hlasová kontrola dvojic „podstatné jméno + rozvinutá příčka“, např. *přijetí a plánování požadavku*. | `pages/30`–`35` | ⏳ |
| B3 | **Rozhodnutí o hlasu.** `review smyčka` a další anglické technické výrazy jsou užity souvisle a odpovídají popiskům *uvnitř* obrázků. Změnit jen text bez změny diagramů by dokument zhoršilo. Buď ponechat, nebo přejít na české ekvivalenty a překreslit popisky v SVG. | celá práce + `components/img/*.svg` | ⏳ autor |
| B4 | Procházet teoretickou část s rodným mluvčím. Mechanický sken našel přes 100 nálezů, z nichž drtivá většina byly falešné poplachy (odsazení v Typstu, dvojice `claude claude` ve vyřazeném výpisu rozhraní), ale regex nerozezná kolokaci od chyby. | `pages/21`–`23` | ⏳ |
| B5 | Věta se třemi podřadicími členy bez interpunkce a s chybějící mezerou v `kdybyse`; relativní věta, která pohltila hlavní větu; `checkoutují` jako sloveso. | `pages/22-theory-agentic.typ` aj. | ✅ `1c5099d2` |
| B6 | Nadbytečná mezera na začátku odstavce (Typst ji vykreslí jako mezeru mezi slovy) a odkaz na obrázek stojící samostatně jako věta. | tehdy `pages/23-theory-agentic.typ` a `pages/22-theory-harness.typ`; druhý soubor zanikl spojením modelu a harnessu do `pages/21-theory-agent.typ` | ✅ `1c5099d2` |
| B7 | **Nález při čtení zdrojového textu.** V §2.3.2 (tehdy; dnes §2.2.2) zůstala za větou o hook middleware viset druhá polovina předchozí věty: sazba na str. 11 obsahovala „…pro deterministický běh. udělat. Druhou skupinu zajišťuje harness…", tedy duplikát i osiřelé „udělat.". Věta o hook middleware byla od té doby z §2.2.2 vyřazena, takže nález už není v textu dohledatelný. | `pages/22-theory-agentic.typ` | ✅ |
| B8 | **Nález při čtení zdrojů, věcná chyba.** §2.4 (tehdy; dnes §2.3) nejprve připisovala zavedení pojmu software factory konferenci NATO v Garmischi. Pojem formuloval Robert Bemer z General Electric ve vlastním návrhu; konference ho projednávala a sama o prvním užití neuvádí. Tenkrát stála na primárním citátě ze zprávy konference (str. 94 původního číslování) a na životopisu; dnes §2.3 stojí na `@nato1969` a `@bemer-chm`, protože byla zkrácena na tři odstavce. | `pages/23-theory-factory.typ` | ✅ |
| B10 | **Nepodložené tvrzení.** §2.4 tvrdila, že továrna „automatizuje provádění, nikoli rozhodování". Cusumano toto neuvádí; oprava opřená o záznam diskuse ze zprávy konference (str. 95: Fraser, Ross, McIlroy) a o Bemera z roku 1977 zanikla spolu s tímto odstavcem při zkrácení §2.3. Dnes §2.3 tvrdí jen, že agent posouvá hranici dál, a je to tvrzení o definici pojmu, ne o měření. | `pages/23-theory-factory.typ` | ✅ |
| B11 | **Nedohledatelné zdroje vyřazeny.** Zmizel `@cusumano1991factory` (platno jen přes předplatné, pracovní verze na MIT DSpace vrací 405) a `@bemer-software-factory` (překlep v roce 1970, tedy příliš pozdější pro zavedení pojmu). Ani Bemůr papír *Economics of Program Production* (Information Processing 68, 1969, s. 1626-1627) není dostupný. Pravidlo: zdroj, který nelze číst, se necituje. | `components/bib/references.bib` | ✅ |
| B12 | **Planá vada, po zpětném šetření vyvrácena.** Strana s 29 znaky (tehdy str. 16, dnes str. 20) vypadala jako prázdná strana. Ve skutečnosti je to záměrný titulní list oddílu „PRAKTICKÁ ČÁST / DarkFactory", který má textu málo z podstaty. Žádná vada, nic neopravovat. | — | ✅ |
| B13 | **Rozhodnutí vedoucího, tři výrazy v přehledu zdrojů odstraněny.** V §1.2 (tehdy; dnes §1.3) zmizelo počítání „čtyři měřicí a jedna poziční“, celý odstavec o nepublikovaných předběžných výtiscích a vlastních výsledcích dodavatelů i odstavec o párování s primárním zdrojem; zůstaly jen popisy jednotlivých prací. Celý přehled zdrojů později zanikl: §1.3 je dnes jediný odstavec o překladu terminologie. |
| B14 | **Přejmenováno na žádost.** §2.3.1 (dnes §2.2.1) `Zadání a kontext` → `Zadání a plán (Prompt & Plan)`; §2.3.3 (dnes §2.2.2) `Orchestrace a lidská integrace` → `Orchestrace a lidská integrace (Orchestration & HITL)`. |
| B16 | **Rozestup odstavců nebyl skutečně nastaven.** `spacing: 12pt` v `styles/body.typ` vychází z nulové hodnoty: Typst měří `spacing` jako cílovou vzdálenost celého odstupového rozestupu, ne jako přírůstek k `leading`, a vůči `leading` 11,7 pt se 12 pt zrušilo na 0,3 pt, tedy na žádný odstup. Změřeno v PDF: 24 pt dávalo skutečných 12,3 pt. Hodnota nakonec nastavena na **19,7 pt**, což je požadovaných 8 pt nad řádkováním; důvod zapsán v `body.typ`, aby ho nikdo nezkrátil zpět, a měří se skriptem, ne odhadem. |
| B17 | **Legenda grafu AI na jeden řádek.** Čtyři položky s barevnými značkami na jedné basální čáře, 9,5 pt; původně dvě řádky na položku ve dvou velikostech. Popisky zkráceny na `Nikdy nepoužili`, `Chatboty`, `Předplatné`, `Coding agenti`, protože na jeden řádek se s celými čísly vešly až při nečitelné velikosti. |
| B15 | **Kritérium strán změněno.** Vedoucí rozhodl, že rozhoduje délka textu ve slovech a znacích a čitelnost, nikoli počet stran. Tím se otevřelo, jaký rozestup zvolit; vyřešeno společně s B16 na závazných 8 pt. |
| B9 | Konec přímé citace byl ASCII `"`, který Typst vykreslil jako nízkou uvozovku; česká sazba vyžaduje vysokou. | `pages/23-theory-factory.typ`, `pages/33-practical-planning.typ` | ✅ |

Tvrzení o 28 % chatbotů a 0,36 % coding agentů ponecháno, ale už ne jako argument
práce, nýbrž jen jako představa o šíření nástrojů; viz H1. Průvodce v kap. 3.9 žádá
u statistik uvedení zdroje a metody; obrázek je opatřen citací
@gradually-ai-usage-2026 a popiskem, takže podmínka je splněna.

## C. Rozsah praktické části — vyřešeno rozdělením na dvě práce

Práce je rozdělena na dvě: tato (4. ročník, školní) a navazující (maturita).
Tím se otázka C1 vyřešila sama: popis počáteční implementace není kompromis,
ale předmět zkoumání. Navazující práce má popsat konečnou architekturu `df`.

| # | Co | Stav |
| :-- | :--- | :--- |
| C1 | Kterou revizi praktická část popisuje | ✅ rozhodnuto: `d576ec8f`, vymezení v §1.2 a §3.5 |
| C2 | Pasáž o pozdější konsolidaci byla `draft[]` a odporovala novému vymezení | ✅ `af23eaeb` — nahrazena odkazem na rozsah |
| C3 | Tabulka rozhraní osmi harnessů jako obrázek. **Rozhodnuto autorem: vyřazena.** Místo ní je v §2.2.2 jedna převzatá ilustrace rozhraní @fig-antigravity-subagents. Tabulka byla dokladem zachyceným spuštěním `--help`; argv deklarace zůstávají jedině v registru harnessů v repozitáři. Výpis kódu (`Výpis 1`) byl vyřazen spolu s tabulkou a dnes v sazbě žádný není. | ✅ rozhodnuto |
| C4 | Položka `darkfactory` v bib byla necitovaná. Nyní je repozitář zmíněn v textu §3.5, tedy citován, a odkazuje na repozitář jako celek místo na konkrétní revizi. | ✅ `6b3e85f7` |

## D. Repozitář

| # | Co | Stav |
| :-- | :--- | :--- |
| D1 | `paper/.opencode/goals/` nebyl v `.gitignore` a objevoval se v každém `git status` | ✅ `4a0e2e73` |
| D2 | Práce je na větvi `docs/thesis`, jejíž historie patří dokumentům. Rozhodnuto ponechat. Na větvi přibývá i cizí práce (`README.md`), s touto se nijak nepletou. | ✅ rozhodnuto |
| D3 | `styles/draft.typ` není v dokumentu použit. Ponechán záměrně pro navazující práci; viz jeho hlavičku. | ✅ informativní |

## E. Vyžaduje rozhodnutí vedoucího práce — vyřešeno

| # | Co | Stav |
| :-- | :--- | :--- |
| E1 | **Způsob citací.** Průvodce přenechává volbu vedoucímu (kap. 5). | ✅ ověřeno s vedoucím, číselné citace odpovídají očekávání |
| E2 | **Umístění metodiky.** Viz A5 — zůstává otevřené, ale ne jako urgentní: přesun je mechanický a lze ho udělat kdykoliv. | ⏳ viz A5 |
| E3 | **Zadaný rozsah práce.** Hodnoticí protokol dává 10 bodů za „splnění zadaného rozsahu". Písemné zadání neexistuje, takže proti němu nelze práci ověřit a položka mimo autoritu autora. | ✅ neexistuje |
| E4 | **CSL šablona** `gjkt-iso690-numeric-cs.csl`. | ✅ součástí E1 |

## F. Kontrola před odevzdáním

| # | Co | Proč |
| :-- | :--- | :--- |
| F1 | Nechat zkontrolovat cizím okem celou práci, nejen jazykově. | Několikrát se ukázalo, že kontrola odhalí věci, které vlastní oko přestalo vidět. |
| F2 | Výpis rozhraní byl z práce vyřazen (C3), takže se v ní už nesrovnává s nainstalovanými nástroji. Registry v repozitáři zůstávají jediným místem, kde jsou argv deklarována, a je třeba je občas srovnat s nainstalovanými CLI. Všech osm nástrojů bylo ověřeno 27. září 2026, `claude` byl do té doby rozbitý a byl opraven; `agy` byl téhož dne ověřen znovu na `1.2.10`. | registr harnessů |
| F3 | Požádat vedoucího o zpětnou vazbu k novému názvu, výzkumné otázce a oddělení dvou prací. Změna názvu a přesunutí praktické části jsou věcné krok. | práce jako celek |

## G. Předání

| # | Co | Proč |
| :-- | :--- | :--- |
| G1 | `claude` CLI bylo v npm registrováno, ale nespustitelné: symlink ukazoval na neexistující cíl a nativní binárka se nikdy nestáhla, protože postinstall nikdy neběžel. Instalace byla opravena a rozhraní zachyceno z `--help` verze 2.1.283. | ✅ `6b3e85f7` |
| G2 | Zachyty `--help` leží v dočasném adresáři a nejsou součástí repozitáře. C3 nebylo přijato, takže do práce nedešly; pro případné budoucí srovnání by je bylo nutné uložit trvale. | ✅ nepotřeba |

## H. Provenance zdrojů

| # | Co | Stav |
| :-- | :--- | :--- |
| H1 | **Silnější zdroj pro údaje o adopci AI.** Rozhodnuto: `@gradually-ai-usage-2026` zůstává jako ilustrační zdroj a `@fig-gradually-usage` zůstává v úvodu, ale čísla nesmějí nést argument práce. Hledat primární či recenzovanou náhradu za podíl uživatelů chatbotů a coding agentů; pokud žádná není, ponechat formulaci výslovně jako odhad. Zdroj mimo jiné uvádí vlastní rozpětí 25–35 milionů a výslovně odmítá, aby bylo čteno jako údaj providera. | ⏳ |
| H2 | `@guild2026` (34 % autonomních pull requestů, 56 % oprav, 91 % bez zásahu inženýra) sestoupá do pozadí jako vlastní měření společnosti. Když §2.4 stála v textu, nesměla podpírat tvrzení o tom, že popsaný průběh je běžná praxe. **Dnes v práci není ani jedno z těchto čísel ani citace na `@guild2026`** — průmyslové statistiky odešly spolu se zkrácením §2.4 na tři odstavce. Zdroj zůstává v bibliografii necitovaný. | ✅ |
| H3 | `@bcg2026` a `@factory2026` zůstávají, ale jen pro definici a architekturu, nikoli pro číselné údaje. Jejich čísla jsou footnote na vendorské blogy. `@anthropic-agents-2026` měl být jediným podkladem pro tvrzení o šíření agentů do výroby. **Dnes jsou všechny tři necitované** a žádné tvrzení o šíření agentů do výroby práce nestaví. | ✅ rozhodnuto, text odpovídá |
| H4 | **Šablona CSL `note` nevypisuje.** Poznámky v `references.bib` se v seznamu zdrojů neobjeví vůbec, takže provenanci musí nést text a popisky obrázků, ne bibliografická poznámka. Šablonu schválil vedoucí (E4), proto se jí nedotýkat bez domluvy; pokud se má provenance zobrazovat, je třeba to nejdřív říct. | ✅ zjištěno |
| H5 | **Původ cílové smyčky opraven.** §2.3.3 připisovala goal loop ReActu (`@yao2022`), který o nadřazené smyčce s podmínkami přijetí nepíše. Dnes §2.2.2 stojí na `@huntley2025ralph` jako původním textu a na `@claude-goal` a `@openai-goals` jako podkladech, že je to dnes běžná funkce. **`@wiegold2026ralph` v bibliografii není a v textu není nikde** — dřívější záznam o popisné studii neodpovídal stavu souboru. `@yao2022` zůstává citováno v §2.1.2 u ReActu, kde patří. | ✅ |
| H6 | `gradually.ai`, `guild.ai`, `bcg`, `factory.ai` zůstávají v bibliografii, ale jejich číselné údaje se nesmějí objevit v textu jako měření. Ověřeno přepisem celé práce: **jediná věta s procenty je v §1.1** a je výslovně označena jako odhad (28 % chatbotů, 0,36 % agentů, `@gradually-ai-usage-2026`). Čísla Guildu, BCG a Factory v textu nejsou žádná. Necitovaných položek bibliografie je deset: těchto čtyři plus `bemer1977factory`, `randell1968`, `gu2026harness`, `yao2026harnessbench`, `chen2026harnessx` a `ding2026scaffold`. | ✅ |

## I. Materiály z čtení, které zatím nejsou v textu

Nalezeno při čtení zdrojů, vyhovuje závěru práce, ale zatím nevsunuto. Kandidáti na
§2.2.2 a na omezení výzkumu. **Jeden už v textu je** — tři druhy bran jsou citovány v §2.2.2,
kde jsou rovnou použity k popisu druhů bran; ostatní čekají.

- **Rozhodující model je jiný než pracující.** Claude Code: `/goal` „adds a separate
  evaluator that checks your condition after every turn, so completion is decided by a
  fresh model rather than the one doing the work" @claude-goal. To je nezávislé
  potvrzení vlastního návrhu práce; v práci dosud není.
- **Hodnotitel nevidí do repozitáře.** „It does not call tools, so it can only judge
  what Claude has already surfaced in the conversation" @claude-goal. Cílová smyčka
  tedy nenahrazuje deterministickou bránu, protože posuzuje jen to, co pracující model
  sám ukázal. Nejsilnější materiál pro omezení, protože přiznává sám dodavatel.
- **Tři druhy bran v jedné větě.** „A Stop hook … can run a script for deterministic
  checks or a prompt for model-evaluated ones" @claude-goal. Přesně rozlišení, o které
  šlo v korekci brán. ✅ **vsunuto v §2.2.2** při Fázi 3 (v §3.1.1 to bylo, ten je zrušen).
- **Tři verdikty hodnotitele.** Not yet met / Met / Impossible @claude-goal. Model tedy
  může i běh ukončit záporným verdiktem, a existuje proto detekce zacyklení.
- **Lidská brána jako architektura.** „Pausing, resuming, clearing, and
  budget-limited transitions remain controlled by the user or the system"
  @openai-goals. A „Reaching a budget limit is not the same as completing the
  objective."
- **Smlouva o cíli o šesti položkách.** Outcome, Verification surface, Constraints,
  Boundaries, Iteration policy, Blocked stop condition @openai-goals. Přesnější
  slovník k plánování, než má práce dnes.
- **Zralost.** Thoughtworks Technology Radar má Ralph jako Trial, nikoli Adopt.
  Odkaz byl z textu i bibliografie odstraněn jako nepřínosný.

## J. Nepravdivá tvrzení o popsané reviz — opraveno

Kód byl ověřen přímo v revizi `d576ec8f`, ne v pracovním stromu, který se od té doby posunul. Čtyři tvrzení o popsaném průběhu revizi neodpovídala. Všechna jsou nyní uvedena jako vlastnosti popisované revize, bez oddělu „opravy" a bez omluvy v textu; opravy jsou v `c23caa69`.

| # | Co | Stav |
| :-- | :--- | :--- |
| J1 | **§3.4 uváděla, že se opakovaný stejný nález bez progresu označí jako zablokovaný stav.** Ve skutečnosti `Blocked` znamená **vyčerpanou kvótu**; porovnání digestů přišlo až v pozdější revizi (`21dfd85d`). Mechanismus v `d576ec8f`: `MAX_REVIEW_ITERATIONS = 3`, oprava bez změny ukončí běh dřív a vyčerpání nezapíše žádný verdikt ani komentář. **Tento záznam je jediné místo, kde číslo je; v práci ho autor odstranil záměrně ze všech míst** (§3.1, §3.4, popisek @fig-darkfactory-pipeline, popis i nápis v `darkfactory-pipeline.svg`, páté zjištění, závěr) — rozhodl, že se má uvést následek, ne počet. V práci tedy zůstává „smyčka může skončit bez jakéhokoli verdiktu", což je přesně to, co je pro obhajobu důležité, a počet se neuvádí nikde. Grep v `paper-verify` na `nejvýše třemi iteracemi` byl zrušen, protože by vyžadoval větu, kterou autor nechce v textu mít. | ✅ `c23caa69`, číslo z textu odstraněno |
| J2 | **Pořadí dvou bran bylo obrácené.**. Revize nejprve předá diff modelové review, až pak porovná změněné soubory se schváleným plánem; kód sám čísluje kroky `# 11. Self-review loop` a `# 12. Plan alignment gate`. | ✅ `c23caa69` |
| J3 | **Schválení pull requestu bylo popsáno jako ověření autora issue nebo oprávněného člena.**. Je to **jeden pevně zapsaný účet, vlastník repozitáře**, porovnávaný s `GITHUB_ACTOR` (`handle_pr_approval.py:216-225`) — ne autor issue, ne úroveň oprávnění. Set `{repo_owner.lower(), "marius-patrik"}` při `REPO_OWNER=marius-patrik` deduplikuje na jedno jméno; dvě účty nikdy nebyly. | ✅ `c23caa69`, opraveno v `1615ddf0`+ |
| J4 | **Práce tvrdila, že review a testy jsou skutečnou překážkou.**. `verify_repository` je definována jednou a **volána jednou** (`agent_runner.py:2088`); výstup jde do promptu `fix` a druhý běh nenastane, takže změna s neprocházejícími testy dorazí do draft pull requestu. | ✅ `c23caa69` |

| # | Co | Stav |
| :-- | :--- | :--- |
| J5 | **Záznam opakovatelnosti nyní určuje revizi.** Bez určení revize nelze popis ověřit proti kódu, a právě na tomto místě se ukázalo, že čtyři výše uvedená tvrzení revizi neodpovídala. Věta byla v §3.1 hned před výčtem čtyř vrstev a byla odstraněna na autorův pokyn („remove, this doesnt belong in the paper", `d6eccfd6`) — mluvila o práci, ne o popisovaném systému. | ✅ `4a378768`, věta odstraněna |
| J6 | **V Typstu značí `*...*` tučné, nikoli kurzívu** (kurzíva je `_..._`). Sedm míst v revizovaném textu používalo `*...*` v úmyslu kurzívy, takže tiskla tučně — mezi nimi název příspěvku *Attention Is All You Need* a heslo *schopen* v §1.2. Všechna nyní `#emph[]`. | ✅ `4a378768` |
| J7 | **Tři jazykové chyby nalezené čtením sazebného textu: „jako **tato** tři" v závěru, kolize pádu „považován **za** rovnocenný / první bráně" v §3.4 a chybné číslo korekce v komentáři §4.1.**. | ✅ `4a378768` |

| J8 | **Vysácená mezera za tečkou v anotaci.** V sazbě s `lang: "cs"` Typst nezkouší zlom řádku za tečkou, a když na konec řádku další slovo nevejde, mezera se místo zlomu smlčví — v tisku vyšlo „integraci změn.Strukturu", „přebírá od smyčky.kterou" a v anglickém abstraktu „integration.The". Anotace je nyní `#set par(justify: false)`, tedy na pravém okraji volná; text těla zůstává dvorečkovaný a v dnešní sazbě se vada neobjevuje. Podmínkou bylo, že blok nemá rezervu v šířce. (Původně ověřeno na str. 9 a 20 tehdejší sazby; čísla stran se od té doby posunula.) | ✅ |
| J9 | **Malé písmeno na začátku věty v anotaci.** „navrhuje autor sám. úsudek o tom" — zdroj měl `úsudek` s malým `ú`. Vzniklo to z neúspěšného nahrazení, jehož shoda nebyla ověřena; od té doby je každé nahrazení v této práci kontrolováno na shodu. | ✅ |

| J10 | **Titulní list části přetékal na číslo stránky.** Karta „PRAKTICKÁ ČÁST / DarkFactory" měla na začátku `#v(1fr)`, čímž se obsah posunul na konec stránky a „DarkFactory" tiskl přes číslo stránky. Vodorovné a svislé vycentrování je správně `#align(center + horizon)`; samotné `1fr` před obsahem obsah dolů zarovná. Oprava v `pages/30-practical.typ` stále platí; karta je dnes na str. 20. | ✅ |
| J11 | **Ovdal na 3.4.** §3.4 přetékal na stranu 26 dvěma řádky. Zkrácení o 125 znaků, všechny byly v redundanciích („na níž se tato kapitola opírá", „kterou práce zaznamenává"), stránka tehdy zmizela. Práce má dnes 40 stran; čísla 37/38 i 43 z tohoto záznamu jsou historická a neplatí. Obě korekce v §3.4 zůstaly doslova. | ✅ |

| J12 | **Trojice kritérií se v práci nikde neuplatnila.** §3.1 kritéria zavádí jako měřítko, kterým se má odpovědět na výzkumnou otázku, §3.5 hlásí, že třetí je oslabené zástupným schválením, ale ani Zjištění, ani Diskuse, ani Závěr kritéria nepoužily. | ✅ **Vyřešeno odstraněním (R15, `1615ddf0`).** Autor kritéria zrušil celá; mezeru nebylo třeba zaplňovat, protože není čeho. §4.1 odpovídá hlavní otázce v próze a přiznání o botím zápisu schválení přesunula do čtvrtého zjištění (`b6ae110f`). |
| J13 | **Opakování v prvním zjištění.** §4.1 znovu popisoval tok události přes GitHub Actions, kontejner a runner, který §3.2 vykládá podrobně. Zkráceno na odkaz, čímž se uvolnilo místo na J12 bez přidání stránky. Odkaz na §3.2 je symbolický (`@architektura`), aby v práci nezůstala tvrdá čísla sekcí. | ✅ |

| J14 | **Páté nepravdivé tvrzení, navíc proti sobě.** Čtvrtá položka čtyřvrstvového výčtu v §3.1 tvrdila, že se review "opakuje do té doby, než se uzavře poslední nález". To odporovalo korekci J1, podle níž smyčka může skončit bez verdiktu. Autor tenhle výčet posléze zrušil celý, protože opakoval §§3.2–3.5, a tím se položka 4 z §3.1 přesunula. Tvrdění o neomezené smyčce tak z textu zmizelo; zůstala věta, že smyčka může skončit bez jakéhokoli verdiktu, a počet iterací se neuvádí. Ostatní tři vrstvy proti kódu odpovídaly; ověřeno mimo jiné, že plán je skutečně child issue přes `--parent`, že merge používá `--delete-branch` a že `agent.yml` má podmínku na úrovni jobu `vars.AGENT_ENABLED == 'true'`. | ✅ text bez neomezeného tvrzení |

| J15 | **Tabulka 1 neodpovídala předloze, kterou zobrazovala.** Předloha `request.yml` má v `d576ec8f` šest polí; tabulka jich uváděla pět a vynechávala `Parent Epic`, aniž by to přiznala. Dnes je tabulka postavena jinak: zobrazuje tři povinná pole předlohy (`Verbatim User Request`, `Area / Component`, `Request Type`) a pod nimi volně psaný požadavek, který předlohu nevyplnil. Popisek to přiznává a říká, že předloha má šest polí, z nichž tři povinná. | ✅ |

| J16 | **Tvrzení o neomezené smyčce bylo na čtyřech místech, ne na jednom.** Po opravě J14 zůstalo v popisku @fig-darkfactory-pipeline, v popisné poznámce samotného `darkfactory-pipeline.svg` a v popisku smyčky v tom obrázku („Dokud není čisté“).. Všechna tři byla opravena. V obrázku pak bylo „Nejvýše 3 iterace", což ale znovu uvádělo počet, a autor jej nechal odstranit: v SVG je nyní „Bez verdiktu" a v popisné poznámce „a může skončit bez verdiktu". Počet není uveden nikde v práci. Původní hledání tvaru „dokud / opakují / než se uzavře" tyto výrazy nezachytilo, protože používaly jinou slovesnou formu. | ✅ počet odstraněn ze všech míst |

| J17 | **V §3.4 chyběl mechanismus odchylky od plánu.** Když automatická review najde nález vyžadující zásah mimo plán, `handle_self_review` ho neodmítne: vygeneruje odůvodnění, zapíše `### Plan Deviation` na původní issue a plán doplní. Papír tedy mlčel, že schválený plán není neměnný, což je pro třetí kritérii i pro obranu závěrů podstatné. Doplněno. Tvrzení §3.5, že zpětná vazba člověka neputuje do plánu, zůstává správné: tuto cestu má jen automatická review, ne lidský požadavek na změnu. Místo uvolnilo zkrácení opakování průběžné integrace, kterou předchozí odstavec popisuje už jednou. | ✅ |
| J18 | **Ověřeno v §3.3 a §3.5, nic tam nebylo v rozporu.** Vzor `request.yml` má přesně tři povinná pole, jak tvrdí Tabulka 1, a `Parent Epic` je nepovinný. Interpretace si žádá přesně tři oddíly, které §3.3 vyjmenovává, a předává titulek i tělo. Plánovací prompt žádá o Scope, Architectural & Code Changes a Verification Steps. Zástupné schválení v §3.5 je přesné: vyžaduje `BOT_TOKEN` odlišný od `GH_TOKEN`, protože pull requesty jsou otevírány tokenem správce, který GitHub odmítá schválit vlastní. | ✅ |
| J19 | **Zdroj o dynamických workflow chyběl.** Tvrzení, že workflow graph určuje závislosti a větvení fází, stálo jen na `@openai-agent-orchestration`. Doplněn inženýrský příspěvek Anthropic o dynamických workflow `@anthropic-dynamic-workflows` a snímek jeho rozhraní jako @fig-dynamic-workflows; screenshot pochází z komunitního příspěvku, což je uvedeno v popisku i v poli `note`. |

---

# Part 5 — Run state
## Co je skutečně provedeno

Práce na textu, ne na plánu. **Šest commitů mělo samotnou práci:**

| Commit | Co se v práci změnilo | Strany |
| :-- | :-- | :-- |
| `d6eccfd6` | vystřiženo pět pasáží; materiál o kontextu přesunut do §2.1.4; přepsána továrna i orchestrace; opravena rozbitá Tabulka 1 | 43 → 42 |
| `55155a11` | zrušeno §3.1.2, otázka o složení vrstev přešla jako třetí omezení do §4.2 | 42 |
| `e9e9a063` | podkapitola §4.2.1 zrušena, tři omezení jako průběžný text v §4.2 | 42 |
| `1730c41d` | zrušen čtyřvrstvový výčet v §3.1 — opakoval §§3.2–3.5 | 42 |
| `0ca2ddea` | odstraněn počet iterací ze všech osmi míst; zůstává následek | 42 → **41** |
| `affe02b5` | přestavěn `PAPER.pdf`, který byl šest commitů pozadu | 41 |

**Zbytek plánu není proveden.** Fáze 1 (čeština), 2 (odkazy na obrázky), 3 (teorie),
4 (praktická část), 5 (závěr), 6 (citace), 7 (anotace a abstrakt), 8 (ověření) — průzkum
je hotový, provedení ne. Žádný z těchto nálezů nebyl aplikován.

## Způsob práce od teď

Rozdělené plánování a provádění. Agent si bere věci, které jsou připravené, ale **každý
zásah do textu se nejdřív potvrdí otázkou těsně před provedením** — ukáže přesnou větu,
 která se mění, a proč. Bez potvrzení se do `paper/pages/` nesahá.

Blokující pořadí: **Q-A** (tři principy jako tři otázky, citovány ke schválení) →
**Q-C** (§4.1 jako tři otázky a tři odpovědi) → **Q-D** (18 „aplikací", jedna po jedné) →
**Q-F** (pátý popisek). Fáze 1, 2, 3 a řezy v §4.2/§4.3 na Q-A nezávisí nesou, takže
se mohou dělat mezitím.

## Služby běžící

- `bun scripts/paper/watch.ts` (pid 88140) — přestavuje `PAPER.pdf` při každé změně zdroje,
  log v `/tmp/opencode/watch.log`.
- `df plugin list|describe|validate` — 9 pluginů, 37 dovedností, 0 chyb. Funkční po
  `1d320be7`; binary byl přestavěn a nainstalován, záloha v
  `/tmp/opencode/dfbin-backup/`.

## Co dál

Q-A, Q-B, Q-C — **zrušeno autorem.** Trojice principů i podmíněné `musí` jsou pryč z celé práce,
§3.1.1 je zrušen, §4.1 odpovídá hlavní otázce v próze (R15, `1615ddf0`).
