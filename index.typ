// ─────────────────────────────────────────────────────────────
//  ODBORNÁ PRÁCE — jediný kanonický zdrojový soubor .typ
// ─────────────────────────────────────────────────────────────


#let nadpis-bez-cisla(text-nadpisu) = heading(numbering: none, outlined: true, bookmarked: false, text-nadpisu)

#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm), footer: none)
#set par(justify: true, leading: 1.5 * 0.65em, spacing: 8pt, first-line-indent: 0pt)
#set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)

#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  if it.at("label", default: none) != <results-section> {
    pagebreak(weak: true)
  }
  block(above: 21pt, below: 10pt, sticky: true, text(size: 16pt, weight: "bold", it))
}
#show heading.where(level: 2): it => {
  if it.at("label", default: none) not in (<intro-goal>, <theory-first>, <practical-first>, <results-first>) {
    pagebreak()
  }
  block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))
}
#show heading.where(level: 3): it => block(above: 17pt, below: 8pt, sticky: true, text(size: 12pt, weight: "bold", it))
#show figure.caption: set text(size: 10pt)
#show figure.caption: set align(left)
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
#set table(stroke: 0.5pt, inset: (x: 5pt, y: 4pt))
#set figure(numbering: "1")


//Metadata
#let PISMO = ("Caladea", "New Computer Modern")

#let meta = (
  author: "Patrik Marius",
  class: "4.D",
  supervisor: "Michal Dočekal",
  school: "Gymnázium J. K. Tyla",
  school-short: "GJKT",
  city: "Hradci Králové",
  year: 2026,

  title: "Praktický dopad AI na softwarové inženýrství - AI agenti a agentické inženýrství",
  practical-title: "DarkFactory: Pipeline pro automatizované AI-asistované softwarové inženýrství",

  annotation-cs: [
    Práce zkoumá přechod od konverzační asistence k delegovanému agentnímu vývoji a roli harnessu jako běhového a integračního prostředí coding agenta. Cílem je vysvětlit, jak propojení jazykového modelu s nástroji, stavem, verifikací a lidskými kontrolními body umožňuje řízené provádění softwarových úloh v praxi. Agentické inženýrství práce vymezuje jako soubor postupů, které činí AI-asistovaný vývoj účinným, kontrolovaným, opakovatelným a škálovatelným. Teoretická část vychází z odborných publikací a dokumentace nástrojů. Praktická část analyzuje systém DarkFactory prostřednictvím statické inspekce workflow, runneru, kontejnerového prostředí, deklarativního grafu a testů v přesně určené revizi `e9c10221`. Analýza dokládá fázované řízení požadavku, schvalovací brány, izolaci změn, deterministickou verifikaci, seberevizi, ukládání checkpointů a obnovu přerušeného běhu. Výsledky ukazují, že praktická autonomie nevzniká pouze schopnostmi modelu, ale především návrhem harnessu a přesným rozdělením odpovědnosti mezi deterministické mechanismy a lidské rozhodování. Dostupná evidence však neměří kvalitu práce různých modelů ani provozní úspěšnost systému. Závěry jsou proto omezeny na strukturální vlastnosti této jediné reprodukovatelně pinované revize.
  ],
  abstract-en: [
    This thesis examines the transition from conversational assistance to delegated agentic software development and the role of the harness as a coding agent's execution and integration environment. Its objective is to explain how connecting a language model to tools, persistent state, verification, and human control points enables governed execution of software tasks. Agentic Engineering is defined as the set of practices that makes AI-assisted development effective, controlled, repeatable, and scalable. The theoretical part draws on research literature and first-party tool documentation. The practical part analyses DarkFactory through static inspection of the workflow, runner, container environment, declarative graph, and tests at the exact `e9c10221` revision. The analysis identifies staged request handling, approval gates, change isolation, deterministic verification, self-review, checkpoint persistence, and interrupted-run recovery. The findings indicate that practical autonomy does not arise from model capability alone, but primarily from harness design and an explicit division of responsibility between deterministic mechanisms and human decisions. The evidence does not measure model quality or operational success rates. The conclusions are therefore limited to structural properties of this single reproducibly pinned revision.
  ],
)

#set document(title: meta.title, author: meta.author, date: none)
#set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)

