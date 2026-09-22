// ─────────────────────────────────────────────────────────────
//  ODBORNÁ PRÁCE — jediný kanonický zdrojový soubor .typ
// ─────────────────────────────────────────────────────────────

#let PISMO = ("Caladea", "New Computer Modern")

#let meta = (
  autor: "Patrik Marius",
  trida: "4.D",
  vedouci: "Michal Dočekal",
  skola: "Gymnázium J. K. Tyla",
  skola-zkratka: "GJKT",
  mesto: "Hradci Králové",
  rok: 2026,
  annotation-cs: [
    Odborná práce zkoumá přechod od vývoje softwaru organizovaného kolem člověka a IDE k agentickému inženýrství, v němž agenti vykonávají významnou část implementace prostřednictvím harnessu. Vymezuje harness jako běhové prostředí, které pro agenta integruje stav, kontext, nástroje, řízené účinky, pozorování, ověřování, obnovu a orchestraci. DarkFactory představuje praktický artefakt tohoto přístupu. Dostupná implementační a CI evidence podporuje vybrané mechanismy řízené autonomie a obnovy, současně však neprokazuje plně bezobslužný produkční vývoj.
  ],
  abstract-en: [
    This thesis examines the transition from software development organized around a human developer and an IDE to Agentic Engineering, in which agents perform substantial implementation work through a harness. It defines the harness as the runtime that integrates state, context, tools, controlled effects, observations, verification, recovery, and orchestration for the agent. DarkFactory is presented as a practical artefact of this architecture. Available implementation and CI evidence supports selected mechanisms of governed autonomy and recovery, but does not establish fully unattended production development.
  ],
)

#let nadpis-bez-cisla(text-nadpisu) = heading(numbering: none, outlined: true, bookmarked: false, text-nadpisu)

#set document(title: "Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory", author: meta.autor)
#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm), footer: none)
#set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
#set par(justify: true, leading: 1.5 * 0.65em, spacing: 16pt, first-line-indent: 1.25cm)
#set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)

#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  pagebreak()
  block(above: 21pt, below: 10pt, sticky: true, text(size: 16pt, weight: "bold", it))
}
#show heading.where(level: 2): it => {
  pagebreak()
  block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))
}
#show heading.where(level: 3): it => block(above: 17pt, below: 8pt, sticky: true, text(size: 12pt, weight: "bold", it))
#show figure.caption: set text(size: 10pt)
#show raw: set text(font: ("DejaVu Sans Mono",), size: 9.5pt)
#show raw.where(block: true): it => block(
  fill: rgb("#f4f4f2"), stroke: 0.35pt + rgb("#9a9a96"), inset: (x: 8pt, y: 6pt), width: 100%,
  text(fill: rgb("#222222"), it),
)
#show raw.where(block: false): it => box(
  fill: rgb("#f4f4f2"), stroke: 0.25pt + rgb("#b0b0aa"), inset: (x: 2pt, y: 0.5pt),
  text(fill: rgb("#222222"), it),
)
#show link: set text(fill: rgb("#222222"))
#show cite: it => super(it)
#set table(stroke: 0.5pt, inset: (x: 5pt, y: 4pt))
#set figure(numbering: "1")

// ── Přední část ──────────────────────────────────────────
#align(center)[
  #v(1cm)
  #text(size: 14pt, weight: "bold", meta.skola)
  #v(0.5cm)
  #image("img/logo.jpeg", width: 3cm)
  #v(1fr)
  #text(size: 24pt, weight: "bold", hyphenate: false)[Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory]
  #v(0.7cm)
  #text(size: 15pt, tracking: 2pt)[ODBORNÁ PRÁCE]
  #v(1fr)
]
#align(left)[
  #grid(columns: (1fr, auto), column-gutter: 1.2em,
    [Autor práce: #meta.autor, #meta.trida],
    [Vedoucí práce: #meta.vedouci],
  )
  #v(0.8cm)
  #align(center)[#text(size: 12pt, str(meta.rok))]
]
#pagebreak()

