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
    Odborná práce vymezuje vztah mezi jazykovým modelem, agentem a harnessem v agentickém vývoji softwaru. Popisuje postupy Agentického inženýrství, zejména návrh zadání a kontextu, ověřování, orchestraci a lidskou integraci. Praktická část analyzuje pipeline DarkFactory v prostředí GitHub Actions. Na základě inspekce zdrojových kódů a automatizovaných testů popisuje řízený průchod požadavku, kontrolu rozsahu změn, checkpointing a lidské schvalovací brány.
  ],
  abstract-en: [
    This thesis defines the relationship between a language model, an agent, and a harness in agentic software development. It describes Agentic Engineering practices, especially task and context design, verification, orchestration, and human integration. The practical part analyses the DarkFactory pipeline running on GitHub Actions. Using source code inspection and automated tests, it describes a governed request workflow, change scope control, checkpointing, and human approval gates.
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

Nástroje založené na jazykových modelech dnes doplňují kód, odpovídají na dotazy v IDE a v posledních verzích pracují přímo v repozitáři — spouštějí příkazy, testy a připravují změny k revizi @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. Část práce, kterou dosud vývojář prováděl sám, tak lze přenést na agenta.

Z toho však neplyne, že by autonomní programovací agenti (coding agents) představovali běžnou praxi. Podle odhadu Gradually tvoří jejich pravidelní uživatelé jen malou část všech uživatelů generativní AI @gradually-ai-usage-2026.

#figure(
  image("img/generated/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle nejpokročilejší používané kategorie. Pravidelní uživatelé AI coding agents tvoří podle Gradually malou část celku @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění testů a CI, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak se jazykový model propojuje s prostředím vývoje softwaru, jakou roli při tom hraje #strong[harness] a jaké postupy umožňují využívat agenty účinně a kontrolovaně.

Praktická část analyzuje pipeline DarkFactory implementovanou v jazyce Python a ověřuje vybrané mechanismy řízení, kontroly změn a pokračování běhu na základě zdrojového kódu, testů a záznamů CI.

#heading(level: 1)[Teoretická část]

#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Jazykový model (#strong[LLM]) předpovídá další token na základě předchozích. Architektura Transformer zpracovává vztahy mezi tokeny pomocí mechanismu attention @vaswani2017 @brown2020. Při inferenci model zpracuje obsah context window a vygeneruje odpověď. Sám však soubory nemění ani nespouští příkazy — provedení navržené akce zajišťuje harness @anthropic2024tooluse.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov king a queen @mikolov2013linguistic.

#figure(
  image("img/vector-embedding-queen.svg", width: 78%),
  caption: [Jednoduchá ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *king* a *queen* podle principu popsaného v @mikolov2013linguistic.],
) <fig-embedding-queen>

#heading(level: 3)[Context window a kompakce]

#strong[Context window] vymezuje informace dostupné při jednom volání modelu — instrukce, části repozitáře, historii nástrojů, výsledky předchozích kroků. Samotná velikost okna nezaručuje, že model všechny podstatné informace využije; schopnost modelu informaci správně vybavit a uplatnit závisí i na jejím umístění v rámci kontextu @liu2024.

Při komplexnějších úlohách proto harness vybírá, jaké informace do dalšího kroku předá. Kompakce nahrazuje starší průběh strukturovaným souhrnem klíčových rozhodnutí a dosažených výsledků, takže není nutné do každého volání vkládat celý přepis konverzace @anthropic-context-engineering.

#heading(level: 2)[Agent a harness]

Harness je runtime, který propojuje model s nástroji a prostředím projektu. Připravuje context window, udržuje stav běhu, zprostředkovává přístup k souborům a zaznamenává pozorování @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 3)[Smyčka agentního provádění]

V agentní smyčce model navrhne další akci, harness ji provede v prostředí a výsledek vrátí jako pozorování. Tento princip odpovídá přístupu #strong[ReAct], v němž se střídá uvažování, jednání a pozorování @yao2022.

#figure(
  image("img/react-loop.svg", width: 92%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku; princip podle @yao2022.],
) <fig-react-loop>

#heading(level: 3)[Agent a chatbot]