// ── title page ──────────────────────────────────────────
#align(center)[
  #set par(justify: false)
  #v(1cm)
  #text(size: 14pt, weight: "bold", meta.school)
  #v(0.5cm)
  #image("img/logo.jpeg", width: 3cm)
  #v(1fr)
  #text(size: 24pt, weight: "bold", hyphenate: false)[#meta.title]
  #v(0.7cm)
  #text(size: 15pt, tracking: 2pt)[ODBORNÁ PRÁCE]
  #v(1fr)
]
#align(left)[
  #grid(columns: (1fr, auto), column-gutter: 1.2em,
    [Autor práce: #meta.author, #meta.class],
    [Vedoucí práce: #meta.supervisor],
  )
  #v(0.8cm)
  #align(center)[#text(size: 12pt, str(meta.year))]
]

// ── prohlášení o samostatnosti ─────────────────────────
#nadpis-bez-cisla[Prohlášení]
Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval samostatně pod dohledem vedoucího uvedeného na první straně. Všechny použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby tištěná forma práce byla uchována na #meta.school a tam používána jako tištěný zdroj např. pro další studentské práce či pro prezentaci vzdělávání na #meta.school-short.

#v(1.5cm)
V #meta.city dne #box(width: 4.5cm, repeat("…")) #h(1fr) Podpis autora práce: #box(width: 4.5cm, repeat("…"))


//keywords
#pagebreak(weak: true)
#block(breakable: false)[
  #block(above: 21pt, below: 10pt, text(size: 16pt, weight: "bold")[Anotace])
  #meta.annotation-cs

  #v(0.6em)
  #strong[Klíčová slova:] jazykové modely; coding agents; harness; Agentické inženýrství; GitHub Actions; DarkFactory

  #v(1.8em)
  #block(above: 0pt, below: 8pt, text(size: 14pt, weight: "bold")[Abstract])
  #meta.abstract-en

  #v(0.6em)
  #strong[Keywords:] language models; coding agents; harness; Agentic Engineering; GitHub Actions; DarkFactory
]

#outline(title: [Obsah], depth: 3, indent: 1.4em)

#set page(footer: context {
  align(center, text(font: PISMO, size: 11pt, counter(page).display("1")))
})

//intro
#heading(level: 1)[Úvod]

Nástroje založené na velkých jazykových modelech prošly rychlým vývojem: od doplňování kódu při psaní přes konverzační chatboty až po autonomní agenty, kteří pomocí nástrojů samostatně provádějí změny a spouštějí příkazy v běhovém prostředí @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. S rostoucími schopnostmi modelů roste i jejich adopce, avšak pravidelné využívání plnohodnotných agentických systémů zůstává omezeno na přibližně 0,36~% světové populace @gradually-ai-usage-2026.

Odhad zastoupení jednotlivých kategorií uživatelů shrnuje @fig-gradually-usage.

#figure(
  image("img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI. Pravidelní uživatelé agentů pro tvorbu kódu tvoří přibližně 0,36~% světové populace, tedy zhruba 30 milionů lidí @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění testů a CI, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak harness dělá z jazykového modelu autonomního agenta a jaké postupy umožňují využívat agenty účinně a kontrolovaně.

Praktická část analyzuje DarkFactory, na poskytovateli nezávislou pipeline pro AI-asistovaný softwarový vývoj. Hodnocená revize kombinuje workflow GitHub Actions, kontejnerizovaný pythonovský řadič a harness `df` s deklarativním grafovým jádrem v TypeScriptu.

#heading(level: 1)[Teoretická část]

#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Jazykový model (#strong[LLM]) předpovídá další token na základě #strong[kontextu]. #strong[Transformer] zpracovává vztahy mezi nimi pomocí mechanismu attention @vaswani2017 @brown2020. Při inferenci model zpracuje obsah kontextového okna a vytvoří posloupnost výstupních tokenů. Jednotlivé volání však samo nevybírá další kontext, nemění soubory, nespouští příkazy ani neuchovává stav mezi kroky. Tyto činnosti zajišťuje harness, který modelu zpřístupňuje nástroje a jejich výsledky vrací do dalšího kroku @anthropic2024tooluse.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov král, královna, muž a žena @mikolov2013linguistic. Tento vztah schematicky znázorňuje @fig-embedding-queen.

#figure(
  image("img/vector-embedding-queen.svg", width: 78%),
  caption: [Ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *král, královna, muž a žena* @mikolov2013linguistic.],
) <fig-embedding-queen>