#nadpis-bez-cisla[Prohlášení]
Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval samostatně pod dohledem vedoucího uvedeného na první straně. Všechny použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby tištěná forma práce byla uchována na #meta.skola a tam používána jako tištěný zdroj např. pro další studentské práce či pro prezentaci vzdělávání na #meta.skola-zkratka.

#v(1.5cm)
V #meta.mesto dne #box(width: 4.5cm, repeat("…")) #h(1fr) Podpis autora práce: #box(width: 4.5cm, repeat("…"))
#pagebreak()

#nadpis-bez-cisla[Anotace]
#meta.annotation-cs
#nadpis-bez-cisla[Abstract]
#meta.abstract-en
#nadpis-bez-cisla[Klíčová slova]
agentní AI; agentické inženýrství; harness; softwarové inženýrství; jazykové modely; DarkFactory

#v(0.8cm)
#text(weight: "bold")[Keywords] \
agentic AI; Agentic Engineering; harness; software engineering; language models; DarkFactory
#pagebreak()

#outline(title: [Obsah], depth: 3, indent: 1.4em)

#set page(footer: context {
  align(center, text(font: PISMO, size: 11pt, counter(page).display("1")))
})

#heading(level: 1)[Úvod]

Software engineering byl po desetiletí organizován kolem člověka, který prostřednictvím integrovaného vývojového prostředí (IDE) prohlíží zdrojový kód, upravuje soubory, spouští nástroje, sleduje výsledky a rozhoduje o integraci změn. IDE proto není pouze editor; je to pracovní prostředí, které soustřeďuje nástroje a zpětnou vazbu kolem lidského vykonavatele vývojové činnosti.

Do tohoto uspořádání vstupovala umělá inteligence postupně. Nejprve doplňovala fragmenty kódu přímo při psaní. Následně se stala konverzačním pomocníkem, který vysvětluje kód, navrhuje opravy a připravuje testy. Současné IDE už nabízejí agentní režimy, v nichž systém rozkládá úlohu, čte soubory, upravuje více částí projektu, spouští příkazy a reaguje na jejich výsledek @github-copilot-completion @github-copilot-chat @github-copilot-agent. Tím se mění velikost delegované práce: od návrhu dalšího fragmentu k provedení ohraničené implementační úlohy.

Další krok představují agent-first a ADE-style nástroje. Úloha, běh, pracovní prostředí, log a revize se v nich stávají primárními jednotkami práce; editor zůstává důležitou lidskou plochou pro zadání, dohled a kontrolu, ale nemusí být místem, kde probíhá každý implementační krok. První-party popisy cloudových coding agentů již výslovně počítají s izolovaným prostředím, samostatným během, prováděním příkazů, testováním a návrhem změny k revizi @openai-codex-2025 @openai-codex-app-2026.

Tato posloupnost není katalogem produktů. Ukazuje architektonický posun: #emph[IDE-centered execution → harness-centered execution]. IDE integrovalo prostředky kolem člověka; harness integruje odpovídající prostředky kolem agenta. V tomto přesném smyslu se harness stává pro agenta tím, čím bylo IDE pro lidského vývojáře. Nejde o tvrzení, že harness je grafické IDE. Jde o tvrzení, že harness je běhové prostředí, v němž agent získává kontext, používá nástroje, vyvolává řízené účinky, přijímá pozorování a pokračuje v práci.

Tento přechod je významný proto, že samotná schopnost modelu generovat kód neřeší kontinuitu úlohy, hranice oprávnění, ověřování ani integraci. Pokud agent vykonává podstatnou část implementace, musí být lidská odpovědnost přesunuta k záměru, požadavkům, architektuře, rozkladu práce, akceptačním podmínkám, dohledu, revizi a odpovědnosti za výsledek. Software engineering tím nezaniká; mění se místo, kde se jeho práce vykonává.

Rozšíření generativní AI je přitom širší než rozšíření agentního vývoje. Odhad Gradually ukazuje, že pravidelní uživatelé AI coding agents tvoří jen malou část světové populace, vedle uživatelů základních asistentů a lidí bez vědomého kontaktu s generativní AI @gradually-ai-usage-2026. Obrázek proto slouží pouze jako kontext pro motivaci: agentní vývoj je specifická a náročnější forma delegování, nikoli synonymum pro běžné používání generativní AI.

