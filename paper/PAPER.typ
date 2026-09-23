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
    Práce zkoumá přechod od konverzační asistence k delegovanému agentnímu vývoji a roli harnessu jako běhového a integračního prostředí coding agenta. Agentické inženýrství vymezuje jako soubor postupů, které činí AI-asistovaný vývoj softwaru účinným, kontrolovaným, opakovatelným a škálovatelným. DarkFactory představuje praktický artefakt tohoto přístupu. Dostupná implementační evidence zatím podporuje pouze vybrané mechanismy; konečné vyhodnocení je podmíněno ověřením jedné pinované revize a reprodukovatelných důkazů.
  ],
  abstract-en: [
    This thesis examines the transition from conversational assistance to delegated agentic software development and the role of the harness as the coding agent's execution and integration environment. It defines Agentic Engineering as a set of practices that make AI-assisted software development effective, controlled, repeatable, and scalable. DarkFactory is presented as a practical artefact of this approach. The currently available implementation evidence supports only selected mechanisms; final evaluation depends on verification against one pinned revision and reproducible evidence.
  ],
)

#let nadpis-bez-cisla(text-nadpisu) = heading(numbering: none, outlined: true, bookmarked: false, text-nadpisu)

#set document(title: "Agentický Inženýrství - DarkFactory: pipeline pro automatizaci softwarového vývoje", author: meta.autor)
#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm), footer: none)
#set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
#set par(justify: true, leading: 1.5 * 0.65em, spacing: 16pt, first-line-indent: 1.25cm)
#set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)

#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
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
  #text(size: 24pt, weight: "bold", hyphenate: false)[Agentický Inženýrství - DarkFactory: pipeline pro automatizaci softwarového vývoje]
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
#nadpis-bez-cisla[Prohlášení]
Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval samostatně pod dohledem vedoucího uvedeného na první straně. Všechny použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby tištěná forma práce byla uchována na #meta.skola a tam používána jako tištěný zdroj např. pro další studentské práce či pro prezentaci vzdělávání na #meta.skola-zkratka.

#v(1.5cm)
V #meta.mesto dne #box(width: 4.5cm, repeat("…")) #h(1fr) Podpis autora práce: #box(width: 4.5cm, repeat("…"))

#nadpis-bez-cisla[Anotace]
#meta.annotation-cs

#v(0.6em)
#strong[Klíčová slova:] jazykové modely; coding agents; harness; Agentické inženýrství; GitHub Actions; DarkFactory

#v(1.8em)
#block(above: 0pt, below: 8pt, text(size: 14pt, weight: "bold")[Abstract])
#meta.abstract-en

#v(0.6em)
#strong[Keywords:] language models; coding agents; harness; Agentic Engineering; GitHub Actions; DarkFactory

#outline(title: [Obsah], depth: 3, indent: 1.4em)

#set page(footer: context {
  align(center, text(font: PISMO, size: 11pt, counter(page).display("1")))
})

#heading(level: 1)[Úvod]

Nástroje založené na velkých jazykových modelech prošly rychlým vývojem: od doplňování kódu při psaní přes konverzační chatboty až po autonomní agenty, kteří pomocí nástrojů samostatně provádějí změny a spouštějí příkazy v běhovém prostředí @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. S rostoucími schopnostmi modelů roste i jejich adopce, avšak pravidelné využívání plnohodnotných agentických systémů zůstává omezeno na přibližně 0,36~% světové populace @gradually-ai-usage-2026.

#figure(
  image("img/generated/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle nejpokročilejší používané kategorie. Pravidelní uživatelé AI coding agents tvoří podle Gradually přibližně 0,36~% světové populace, tedy zhruba 30 milionů lidí @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění testů a CI, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak harness dělá z jazykového modelu autonomního agenta a jaké postupy umožňují využívat agenty účinně a kontrolovaně.

Praktická část analyzuje DarkFactory, na poskytovateli nezávislou pipeline pro AI-asistovaný softwarový vývoj implementovanou v jazyce Python.

#heading(level: 1)[Teoretická část]

#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Jazykový model (#strong[LLM]) předpovídá další token na základě #strong[kontextu]. #strong[Transformer] zpracovává vztahy mezi nimi pomocí mechanismu attention @vaswani2017 @brown2020. Při inferenci model zpracuje obsah kontextového okna a vytvoří posloupnost výstupních tokenů. Jednotlivé volání však samo nevybírá další kontext, nemění soubory, nespouští příkazy ani neuchovává stav mezi kroky. Tyto činnosti zajišťuje harness, který modelu zpřístupňuje nástroje a jejich výsledky vrací do dalšího kroku @anthropic2024tooluse.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov king a queen @mikolov2013linguistic.

#figure(
  image("img/vector-embedding-queen.svg", width: 78%),
  caption: [Jednoduchá ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *king* a *queen* podle principu popsaného v @mikolov2013linguistic.],
) <fig-embedding-queen>