#heading(level: 3)[Context window a kompakce]

#strong[Kontextové okno] (*context window*) tvoří pracovní kontext jednoho volání modelu. Může obsahovat instrukce, části repozitáře, historii volání nástrojů i výsledky předchozích kroků. Jeho kapacita však sama o sobě nezaručuje, že model všechny podstatné informace správně využije: úspěšnost jejich vybavení závisí také na umístění v kontextu a může s rostoucí délkou vstupu klesat @liu2024. Toto postupné zhoršování práce s nahromaděným kontextem se označuje jako #strong[context rot] @anthropic-context-engineering.

Kompakce po překročení stanoveného limitu nahrazuje starší průběh strukturovaným souhrnem klíčových rozhodnutí a dosažených výsledků. Do dalšího volání tak není nutné vkládat celý přepis předchozí interakce @anthropic-context-engineering.

#heading(level: 2)[Agent a harness]
Zásadní rozdíl mezi konverzačním chatbotem a autonomním agentem nespočívá v architektuře použitého modelu, nýbrž v míře delegace provádění. Chatbot setrvává v roli externího rádce: uživatel musí manuálně kopírovat úryvky kódu, dodávat kontext a spouštět navržené příkazy. Agent naproti tomu prostřednictvím harnessu získává přímý přístup k nástrojům repozitáře. Sám prochází souborovou strukturu, upravuje kód, spouští testy a na základě chybových výstupů samostatně koriguje své změny @anthropic2024tooluse @openai-agents-sandbox. Tento posun transformuje roli člověka z přímého vykonavatele na dohlížejícího architekta.

#heading(level: 3)[Smyčka]

Základním mechanismem agentického systému je iterativní řídicí smyčka. Na rozdíl od jednorázové generace odpovědi u chatbota probíhá interakce v cyklu podle vzoru #strong[ReAct] (*Reasoning and Acting*) @yao2022. Model v každém kroku analyzuje aktuální stav kontextu, zformuluje vnitřní uvažování a navrhne konkrétní volání nástroje ve formě strukturovaného požadavku. Harness tuto akci provede v prostředí projektu, zachytí výsledek a vrátí jej modelu jako nové pozorování. Smyčka pokračuje, dokud model nedosáhne cíle nebo nenarazí na bezpečnostní limit kroků či tokenů; její průběh znázorňuje @fig-react-loop.

#figure(
  image("img/react-loop.svg", width: 75%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku; princip podle @yao2022.],
) <fig-react-loop>

#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství (#strong[Agentic Engineering]) představuje systematický návrh podmínek, v nichž může jazykový model vykonávat inženýrské úlohy účinně, kontrolovaně, opakovatelně a v souladu s pravidly projektu @anthropic-harness-design @anthropic-managed-agents.
Zahrnuje dekompozici úloh, přesné ohraničení kontextu, konstrukci nástrojových rozhraní, verifikační zpětnou vazbu a mechanismy řízené integrace.

#heading(level: 3)[Zadání a kontext]

Spolehlivé delegování práce začíná explicitním vymezením cíle, rozsahu, omezení a podmínek přijetí. Specifikace popisuje nejen požadovaný výsledek, ale také části systému, které se měnit nemají, a způsob, jakým bude výsledek ověřen. Tento přístup, označovaný jako #strong[spec-first] nebo *spec-driven development*, dává agentovi před implementací měřitelné hranice a člověku podklad pro posouzení výsledku.

#strong[Prompt engineering] se soustředí na formulaci instrukcí, omezení, příkladů a očekávaného výstupu konkrétního inferenčního kroku. #strong[Context engineering] řeší širší a průběžný výběr, uspořádání, obnovování a kompakci informací, které má model v daném kroku k dispozici @openai-prompt-engineering @anthropic-context-engineering. Projektová pravidla a validační příkazy lze uchovat přímo v repozitáři například ve standardizovaném souboru `AGENTS.md`, takže je harness může připojit k relevantní úloze @agents-md.