U chatbotu člověk sám vybírá soubory, upravuje projekt a spouští nástroje; chatbot jen odpovídá v konverzaci. Agent naproti tomu prostřednictvím harnessu čte a mění soubory, spouští příkazy a testy, přijímá jejich výstup a pokračuje podle něj. Podstatný rozdíl je tedy v tom, kdo práci v projektu skutečně vykonává @anthropic2024tooluse @openai-agents-sandbox.

#heading(level: 2)[Agentické inženýrství]

Aby mohl agent pracovat spolehlivě, nestačí spoléhat pouze na schopnosti samotného modelu nebo jednorázové prompty. Je nutné systematicky navrhnout zadání, výběr kontextu, mechanismy ověřování a způsob integrace výsledku. Tyto postupy se souhrnně označují jako Agentické inženýrství @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 3)[Zadání a kontext]

Delegovaná práce potřebuje explicitní výsledek, rozsah, omezení a podmínky přijetí. Specifikace určuje, co se má změnit i co má zůstat zachováno. Při #strong[prompt engineeringu] se formulují instrukce pro konkrétní krok; #strong[context engineering] vybírá zadání, pravidla repozitáře, soubory, historii a výsledky nástrojů pro context window @openai-prompt-engineering @anthropic-context-engineering. Soubor AGENTS.md může tato pravidla uchovat přímo v repozitáři @agents-md.

Harness může prostředí rozšiřovat o další prostředky. Rozšíření Skills představují znovu použitelné instrukce a skripty pro specializované úlohy @agentskills-spec; mechanismus Hooks reaguje na události běhu a umožňuje vynutit pravidla či spustit kontroly @openai-agents-lifecycle. Standard MCP (Model Context Protocol) sjednocuje připojení externích nástrojů a datových zdrojů k harnessu @mcp-specification. Tyto komponenty představují rozhraní a nástroje řízené harnessem, nikoli samostatné autonomní agenty.

#heading(level: 3)[Orchestrace a lidská integrace]

Práci lze rozdělit mezi více agentů. Ve vzoru coordinator/subagent hlavní agent předá dílčí úkol s omezeným kontextem a převezme výsledek. Workflow graph popisuje závislosti a větvení mezi kroky; swarm označuje volnější spolupráci skupiny agentů @openai-agent-orchestration @openai-swarm.