#figure(
  image("img/generated/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení světové populace podle nejpokročilejší používané kategorie generativní AI v srpnu 2026. Kategorie pravidelných uživatelů AI coding agents představuje podle Gradually přibližně 25 až 35 milionů lidí; viz zdroj @gradually-ai-usage-2026.],
) <fig-gradually-usage>

#heading(level: 2)[Cíl, otázky a vymezení práce]

Cílem práce je objasnit přechod k Agentic Engineering, vymezit architektonickou roli harnessu v tomto přechodu a posoudit, které z těchto vlastností realizuje systém DarkFactory @darkfactory. Práce neslibuje obecný benchmark produktivity ani důkaz, že agent nahradí lidské rozhodování. Zkoumá především organizaci provádění, kontrolu účinků, kontinuitu a ověřitelnost.

Výzkumné otázky jsou:

- *O1:* Jak se mění rozdělení odpovědností a architektura provádění, když agent vykonává významnou část implementace místo člověka pracujícího přímo v IDE?
- *O2:* Jaké funkce musí harness integrovat, aby taková delegace zůstala stavová, řízená, pozorovatelná, ověřitelná a obnovitelná?
- *O3:* Které z těchto vlastností jsou doloženy dostupnou implementační a CI evidencí systému DarkFactory a jaké hranice má toto doložení?

#pagebreak(weak: true)
#heading(level: 2)[Metodika]

Práce kombinuje literární a technickou rešerši, omezenou historickou syntézu vývoje vývojových nástrojů a konstrukci i analýzu softwarového artefaktu. DSRM poskytuje užitečný stručný rámec pro rozlišení problému, návrhu artefaktu a jeho vyhodnocení @hevner2004designscience @peffers2007dsrm; nenahrazuje však popis konkrétní implementace.

Teoretická část vychází z odborné literatury o Transformeru, agentních smyčkách a dlouhém kontextu a z first-party dokumentace nástrojů, které ilustrují historický posun. Praktická část vymezuje DarkFactory jako sledovaný artefakt. Výsledky pracují s dostupnými testy, CI běhy, revizemi a dokumentovanými omezeními. Protože tato fáze ještě nepřepisuje důkazy proti nově pinované implementaci, jsou výsledky označeny jako evidence dostupného snapshotu, nikoli jako obecný důkaz agentního vývoje.

#heading(level: 1)[Teoretická část]

Teorie sleduje jednu hranici: model vytváří návrh dalšího kroku, zatímco runtime zajišťuje, aby tento návrh získal kontext, mohl vyvolat účinek, obdržel pozorování a podléhal kontrole. Z této hranice vyplývá jak definice harnessu, tak změna organizace software engineering.

#heading(level: 2)[Jazykový model v agentním systému]

Velký jazykový model je parametrický model, který z kontextu predikuje další tokeny; moderní systémy často používají autoregresivní Transformer @brown2020 @vaswani2017. Pro tuto práci není důležitý výklad všech vnitřních vrstev, ale důsledek inference: model pracuje s aktivním kontextem konkrétního běhu a jeho výstup je návrh, nikoli sám o sobě provedený účinek.

Vektorové reprezentace (*embeddingy*) mohou zachycovat sémantické vztahy geometricky; klasickým příkladem je vztah mezi vektory slov *king* a *queen* @mikolov2013linguistic.

#figure(
  image("img/vector-embedding-queen.svg", width: 78%),
  caption: [Jednoduchá ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *king* a *queen* podle principu popsaného v @mikolov2013linguistic.],
) <fig-embedding-queen>