Specifikace a kontext se promítají do provádění prostřednictvím schopností harnessu. #strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět příkazy; #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy @agentskills-spec. #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit deterministickou kontrolu @openai-agents-lifecycle. #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification. Nejde o samostatné agenty, ale o řízené části runtime, jejichž výběr, oprávnění a výstupy určují, co může agent skutečně provést a ověřit.

Po každé akci harness vrací agentovi pozorování, například výsledek testu, překladače nebo stav pracovního stromu. Agent podle něj upraví další krok a pokračuje, dokud nesplní podmínky přijetí nebo nenarazí na stanovený limit.

#heading(level: 3)[Orchestrace a lidská integrace]

Rozsáhlou úlohu lze rozdělit do více agentních běhů, pokud mají podúlohy jasné hranice a jejich výsledky lze znovu integrovat. Ve vzoru #strong[coordinator/subagent] koordinátor deleguje dílčí úkol specializovanému subagentovi s vlastním kontextem a přebírá jeho výsledek. Nezávislé podúlohy mohou zpracovat #strong[paralelní pracovníci], zatímco #strong[workflow graph] předem určuje závislosti, pořadí a větvení fází @openai-agent-orchestration. #strong[Agent Swarm] v systému Kimi K2.5 dynamicky rozkládá úlohu na heterogenní podproblémy a spouští specializované agenty paralelně pod řízením orchestrátoru @kimi-k25-swarm.

Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy, když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdíleného stavu a integračních kontrol.

#strong[Goal loop] tvoří nadřazenou řídicí smyčku vůči jednotlivým cyklům agentní smyčky: když model ve standardní smyčce ReAct označí svůj krok za dokončený, harness porovná dosažený stav s cílem a podmínkami přijetí a rozhodne, zda běh ukončit, nebo úlohu vrátit agentovi k další iteraci či změně strategie @yao2022 @anthropic-harness-design.

Princip #strong[human-in-the-loop] (#strong[HITL]) doplňuje automatizované smyčky o kontrolní brány, v nichž je vyžadováno explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak nadále odpovídá za záměr, architekturu a integraci, zatímco agent provádí ohraničenou implementační práci. Začlenění změn do hlavní větve vyžaduje vedle technického ověření v CI také lidskou revizi a převzetí odpovědnosti za výsledek @github-branches @github-pull-requests.

#pagebreak(weak: true)
#align(center)[
  #set par(justify: false)
  #v(1fr)
  #text(size: 15pt, tracking: 2pt)[PRAKTICKÁ ČÁST]
  #v(0.8cm)
  #text(size: 24pt, weight: "bold", hyphenate: false)[DarkFactory:]
  #v(0.5cm)
  #text(size: 20pt, weight: "bold", hyphenate: false)[Pipeline pro automatizované]
  #v(0.15cm)
  #text(size: 20pt, weight: "bold", hyphenate: false)[AI-asistované softwarové inženýrství]
  #v(1fr)
]
#pagebreak(weak: true)

#heading(level: 1)[Praktická část]

#heading(level: 2)[Metodika] <practical-first>

Praktická část navazuje na teoretická východiska o harnessu a Agentickém inženýrství. Zkoumá, jak jsou principy řízeného provádění, ohraničení kontextu a verifikace realizovány ve zdrojovém kódu DarkFactory. Jediným referenčním bodem je commit `e9c10221b40589512d262a0edb95f709b923150c`; submodul, evidenční manifest i všechny praktické citace odkazují na tuto revizi @darkfactory-e9c10221.

Analýza se zaměřuje na čtyři klíčové inženýrské dimenze odvozené z teoretické části:
1. *Izolace běhového prostředí a oprávnění:* mechanismus hermetického oddělení agenta od hostitelského CI systému, montování pracovního stromu repozitáře a injektování autentizačních tajemství s minimálními právy.
2. *Dekompozice úlohy a fázované řízení (HITL):* rozdělení životního cyklu požadavku do diskrétních stavů (interpretace, plánování, implementace) a začlenění formálních schvalovacích bran člověkem.
3. *Deterministická verifikace a seberevize:* integrace automatizovaných nástrojů (lintery, testovací frameworky), záchyt chybových kódů v samoopravné smyčce a auditování vygenerovaného diffu vůči schválenému plánu.
4. *Perzistence stavu a zotavení:* serializace parametrů běhu (checkpointing), záchyt výpadků kvót externích API (HTTP 429) a procedura obnovení rozpracované úlohy příkazem /resume.