#heading(level: 3)[Context window a kompakce]

#strong[Kontextové okno] (*context window*) tvoří pracovní kontext jednoho volání modelu. Může obsahovat instrukce, části repozitáře, historii volání nástrojů i výsledky předchozích kroků. Jeho kapacita však sama o sobě nezaručuje, že model všechny podstatné informace správně využije: úspěšnost jejich vybavení závisí také na umístění v kontextu a může s rostoucí délkou vstupu klesat @liu2024. Toto postupné zhoršování práce s nahromaděným kontextem se označuje jako #strong[context rot] @anthropic-context-engineering.

Kompakce po překročení stanoveného limitu nahrazuje starší průběh strukturovaným souhrnem klíčových rozhodnutí a dosažených výsledků. Do dalšího volání tak není nutné vkládat celý přepis předchozí interakce @anthropic-context-engineering.

#heading(level: 2)[Agent a harness]
Zásadní rozdíl mezi konverzačním chatbotem a autonomním agentem nespočívá v architektuře použitého modelu, nýbrž v míře delegace provádění. Chatbot setrvává v roli externího rádce: uživatel musí manuálně kopírovat úryvky kódu, dodávat kontext a spouštět navržené příkazy. Agent naproti tomu prostřednictvím harnessu získává přímý přístup k nástrojům repozitáře. Sám prochází souborovou strukturu, upravuje kód, spouští testy a na základě chybových výstupů samostatně koriguje své změny @anthropic2024tooluse @openai-agents-sandbox. Tento posun transformuje roli člověka z přímého vykonavatele na dohlížejícího architekta.

#heading(level: 3)[Smyčka]

Základním mechanismem agentického systému je iterativní řídicí smyčka. Na rozdíl od jednorázové generace odpovědi u chatbota probíhá interakce v cyklu podle vzoru #strong[ReAct] (*Reasoning and Acting*) @yao2022. Model v každém kroku analyzuje aktuální stav kontextu, zformuluje vnitřní uvažování a navrhne konkrétní volání nástroje ve formě strukturovaného požadavku. Harness tuto akci provede v prostředí projektu, zachytí výsledek a vrátí jej modelu jako nové pozorování. Smyčka pokračuje, dokud model nedosáhne cíle nebo nenarazí na bezpečnostní limit kroků či tokenů.

#figure(
  image("img/react-loop.svg", width: 75%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku; princip podle @yao2022.],
) <fig-react-loop>

#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství (#strong[Agentic Engineering]) představuje soubor postupů pro systematický návrh podmínek, v nichž může jazykový model vykonávat inženýrské úlohy účinně, kontrolovaně, opakovatelně a v souladu s pravidly projektu @anthropic-harness-design @anthropic-managed-agents. Zahrnuje dekompozici úloh, přesné ohraničení kontextu, konstrukci nástrojových rozhraní, verifikační zpětnou vazbu a mechanismy řízené integrace.

#heading(level: 3)[Zadání a kontext]

Spolehlivé delegování práce začíná explicitním vymezením cíle, rozsahu, omezení a podmínek přijetí. Specifikace popisuje nejen požadovaný výsledek, ale také části systému, které se měnit nemají, a způsob, jakým bude výsledek ověřen. Tento přístup, označovaný jako #strong[spec-first] nebo *spec-driven development*, dává agentovi před implementací měřitelné hranice a člověku podklad pro posouzení výsledku.

#strong[Prompt engineering] se soustředí na formulaci instrukcí, omezení, příkladů a očekávaného výstupu konkrétního inferenčního kroku. #strong[Context engineering] řeší širší a průběžný výběr, uspořádání, obnovování a kompakci informací, které má model v daném kroku k dispozici @openai-prompt-engineering @anthropic-context-engineering. Projektová pravidla a validační příkazy lze uchovat přímo v repozitáři například ve standardizovaném souboru `AGENTS.md`, takže je harness může připojit k relevantní úloze @agents-md.