Kontext může obsahovat instrukce, stav úlohy, obsah souborů, historii nástrojů i pozorování. Jeho rozsah však není totéž co projektová paměť. Výzkum dlouhého kontextu ukazuje, že schopnost využít informaci se mění podle jejího umístění v kontextu @liu2024. Trvalý stav, historie a výběr relevantního kontextu proto musí být spravovány mimo model. Z toho plyne hranice odpovědnosti: model navrhuje další krok; okolní runtime rozhoduje, co model uvidí, co smí vykonat a jak bude výsledek zaznamenán.

#heading(level: 2)[Harness jako vývojový runtime]

Harness je běhové prostředí agentního vývoje. Udržuje aktivní běh a jeho stav, skládá kontext, poskytuje nástroje, zprostředkovává prostředí, kontroluje účinky, zaznamenává pozorování, spouští ověřování a řídí pokračování, přerušení, obnovu a případnou orchestraci @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 3)[Agentní smyčka a ReAct]

V agentní smyčce model na základě kontextu navrhne další akci, harness ji validuje a vykoná v prostředí a výsledek vrátí jako pozorování. Tento cyklus odpovídá principu ReAct, v němž se uvažování a jednání střídají s pozorováním prostředí @yao2022. Diagram zdůrazňuje, že model není totožný s celou smyčkou: kontrola přechodu od záměru k účinku patří runtime.

#figure(
  image("img/react-loop.svg", width: 92%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku; princip podle @yao2022.],
) <fig-react-loop>

#heading(level: 3)[Kontinuita, účinky a ověřování]

Pro dlouhotrvající práci musí harness oddělit alespoň aktivní kontext od trvalého stavu a přepisu událostí. Stav může zachytit fázi úlohy, schválený rozsah, pracovní strom a dílčí výsledky; přepis zachycuje průběh. Aktivní kontext je pouze výběr potřebný pro další rozhodnutí. Tato separace umožňuje obnovu po přerušení, aniž by se celý běh musel znovu rekonstruovat z poslední zprávy modelu @openai-agents-sessions @openai-agents-run-state.

Nástroje a prostředí tvoří hranici mezi záměrem a účinkem. Harness může požadavek na čtení souboru, editaci, příkaz nebo test validovat proti schématu, oprávnění a rozpočtu; teprve potom jej provede a uloží výsledek. Kompilátor, test nebo kontrola CI pak poskytují pozorování založené na skutečném běhu, nikoli pouze na přesvědčivosti textu modelu @anthropic2024tooluse @openai-agents-sandbox. Izolace, schvalování a řízení oprávnění tuto hranici dále zpřesňují.

#pagebreak(weak: true)
#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství není katalog komponent ani soubor názvů pro specifikaci, Git, kontext a CI. Je to software engineering reorganizovaný kolem agentů jako primárních vykonavatelů implementační práce. Jeho předmětem proto zůstávají stejné inženýrské závazky — správnost, údržba, bezpečnost, integrace a odpovědnost — ale jejich provedení se rozděluje jinak.

Člověk stále vlastní záměr, požadavky a omezení, architekturu, rozklad práce, akceptační podmínky, dohled, revizi, integraci a odpovědnost za výsledek. Agent v rámci delegovaného rozsahu provádí inspekci repozitáře, plánování, úpravy, volání nástrojů, pozorování výsledků, korekce a přípravu změny k integraci. Specifikace, izolace změn, řízení kontextu, validace, revize a orchestrace jsou mechanismy, jimiž se toto rozdělení stává řiditelným.

Praktickým důsledkem je změna jednotky práce. Člověk nemusí ručně provést každý editovací krok, ale musí být schopen zadat práci tak, aby měla hranice, ověřitelné přijetí a dohledatelný výsledek. Harness tuto odpovědnost podporuje: poskytuje runtime pro agenta, zatímco IDE nebo jiná aplikace může zůstat lidskou plochou pro zadání, sledování a revizi. Orchestrace více běhů má smysl jen tam, kde je vlastnictví změn oddělitelné a existuje společná integrační brána; paralelní generování bez této podmínky pouze přesouvá konflikt do pozdější fáze @openai-agent-orchestration @github-branches @github-pull-requests.

#heading(level: 1)[Praktická část]

#heading(level: 2)[DarkFactory]

#heading(level: 1)[Výsledky a diskuse]