Human-in-the-loop (#strong[HITL]) označuje místa, kde postup vyžaduje lidské rozhodnutí — schválení plánu, úpravu rozsahu, vyhodnocení výsledku nebo přijetí změny. Integrace tak zahrnuje nejen technickou kontrolu, ale i lidskou revizi a převzetí odpovědnosti @github-branches @github-pull-requests.

#heading(level: 1)[Praktická část]

#heading(level: 2)[Metodika] <practical-first>

Praktická část práce je koncipována jako analytická případová studie konkrétního softwarového artefaktu. Předmětem zkoumání je systém DarkFactory v referenční revizi @darkfactory-e9c10221, která představuje stabilní implementaci orchestrace autonomního agenta v ekosystému GitHub Actions.

Primárními podklady pro analýzu jsou definiční soubory workflow (`.github/workflows/agent.yml`), konfigurace kontejnerizovaného běhového prostředí (`docker/Dockerfile.agent`), skripty pythonovského runneru (`agent_runner.py`) a sada automatizovaných integračních testů. Tyto artefakty umožňují detailně zmapovat způsob, jakým systém inicializuje běhové prostředí, předává kontextové informace modelu a ohraničuje přístupová práva.

Metodický postup spočívá v rekonstrukci celého životního cyklu požadavku — od zachycení události v repozitáři přes přípravu izolované pracovní větve a fázované schvalování záměru až po samotnou implementaci a validaci výsledku. U každé fáze je zkoumáno, jaké systémové nástroje jsou agentovi zpřístupněny, jak je uchováván a serializován stav běhu (checkpointing) a jakými kontrolními mechanismy je vymezen přípustný rozsah změn kódu. Tvrzení o strukturálním uspořádání vycházejí z inspekce zdrojových kódů; dynamické chování, odolnost vůči výpadkům a přepnutí poskytovatelů modelu jsou doloženy výsledky integračních testů a záznamy z běhů CI.

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

Analýza zjištěných mechanismů systému DarkFactory poskytuje konkrétní podklady pro zhodnocení teoretických konceptů Agentického inženýrství v reálném vývojovém procesu:

#strong[Dělba odpovědnosti mezi modelem a harnessem.]
Jazykový model sám o sobě postrádá pojem o čase, kauzalitě i stavu vývojového prostředí; funguje jako stochastický generátor návrhů. Výsledky ukazují, že skutečnou páteř autonomního systému tvoří deterministický harness — v tomto případě GitHub Actions workflow a pythonovský runner. Právě harness zodpovídá za přípravu izolovaného prostředí, vynucování kroků, orámování kontextu a interpretaci návratových kódů. Model tedy nepředstavuje samostatnou autonomní entitu, nýbrž výpočetní modul zasazený do přísně strukturovaného algoritmického rámce @anthropic-harness-design.

#strong[Architektonický kompromis: Autonomie vs. správa.]
DarkFactory volí konzervativní architekturu se čtyřmi kontrolními branami — dvěma lidskými (schválení interpretace a plánu) a dvěma automatizovanými (testy a audit diffu). Tento přístup eliminuje nejčastější rizika nekontrolovaných agentů: drift zadání, neautorizované zásahy do konfigurací a nekonečné cykly generování kódu. Cenou za vysokou kontrolu je však fragmentace autonomie a vznik lidského úzkého hrdla. Proces nepředstavuje bezobslužný vývojový systém, nýbrž asistovanou výrobní linku, kde člověk plní roli architekta a revizora @anthropic-managed-agents.

#strong[Ekonomika kontextu a perzistence stavu.]
V souladu s poznatky o degradaci pozornosti při dlouhém kontextu @liu2024 DarkFactory neudržuje historii celého projektu uvnitř context window. Verzovací systém git a externí checkpointy slouží jako primární nositelé stavu. Do context window vstupují při každém kroku pouze minimální nezbytné informace: zadání, schválený plán a bezprostřední pozorování z testů. Oddělení trvalého stavu od dočasného kontextu inference snižuje náklady na tokeny a udržuje pozornost modelu zaměřenou na řešený fragment kódu.

#strong[Deterministická verifikace jako protiváha stochastické generace.]
Softwarové inženýrství nabízí pro nasazení agentů zásadní výhodu: možnost objektivní, strojově ověřitelné zpětné vazby překladačů, linterů a jednotkových testů. Praktická analýza potvrdila, že samoopravná smyčka agenta funguje spolehlivě pouze tehdy, má-li model k dispozici přesný chybový výstup (stack trace, exit code) a pevně vymezený rozsah povolených úprav. Bez těchto deterministických mantinelů hrozí, že pokus o opravu chyby vnese do repozitáře další nezamýšlené regrese.

#heading(level: 1)[Závěr]

Jazykový model sám o sobě vytváří výstup pouze v rámci context window. Skutečný agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním — propojením, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design.

Analýza pipeline DarkFactory doložila, jak takový harness v praxi organizuje práci: řídí průchod požadavku, vytváří izolovanou větev, ověřuje výsledek testy, kontroluje rozsah změn, ukládá checkpoint a předává výsledek k lidské revizi. Stanovený cíl práce — vymezit vztah modelu, harnessu a Agentického inženýrství a ověřit vybrané mechanismy na reálném artefaktu — byl tímto naplněn.

Úloha vývojáře se v tomto uspořádání posouvá od rutinního psaní kódu k preciznímu návrhu zadání, vymezení mantinelů a určení bodů, v nichž je nezbytné lidské rozhodnutí.

Význam dosažených zjištění spočívá v tom, že autonomie v softwarovém inženýrství nemusí znamenat ztrátu kontroly. Správně navržený harness umožňuje delegovat netriviální vývojové úlohy na stochastické modely, aniž by byla ohrožena stabilita hlavní vývojové větve repozitáře nebo transparentnost změn. Budoucí rozvoj oboru bude proto určován nejen pokrokem v parametrické kapacitě modelů, ale především inženýrskou vyspělostí běhových prostředí a verifikačních architektur.

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("bib/references.bib", style: "iso-690-numeric", title: none)

#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