Specifikace a kontext se promítají do provádění prostřednictvím schopností harnessu. #strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět příkazy; #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy @agentskills-spec. #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit deterministickou kontrolu @openai-agents-lifecycle. #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification. Nejde o samostatné agenty, ale o řízené části runtime, jejichž výběr, oprávnění a výstupy určují, co může agent skutečně provést a ověřit.

Po každé akci harness vrací agentovi pozorování, například výsledek testu, překladače nebo stav pracovního stromu. Agent podle něj upraví další krok a pokračuje, dokud nesplní podmínky přijetí nebo nenarazí na stanovený limit.

#heading(level: 3)[Orchestrace a lidská integrace]

Rozsáhlou úlohu lze rozdělit do více agentních běhů, pokud mají podúlohy jasné hranice a jejich výsledky lze znovu integrovat. Ve vzoru #strong[coordinator/subagent] koordinátor deleguje dílčí úkol specializovanému subagentovi s vlastním kontextem a přebírá jeho výsledek. Nezávislé podúlohy mohou zpracovat #strong[paralelní pracovníci], zatímco #strong[workflow graph] předem určuje závislosti, pořadí a větvení fází. #strong[Swarm] používá volnější koordinaci, při níž si specializovaní agenti dynamicky předávají řízení podle aktuálního stavu úlohy @openai-agent-orchestration @openai-swarm.

Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy, když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdíleného stavu a integračních kontrol.

#strong[Goal loop] tvoří nadřazenou řídicí smyčku vůči jednotlivým cyklům agentní smyčky: když model ve standardní smyčce ReAct označí svůj krok za dokončený, harness porovná dosažený stav s cílem a podmínkami přijetí a rozhodne, zda běh ukončit, nebo úlohu vrátit agentovi k další iteraci či změně strategie @yao2022 @anthropic-harness-design.

Princip #strong[human-in-the-loop] (#strong[HITL]) doplňuje automatizované smyčky o kontrolní brány, v nichž je vyžadováno explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak nadále odpovídá za záměr, architekturu a integraci, zatímco agent provádí ohraničenou implementační práci. Začlenění změn do hlavní větve vyžaduje vedle technického ověření v CI také lidskou revizi a převzetí odpovědnosti za výsledek @github-branches @github-pull-requests.

#heading(level: 1)[Praktická část]

#heading(level: 2)[Metodika] <practical-first>

Praktická část práce navazuje na teoretická východiska o harnessu a Agentickém inženýrství. Jejím cílem je empiricky ověřit, jakým způsobem jsou principy řízeného provádění, ohraničení kontextu a verifikace realizovány v praxi. Předmětem zkoumání je referenční revize systému DarkFactory @darkfactory-e9c10221, která představuje stabilní implementaci autonomní vývojové pipeline v ekosystému GitHub Actions.

Analýza se zaměřuje na čtyři klíčové inženýrské dimenze odvozené z teoretické části:
1. *Izolace běhového prostředí a oprávnění:* mechanismus hermetického oddělení agenta od hostitelského CI systému, montování pracovního stromu repozitáře a injektování autentizačních tajemství s minimálními právy.
2. *Dekompozice úlohy a fázované řízení (HITL):* rozdělení životního cyklu požadavku do diskrétních stavů (interpretace, plánování, implementace) a začlenění formálních schvalovacích bran člověkem.
3. *Deterministická verifikace a seberevize:* integrace automatizovaných nástrojů (lintery, testovací frameworky), záchyt chybových kódů v samoopravné smyčce a auditování vygenerovaného diffu vůči schválenému plánu.
4. *Perzistence stavu a zotavení:* serializace parametrů běhu (checkpointing), záchyt výpadků kvót externích API (HTTP 429) a procedura obnovení rozpracované úlohy příkazem /resume.

Metodický postup kombinuje statickou inspekci zdrojových kódů a reprodukovatelnou verifikaci testovací sady. Primárními podklady jsou specifikace workflow (`.github/workflows/agent.yml`), definice kontejneru (`docker/Dockerfile.agent`), řídicí skript runneru (`agent_runner.py`) a sada integračních testů v jazyce Python (`tests/test_governance.py`, `tests/test_pipeline_config.py`, `tests/test_workflows.py`). Tvrzení o strukturálním uspořádání a řídicích tocích vycházejí z trasování kódu runneru; spolehlivost přechodů mezi stavy, obnova po přerušení a kontrola rozsahu oprávnění jsou ověřeny vykonáním automatizovaných testů v referenčním prostředí.