Metodou je trasovatelná statická inspekce workflow `.github/workflows/agent.yml`, obrazu `docker/Dockerfile.agent`, produkčního řadiče `.github/scripts/agent_runner.py`, grafu `harness/assets/graph.darkfactory.json`, jeho ukládání stavu v `harness/src/graph/run-state.ts` a souvisejících testů. Zjištění popisují mechanismy, které jsou v revizi přítomné a testované; nepředstavují měření provozní úspěšnosti ani srovnání kvality modelů.

Revize obsahuje dvě související, ale nezaměnitelné vrstvy orchestrace. Produkční workflow vstupuje do pythonovského řadiče, který volá příkaz `df run`. Vedle něj je v repozitáři deklarativní grafové jádro v TypeScriptu s uzly, hranami, bezpečnostními rozpočty smyček a atomicky ukládaným stavem `.df`. Práce proto neprezentuje grafové jádro jako vstupní bod produkčního workflow, ale hodnotí jej jako samostatnou architektonickou součást stejného snapshotu @darkfactory-e9c10221.

#heading(level: 2)[DarkFactory]

DarkFactory představuje automatizovanou pipeline běžící v prostředí GitHub Actions. Workflow spouští kontejner Docker, v němž pythonovský runner připraví prostředí, předá harnessu instrukce a zpracuje výsledek jeho běhu @darkfactory-e9c10221.

Produkční průchod požadavku shrnuje @fig-darkfactory-pipeline a vztah workflow, řadiče, harnessu a odděleného grafového jádra znázorňuje @fig-darkfactory-architecture.

#figure(
  image("img/darkfactory-pipeline.svg", width: 92%),
  caption: [Produkční průchod požadavku v hodnocené revizi DarkFactory `e9c10221`: lidské brány oddělují interpretaci, plán a integraci výsledku @darkfactory-e9c10221.],
) <fig-darkfactory-pipeline>

#figure(
  image("img/darkfactory-architecture.svg", width: 92%),
  caption: [Architektonické vrstvy hodnocené revize: produkční GitHub Actions/Python cesta používá harness `df`; deklarativní grafové jádro v TypeScriptu je v témže snapshotu přítomno jako samostatná komponenta @darkfactory-e9c10221.],
) <fig-darkfactory-architecture>

#heading(level: 3)[Spuštění a kontejnerizované prostředí]

Celý životní cyklus úlohy je vázán na webhooky repozitáře. Pipeline je spouštěna událostmi otevření issue nebo přidání komentáře (`issues.opened`, `issue_comment.created`). Úvodní krok workflow v GitHub Actions nejprve ověřuje oprávnění autora události — odmítá vstupy generované automatickými boty a vyžaduje oprávnění k zápisu do repozitáře.

Po validaci vstupu workflow sestaví izolovaný obraz Docker na základě předpisu `docker/Dockerfile.agent`. Tento obraz obsahuje základní systémové nástroje, interpret jazyka Python, verzovací systém git a potřebné vývojové knihovny. Pracovní kopie repozitáře je do kontejneru připojena jako dedikovaný svazek (volume mount). Tím je zaručeno, že agent pracuje výhradně nad ohraničeným pracovním stromem a nemá přímý přístup k hostitelskému systému CI runneru. Přístupové tokeny GitHub API i klíče k externím modelům jsou injektovány do kontejneru jako přísně ohraničené proměnné prostředí s minimálními nezbytnými oprávněními @darkfactory-e9c10221.

#heading(level: 3)[Fázovaný průchod a řídicí smyčka]

Řízení úlohy v kontejneru přebírá skript `agent_runner.py`. Průchod není realizován jako jediná dlouhá interakce, nýbrž je rozdělen do fází oddělených kontrolními branami:

- *Fáze interpretace:* Runner načte text issue a předloží jej modelu se systémovou instrukcí pro dekompozici problému. Model zformuluje pochopení úlohy a navrhne akceptační kritéria. Runner výsledek zapíše jako komentář k issue a ukončí běh, čímž vyčká na schválení člověkem.
- *Fáze plánování:* Po explicitním schválení interpretace je workflow spuštěno znovu. Model analyzuje strukturu repozitáře a sestaví konkrétní plán úprav — specifikuje seznam souborů určených ke změně a předpokládaný sled kroků. Tento plán je opět předložen člověku ke schválení.
- *Implementační smyčka a verifikace:* Teprve po schválení plánu runner vytvoří dedikovanou pracovní větev, aby nezasahoval do hlavní vývojové větve. Harness následně model navádí k úpravě kódu. Po dokončení úprav runner automaticky spustí deterministické ověřovací nástroje: linter a sadu jednotkových testů. V případě detekce syntaktické chyby či pádu testu má agent k dispozici přesný chybový výstup a jeden vyhrazený krok na samoopravu.
- *Seberevize a draft pull request:* Jakmile testy projdou, runner vytvoří commit, odešle větev na vzdálený server a otevře draft pull request. Následně proběhne fáze seberevize: runner vygeneruje diff mezi pracovní větví a výchozím stavem a porovná změněné soubory se schváleným rozsahem plánu. Pokud model či kontrolní skript odhalí změny mimo povolený rozsah, vyžádá se náprava. Při shodě je pull request označen jako připravený k lidské revizi @darkfactory-e9c10221.

#heading(level: 3)[Serializace stavu, checkpointing a obnova]

V distribuovaném prostředí automatizovaných pipeline představují limity zdrojů (GitHub Actions timeout, kvóty externích poskytovatelů LLM či síťové výpadky) zásadní výzvu pro spolehlivost. DarkFactory tento problém řeší explicitní serializací stavu běhu (checkpointing).

Během agentních fází runner ukládá strukturovaný checkpoint s identifikátorem požadavku, větví a přehledem dokončených kroků. Při vyčerpání kvóty uchová stav, označí úlohu jako blokovanou a vypočte možnost obnovení; plánovaný sweep nebo příkaz `/resume` následně znovu odešle běh. Grafové jádro odděleně ukládá aktuální uzel a výstupy atomickou náhradou souboru `.df`. Oba mechanismy v hodnocené revizi zajišťují perzistenci, nelze je však vydávat za jeden společný formát stavu @darkfactory-e9c10221.

#heading(level: 1)[Výsledky a diskuse] <results-section>

#heading(level: 2)[Zjištění] <results-first>

Pipeline organizuje průchod požadavku jako sled událostí v repozitáři. Po vytvoření issue runner vygeneruje interpretaci zadání; její schválení uživatelem iniciuje tvorbu plánu a teprve další schválení zahájí samotnou implementaci. Dvě schvalovací brány tak oddělují porozumění požadavku a plánování od samotných úprav zdrojového kódu @darkfactory-e9c10221.

Workflow před spuštěním ověřuje, zda je agent pro daný repozitář povolen, a ignoruje komentáře vytvořené automatickými boty. Autentizační tokeny jsou předány z prostředí GitHub Actions a pracovní strom projektu je připojen do kontejneru, v němž běží pythonovský runner @darkfactory-e9c10221.

Po schválení plánu pipeline vytvoří pracovní větev a předá implementační instrukci harnessu. Runner spustí formátovací a testovací nástroje; při neúspěchu testů provede opravný krok. Poté vytvoří commit, odešle větev a otevře draft pull request. Seberevize porovná změněné soubory s rozsahem plánu; pokud detekuje nežádoucí úpravy mimo schválený rozsah, iniciuje opravu a novou revizi. Jestliže seberevize nenajde nesoulad, pipeline označí pull request jako připravený k lidské revizi @darkfactory-e9c10221.

Inspekce testovací sady ukazuje pokrytí invariantů kolem ukládání stavu, plánování grafu, detekce odchylek a předávání chybového výstupu do opravného kroku. Přítomnost těchto testů dokládá záměr deterministicky ověřovat řídicí mechanismy; sama o sobě však neprokazuje, že model vždy odstraní lokální regresi bez lidského zásahu @darkfactory-e9c10221.

Runner ukládá checkpoint pro spolehlivé navázání rozpracovaného běhu. Při vyčerpání kvóty uchová stav, označí běh jako blokovaný a umožní jeho pokračování příkazem /resume. Testy pokrývají serializaci stavu, obnovení pipeline, přepnutí poskytovatele modelu i kontrolu přístupových oprávnění @darkfactory-e9c10221.

#heading(level: 2)[Diskuse]