Dostupná evidence pochází ze staršího identifikovaného snapshotu DarkFactory a z navazujících CI běhů. Výsledky proto nejprve uvádějí pozorování, potom jejich interpretaci a nakonec omezení. Nejde o obnovené vyhodnocení nové revize.

#heading(level: 2)[Pozorování z dostupné evidence]

Evidence uvádí DarkFactory na commitu `e9c10221b40589512d262a0edb95f709b923150c` a odpovídajícím CI běhu `35616745304` @darkfactory-e9c10221 @darkfactory-ci-35616745304. V tomto běhu bylo podle dostupného záznamu úspěšných všech 15 jobů a 670 testů ve 102 souborech. Testy se týkaly mimo jiné serializace Run State, stale plánu, přepnutí poskytovatele, odvození stavu pracovního stromu, rozsahu oprávnění a původu obnoveného stavu.

Navazující evidence uvádí úspěšné pipeline na repozitářích `omnis` (commit `a53660a1`, run `34708160162`), `ChessWithQuests` (commit `50a50797`, run `34708180783`) a této práce (commit `5bc04974`, run `35617820423`) @omnis-a53660a1 @omnis-ci-34708160162 @chesswithquests-50a50797 @chesswithquests-ci-34708180783 @darkfactory-paper-5bc04974 @darkfactory-paper-ci-35617820423. U archivovaných repozitářů nelze z jejich stavu vyvozovat současnou provozní přenositelnost.

#heading(level: 2)[Interpretace vzhledem k otázkám]

Pro *O1* evidence podporuje interpretaci, že agentní práci lze ohraničit kombinací stavu úlohy, oprávnění, izolace změn, automatických kontrol a integrační brány. Tato evidence však neporovnává takový proces s lidským vývojem a neprokazuje optimální řešení modelu.

Pro *O2* dostupné testy podporují existenci mechanismů pro zachycení stavu a vybrané scénáře přerušení nebo změny poskytovatele. Lze proto hovořit o ověřené obnovitelnosti testovaných scénářů, nikoli o univerzální odolnosti vůči každému distribuovanému selhání.

Pro *O3* evidence podporuje oddělení Run State a generovaných promptů. To odpovídá teoretické potřebě udržovat projektový stav mimo aktivní kontext. Samotná evidence však neměří kvalitu výběru kontextu, míru vynechaných závislostí ani dopad na produktivitu.

#heading(level: 2)[Omezení]

Současný materiál neobsahuje plně automatizovaný živý průchod od schválení požadavku přes implementaci až po merge a produkční rekonciliaci; tato mezera byla v dostupném snapshotu vedena jako otevřené akceptační kritérium @darkfactory-request-359. Neobsahuje ani statistický benchmark produktivity, nákladů nebo chybovosti proti lidským programátorům. Výsledky tedy podporují tvrzení o existenci a testování vybraných mechanismů, nikoli obecné tvrzení o samostatném vývoji komplexního softwaru.

#heading(level: 1)[Závěr]

Práce vymezila přechod od IDE-centered execution k harness-centered execution jako architektonickou změnu v software engineering. Když agent vykonává významnou část implementace, harness přebírá integrační roli, kterou IDE plnilo kolem lidského vývojáře: spojuje kontext, stav, nástroje, prostředí, pozorování, ověřování, obnovu a orchestraci. Agentické inženýrství je v tomto pojetí software engineering organizovaný kolem agentů jako primárních vykonavatelů implementace, přičemž člověk si ponechává záměr, hranice, revizi a odpovědnost.

DarkFactory je konkrétní artefakt, na němž lze tuto architekturu zkoumat. Dostupná starší evidence podporuje vybrané mechanismy řízené autonomie, persistence a obnovy v testovaných scénářích. Nepodporuje však závěr o plně bezobslužném produkčním vývoji; takový závěr vyžaduje další fázi založenou na jediné pinované revizi, reprodukovatelném manifestu a aktuálních důkazech z implementace.

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("bib/references.bib", style: "iso-690-numeric", title: none)

#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