Výzkumný rámec je vymezen zkoumáním samotné pythonovské pipeline a jejích řídicích mechanismů. Analýza nehodnotí subjektivní kvalitu kódu generovaného konkrétními modely, nýbrž strukturální a invariantní vlastnosti běhového prostředí, které vymezují bezpečný prostor pro autonomní agentní práci.

#heading(level: 2)[DarkFactory]

DarkFactory představuje automatizovanou pipeline běžící v prostředí GitHub Actions. Workflow spouští kontejner Docker, v němž pythonovský runner připraví prostředí, předá harnessu instrukce a zpracuje výsledek jeho běhu @darkfactory-e9c10221.

#figure(
  image("img/darkfactory-python-pipeline.svg", width: 100%),
  caption: [Řídicí workflow Pythonové pipeline DarkFactory. Schéma zachycuje průchod od nového požadavku přes dvě schvalovací brány, implementaci a opakovanou seberevizi až po lidskou revizi pull requestu; větev přerušení odpovídá zachování checkpointu a obnovení běhu @darkfactory-e9c10221.],
) <fig-darkfactory-python-pipeline>

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

Během každé fáze runner ukládá run state do strukturovaného formátu. Stavový záznam obsahuje identifikátor požadavku, aktuální fázi, název vytvořené větve, hash posledního commitu a přehled úspěšně dokončených kroků. Narazí-li volání API modelu na limit vyčerpání kvóty (HTTP 429), runner neselže fatální chybou; namísto toho bezpečně uloží dosažený stav, označí úlohu v komentáři jako blokovanou a informuje vývojáře. Jakmile dojde k obnovení kvóty nebo přepnutí klíče, lze pipeline probudit příkazem `/resume`. Runner deserializuje uložený checkpoint a naváže přesně v místě přerušení, aniž by opakoval již provedené kroky nebo zbytečně znovu spotřebovával tokeny pro již vyřešené úlohy @darkfactory-e9c10221 @darkfactory-request-359.

#heading(level: 1)[Výsledky a diskuse]

#heading(level: 2)[Zjištění] <results-first>

Pipeline organizuje průchod požadavku jako sled událostí v repozitáři. Po vytvoření issue runner vygeneruje interpretaci zadání; její schválení uživatelem iniciuje tvorbu plánu a teprve další schválení zahájí samotnou implementaci. Dvě schvalovací brány tak oddělují porozumění požadavku a plánování od samotných úprav zdrojového kódu @darkfactory-e9c10221.

Workflow před spuštěním ověřuje, zda je agent pro daný repozitář povolen, a ignoruje komentáře vytvořené automatickými boty. Autentizační tokeny jsou předány z prostředí GitHub Actions a pracovní strom projektu je připojen do kontejneru, v němž běží pythonovský runner @darkfactory-e9c10221.

Po schválení plánu pipeline vytvoří pracovní větev a předá implementační instrukci harnessu. Runner spustí formátovací a testovací nástroje; při neúspěchu testů provede opravný krok. Poté vytvoří commit, odešle větev a otevře draft pull request. Seberevize porovná změněné soubory s rozsahem plánu; pokud detekuje nežádoucí úpravy mimo schválený rozsah, iniciuje opravu a novou revizi. Jestliže seberevize nenajde nesoulad, pipeline označí pull request jako připravený k lidské revizi @darkfactory-e9c10221.

Inspekce testovací sady v referenční revizi dokládá vysoké pokrytí klíčových invariantů pipeline: automatizované testy ověřují korektní serializaci Run State, detekci zastaralého plánu (stale plan), deterministické odvození stavu pracovního stromu i dodržení bezpečnostních mantinelů při práci se soubory. Testované scénáře potvrzují, že při selhání jednotkových testů je chybový výstup linteru či testovacího frameworku přesně strukturován a předán modelu, což umožňuje úspěšné odstranění lokálních regresí bez lidského zásahu @darkfactory-e9c10221.

Runner ukládá checkpoint pro spolehlivé navázání rozpracovaného běhu. Při vyčerpání kvóty uchová stav, označí běh jako blokovaný a umožní jeho pokračování příkazem /resume. Testy pokrývají serializaci stavu, obnovení pipeline, přepnutí poskytovatele modelu i kontrolu přístupových oprávnění @darkfactory-e9c10221.

#heading(level: 2)[Diskuse]