Pinovaný snapshot dokládá mechanismy trvalého stavu, oprávnění, izolace změn, automatických kontrol a obnovy. Neměří však účinnost jednotlivých postupů Agentického inženýrství, kvalitu práce s kontextem ani provozní úspěšnost orchestrace. Následující interpretace jsou proto omezeny na strukturální vlastnosti revize `e9c10221`.

#strong[Dělba odpovědnosti mezi modelem a harnessem.]
Jazykový model sám o sobě postrádá pojem o čase, kauzalitě i stavu vývojového prostředí; funguje jako stochastický generátor návrhů. Výsledky ukazují, že skutečnou páteř autonomního systému tvoří deterministický harness — v tomto případě GitHub Actions workflow a pythonovský runner. Právě harness zodpovídá za přípravu izolovaného prostředí, vynucování kroků, orámování kontextu a interpretaci návratových kódů. Model tedy nepředstavuje samostatnou autonomní entitu, nýbrž výpočetní modul zasazený do přísně strukturovaného algoritmického rámce @anthropic-harness-design.

#strong[Architektonický kompromis: Autonomie vs. správa.]
DarkFactory volí konzervativní architekturu se čtyřmi kontrolními branami — dvěma lidskými (schválení interpretace a plánu) a dvěma automatizovanými (testy a audit diffu). Tento přístup eliminuje nejčastější rizika nekontrolovaných agentů: drift zadání, neautorizované zásahy do konfigurací a nekonečné cykly generování kódu. Cenou za vysokou kontrolu je však fragmentace autonomie a vznik lidského úzkého hrdla. Proces nepředstavuje bezobslužný vývojový systém, nýbrž asistovanou výrobní linku, kde člověk plní roli architekta a revizora @anthropic-managed-agents.

#strong[Ekonomika kontextu a perzistence stavu.]
V souladu s poznatky o degradaci pozornosti při dlouhém kontextu @liu2024 DarkFactory neudržuje historii celého projektu uvnitř context window. Verzovací systém git a externí checkpointy slouží jako primární nositelé stavu. Do context window vstupují při každém kroku pouze minimální nezbytné informace: zadání, schválený plán a bezprostřední pozorování z testů. Oddělení trvalého stavu od dočasného kontextu inference snižuje náklady na tokeny a udržuje pozornost modelu zaměřenou na řešený fragment kódu.

#strong[Deterministická verifikace jako protiváha stochastické generace.]
Softwarové inženýrství nabízí pro nasazení agentů zásadní výhodu: možnost strojově ověřitelné zpětné vazby překladačů, linterů a jednotkových testů. Analyzovaný runner předává opravnému kroku konkrétní výstup a současně jej omezuje schváleným plánem. Tato konstrukce vytváří podmínky pro cílenou opravu; spolehlivost samotné opravy by však musela prokázat samostatná provozní evaluace @darkfactory-e9c10221.

#heading(level: 1)[Závěr]

Jazykový model sám o sobě pouze generuje výstup v závislosti na vstupním kontextu. Agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design. Ani toto propojení však pro účinné nasazení ve vývoji softwaru nestačí bez postupů Agentického inženýrství, které vymezují rozsah autonomie, určují body lidského rozhodnutí a zajišťují ověřování výsledků.

Analýza pipeline DarkFactory doložila, jak lze takový systém realizovat v praxi: řídí průchod požadavku, vytváří izolovanou větev, ověřuje výsledek testy, kontroluje rozsah změn, ukládá checkpoint a předává výsledek k lidské revizi.

Úloha vývojáře se v tomto uspořádání posouvá od rutinního psaní kódu k preciznímu návrhu zadání, vymezení mantinelů a určení bodů, v nichž je nezbytné lidské rozhodnutí.

Zjištění ukazují, že samotná autonomie agenta nenahrazuje řízení vývojového procesu. Správně navržený harness spolu s postupy Agentického inženýrství umožňuje delegovat netriviální vývojové úlohy na stochastické modely a současně chránit stabilitu hlavní vývojové větve i transparentnost provedených změn. Rozsah této práce však neumožňuje zobecnit výsledky na jiné harnessy ani posoudit kvalitu kódu vytvářeného různými modely.

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#block[
  #set par(justify: false)
  #bibliography("bib/references.bib", style: "bib/gjkt-iso690-numeric-cs.csl", title: none)
]

#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