Dostupný snapshot dokládá některé mechanismy relevantní pro pozdější vyhodnocení, zejména práci s trvalým stavem, oprávněními, izolací změn, automatickými kontrolami a vybranými scénáři obnovy. Neměří však účinnost jednotlivých postupů Agentického inženýrství, kvalitu práce s kontextem ani úplnost orchestrace. Konečné vyhodnocení cíle proto vyžaduje potvrzení kanonické revize DarkFactory a reprodukovatelný evidenční manifest; následující interpretace jsou z tohoto důvodu předběžné.

#strong[Dělba odpovědnosti mezi modelem a harnessem.]
Jazykový model sám o sobě postrádá pojem o čase, kauzalitě i stavu vývojového prostředí; funguje jako stochastický generátor návrhů. Výsledky ukazují, že skutečnou páteř autonomního systému tvoří deterministický harness — v tomto případě GitHub Actions workflow a pythonovský runner. Právě harness zodpovídá za přípravu izolovaného prostředí, vynucování kroků, orámování kontextu a interpretaci návratových kódů. Model tedy nepředstavuje samostatnou autonomní entitu, nýbrž výpočetní modul zasazený do přísně strukturovaného algoritmického rámce @anthropic-harness-design.

#strong[Architektonický kompromis: Autonomie vs. správa.]
DarkFactory volí konzervativní architekturu se čtyřmi kontrolními branami — dvěma lidskými (schválení interpretace a plánu) a dvěma automatizovanými (testy a audit diffu). Tento přístup eliminuje nejčastější rizika nekontrolovaných agentů: drift zadání, neautorizované zásahy do konfigurací a nekonečné cykly generování kódu. Cenou za vysokou kontrolu je však fragmentace autonomie a vznik lidského úzkého hrdla. Proces nepředstavuje bezobslužný vývojový systém, nýbrž asistovanou výrobní linku, kde člověk plní roli architekta a revizora @anthropic-managed-agents.

#strong[Ekonomika kontextu a perzistence stavu.]
V souladu s poznatky o degradaci pozornosti při dlouhém kontextu @liu2024 DarkFactory neudržuje historii celého projektu uvnitř context window. Verzovací systém git a externí checkpointy slouží jako primární nositelé stavu. Do context window vstupují při každém kroku pouze minimální nezbytné informace: zadání, schválený plán a bezprostřední pozorování z testů. Oddělení trvalého stavu od dočasného kontextu inference snižuje náklady na tokeny a udržuje pozornost modelu zaměřenou na řešený fragment kódu.

#strong[Deterministická verifikace jako protiváha stochastické generace.]
Softwarové inženýrství nabízí pro nasazení agentů zásadní výhodu: možnost objektivní, strojově ověřitelné zpětné vazby překladačů, linterů a jednotkových testů. Praktická analýza potvrdila, že samoopravná smyčka agenta funguje spolehlivě pouze tehdy, má-li model k dispozici přesný chybový výstup (stack trace, exit code) a pevně vymezený rozsah povolených úprav. Bez těchto deterministických mantinelů hrozí, že pokus o opravu chyby vnese do repozitáře další nezamýšlené regrese.

#heading(level: 1)[Závěr]

Jazykový model sám o sobě pouze generuje výstup v závislosti na vstupním kontextu. Agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design. Ani toto propojení však pro účinné nasazení ve vývoji softwaru nestačí bez postupů Agentického inženýrství, které vymezují rozsah autonomie, určují body lidského rozhodnutí a zajišťují ověřování výsledků.

Analýza pipeline DarkFactory doložila, jak lze takový systém realizovat v praxi: řídí průchod požadavku, vytváří izolovanou větev, ověřuje výsledek testy, kontroluje rozsah změn, ukládá checkpoint a předává výsledek k lidské revizi.

Úloha vývojáře se v tomto uspořádání posouvá od rutinního psaní kódu k preciznímu návrhu zadání, vymezení mantinelů a určení bodů, v nichž je nezbytné lidské rozhodnutí.

Zjištění ukazují, že samotná autonomie agenta nenahrazuje řízení vývojového procesu. Správně navržený harness spolu s postupy Agentického inženýrství umožňuje delegovat netriviální vývojové úlohy na stochastické modely a současně chránit stabilitu hlavní vývojové větve i transparentnost provedených změn. Rozsah této práce však neumožňuje zobecnit výsledky na jiné harnessy ani posoudit kvalitu kódu vytvářeného různými modely.

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("bib/references.bib", style: "iso-690-numeric", title: none)

#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
