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
    Práce zkoumá přechod od konverzační asistence k delegovanému agentnímu vývoji a roli harnessu jako běhového a integračního prostředí coding agenta. Cílem je vysvětlit, jak propojení jazykového modelu s nástroji, stavem, verifikací a lidskými kontrolními body umožňuje řízené provádění softwarových úloh v praxi. Agentické inženýrství práce vymezuje jako soubor postupů, které činí AI-asistovaný vývoj účinným, kontrolovaným, opakovatelným a škálovatelným. Teoretická část vychází z odborných publikací a dokumentace nástrojů. Praktická část analyzuje systém DarkFactory prostřednictvím statické inspekce workflow, runneru, kontejnerového prostředí, deklarativního grafu a testů v přesně určené revizi `e9c10221`. Analýza dokládá fázované řízení požadavku, schvalovací brány, izolaci změn, automatické spouštění testů, seberevizi a obnovu běhu po vyčerpání kvóty. Výsledky ukazují, že praktická autonomie nevzniká pouze schopnostmi modelu, ale především návrhem harnessu a přesným rozdělením odpovědnosti mezi automatizované mechanismy a lidské rozhodování. Dostupná evidence však neměří kvalitu práce různých modelů ani provozní úspěšnost systému. Závěry jsou proto omezeny na strukturální vlastnosti této jediné reprodukovatelně pinované revize.
  ],
  abstract-en: [
    This thesis examines the transition from conversational assistance to delegated agentic software development and the role of the harness as a coding agent's execution and integration environment. Its objective is to explain how connecting a language model to tools, persistent state, verification, and human control points enables governed execution of software tasks. Agentic Engineering is defined as the set of practices that makes AI-assisted development effective, controlled, repeatable, and scalable. The theoretical part draws on research literature and first-party tool documentation. The practical part analyses DarkFactory through static inspection of the workflow, runner, container environment, declarative graph, and tests at the exact `e9c10221` revision. The analysis identifies staged request handling, approval gates, change isolation, automated test execution, self-review, and recovery after quota exhaustion. The findings indicate that practical autonomy does not arise from model capability alone, but primarily from harness design and an explicit division of responsibility between automated mechanisms and human decisions. The evidence does not measure model quality or operational success rates. The conclusions are therefore limited to structural properties of this single reproducibly pinned revision.
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

Nástroje založené na velkých jazykových modelech prošly rychlým vývojem: od doplňování kódu při psaní v editoru přes konverzační chatboty až po autonomní agenty, kteří pomocí nástrojů samostatně provádějí změny a spouštějí příkazy v běhovém prostředí @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. S rostoucími schopnostmi modelů roste i jejich adopce, avšak většina uživetelů nemá představu čeho tyto nástroje jsou skutečně schopny. Většina populace se s generativní AI setkává jenom na povrchu prostřednictvím chatbotů a to bezplatným tedy omezeným přístupem. Odhad zdroje klade počet uživatelů chatbotů na 28% populace zatímco pravidelné užití AI coding agents pouze na 0,36~% světové populace@gradually-ai-usage-2026.

#figure(
  image("img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu. Hodnota 30 milionů pravidelných uživatelů coding agents, přibližně 0,36~% světové populace, je redakční střed odhadovaného rozmezí 25--35 milionů @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění příkazů, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.


#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak harness dělá z jazykového modelu autonomního agenta a jaké postupy umožňují využívat agenty účinně a kontrolovaně.

Praktická část analyzuje DarkFactory, na poskytovateli nezávislou pipeline pro AI-asistovaný softwarový vývoj. Pipeline kombinuje workflow GitHub Actions, kontejnerizovaný pythonovský řadič a harness `df` s deklarativním grafovým jádrem v TypeScriptu.


#heading(level: 1)[Teoretická část]


#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Jazykový model (#strong[LLM]) předpovídá další token na základě předešlých obsaženém v #strong[kontextu]. #strong[Transformer] využívá mechanismu attention @vaswani2017 @brown2020 pro zpracování vztahů mezi jednotlivými tokeny. Při inferenci model zpracuje obsah kontextového okna a vytvoří posloupnost výstupních tokenů. Jednotlivé volání však samo nemění soubory, nespouští příkazy ani neuchovává stav mezi kroky. Tyto činnosti zajišťuje harness, který modelu zpřístupňuje nástroje a pomocí rekursivního procesu zvaného ReAct dělá z jednotné generace souvislou konverzaci @anthropic2024tooluse.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov král, královna, muž a žena @mikolov2013linguistic. Tento vztah schematicky znázorňuje @fig-embedding-queen.

#figure(
  image("img/vector-embedding-queen.svg", width: 78%),
  caption: [Ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *král, královna, muž a žena* @mikolov2013linguistic.],
) <fig-embedding-queen>


#heading(level: 3)[Context window a kompakce]

#strong[Kontextové okno] (*context window*) tvoří pracovní kontext jednoho volání modelu. Může obsahovat instrukce, části repozitáře, historii volání nástrojů i výsledky předchozích kroků. Jeho kapacita však sama o sobě nezaručuje, že model všechny podstatné informace správně využije: úspěšnost jejich vybavení závisí také na umístění v kontextu a může s rostoucí délkou vstupu klesat @liu2024. Toto postupné zhoršování práce s nahromaděným kontextem se označuje jako #strong[context rot] @anthropic-context-engineering.

Kompakce (*compaction*) po překročení stanoveného limitu nahrazuje starší průběh strukturovaným souhrnem klíčových rozhodnutí a dosažených výsledků. Do dalšího volání tak není nutné vkládat celý přepis předchozí interakce @anthropic-context-engineering.


#heading(level: 2)[Agent a harness]
Praktickou hranicí mezi konverzačním chatbotem a agentem je míra delegovaného provádění. V běžném chatovém režimu model především vrací text a uživatel zůstává vykonavatelem navržených kroků. Agent naproti tomu prostřednictvím harnessu získává řízený přístup k nástrojům a prostředí: může procházet soubory, upravovat kód, spouštět testy a používat jejich výstupy v dalších krocích @anthropic2024tooluse @openai-agents-sandbox. Role člověka se tím může posunout od provádění jednotlivých kroků k zadání, omezení a revizi delegované práce.


#heading(level: 3)[Smyčka]

Základním mechanismem agentického systému je iterativní řídicí smyčka podle vzoru #strong[ReAct] (*Reasoning and Acting*) @yao2022. Model v každém kroku na základě aktuálního kontextu zvolí mezi možnostmi rozvažovaní, volání nástroje ve strukturovaném požadavku nebo zprávy v chatu (konečná akce). Harness každý krok přidá do přepisu konverzace a nový přepis se vrátí modelu. V případě použití nástroje tuto akci provede v běhovém prostředí, zachytí výsledek a vrátí jej modelu jako nové pozorování. 

#figure(
  image("img/react-loop.svg", width: 75%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku@yao2022.],
) <fig-react-loop>


#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství (#strong[Agentic Engineering]) se snaží definovat přístup aplikovatelný pro jakékoliv AI-asistované inženýrské práce, označuje jak systematický design systému a přístupu k práci tak samotné AI-asistované inženýrství v jakémkoliv kontextu. //TODO: add correct citation - agentic engineering
Mezi hlavní oblasti patří: #strong[Prompt Engineering], #strong[Context Engineering], #strong[Harness Engineering], #strong[Loop Engineering] a #strong[Workflow/Graph Engineering] @openai-prompt-engineering @anthropic-context-engineering @anthropic-harness-design @openai-agents-sandbox @openai-agent-orchestration. Cílem je, aby vývojář mohl efektivně a kontrolovaně delegovat dílčí úkoly agentovi, aniž by ztratil přehled o záměru, rozsahu a kvalitě výsledku.


#heading(level: 3)[Zadání a kontext]

Spolehlivé delegování práce začíná explicitním vymezením cíle, rozsahu, omezení a podmínek přijetí. Specifikace popisuje nejen požadovaný výsledek, ale také části systému, které se měnit nemají, a způsob, jakým bude výsledek ověřen. Tento přístup, označovaný jako #strong[spec-first] nebo *spec-driven development*, dává agentovi před implementací měřitelné hranice a člověku podklad pro posouzení výsledku, je také používán v klasickém vývoji softwaru.

#strong[Prompt engineering] se soustředí na formulaci instrukcí, omezení, příkladů a očekávaného výstupu konkrétního inferenčního kroku @openai-prompt-engineering. #strong[Context engineering] řeší širší a průběžný výběr, uspořádání, obnovování a kompakci informací, které má model v daném kroku k dispozici @anthropic-context-engineering. 

#strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět příkazy; #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy @agentskills-spec. #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit deterministickou kontrolu @openai-agents-lifecycle. #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification. Instrukce lze uchovat ve standardizovaném souboru #strong[`AGENTS.md`]@agents-md přímo v repozitáři (Anthropic ojedinele využívá #strong[CLAUDE.md]). Skilly scripty a hooky lze uchovat pod složkou #strong[`.agents/`] v projektu nebo v konfigurační složce harnessu.


#heading(level: 3)[Orchestrace a lidská integrace]

 Pokud mají podúlohy jasné hranice a jejich výsledky lze znovu integrovat, rozsáhlou úlohu lze rozdělit do více agentních běhů. Ve vzoru #strong[coordinator/subagent] koordinátor deleguje dílčí úkol specializovanému subagentovi s vlastním kontextem a přebírá jeho výsledek. Nezávislé podúlohy mohou zpracovat paralelní pracovníci. #strong[Workflow graph] předem určuje závislosti, pořadí a větvení fází @openai-agent-orchestration. #strong[Agent Swarm] dynamicky rozkládá úlohu na heterogenní podproblémy a spouští specializované agenty paralelně pod řízením orchestrátoru @kimi-k25-swarm.

Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy, když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdíleného stavu a integračních kontrol. Orchestrace je však nezbytná pro rozsáhlé úlohy, které by nebylo možné implementovat v rozsahu jednoho kontextového okna, spolehání na kompakci by vedlo ke katastrofické divergenci a kdybyse soustředil na celek nebyl by schopen efektivně implementovat jednotné části zadaní.

#strong[Goal loop] označuje nadřazenou řídicí smyčku: po dílčím dokončení ReAct smyčky harness porovná pozorovaný stav s cílem a podmínkami přijetí a podle výsledku běh ukončí, nebo zahájí další iteraci či změnu strategie. @yao2022.

#strong[human-in-the-loop] (#strong[HITL]) označuje bod kde se do automatizované smyčky doplní kontrolní brány, v nichž je vyžadováno explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak může ponechat agentovi ohraničenou implementační práci a současně si zachovat odpovědnost za záměr a integraci.

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

Praktická část navazuje na teoretická východiska o harnessu a Agentickém inženýrství. Zkoumá, jak jsou principy řízeného provádění, ohraničení kontextu a verifikace realizovány ve zdrojovém kódu DarkFactory.

Analýza se zaměřuje na čtyři klíčové inženýrské dimenze odvozené z teoretické části:
1. *Izolace běhového prostředí a oprávnění:* kontejnerizované oddělení agentního procesu od hostitelského shellu CI, explicitní připojení pracovního stromu a předávání autentizačních údajů pouze do kroků, které je používají.
2. *Dekompozice úlohy a fázované řízení (HITL):* rozdělení životního cyklu požadavku do diskrétních stavů (interpretace, plánování, implementace) a začlenění formálních schvalovacích bran člověkem.
3. *Automatizovaná verifikace a seberevize:* spuštění dostupných formátovacích nástrojů a deklarovaných testovacích sad, předání chybového výstupu jednomu opravnému kroku a kontrola změněných souborů a diffu vůči schválenému plánu.
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

Produkční cesta reaguje na události GitHubu, zejména otevření issue a přidání komentáře; workflow navíc podporuje review komentáře, `repository_dispatch` a explicitní či znovupoužitelné spuštění. Job je podmíněn povolením agenta pro repozitář a před nákladnějšími kroky ignoruje komentáře automatických botů a položky označené jako selhání pipeline.

Po validaci vstupu workflow sestaví obraz Docker podle `docker/Dockerfile.agent`. Pracovní kopie cílového repozitáře je do kontejneru připojena jako svazek `/workspace`; runner tedy pracuje nad explicitně předaným pracovním stromem místo přímého běhu v hostitelském shellu GitHub Actions. Potřebné tokeny a modelové přihlašovací údaje jsou kontejneru předány proměnnými prostředí. Samotné workflow deklaruje zápisová oprávnění pro obsah repozitáře, issues, pull requesty, projekty a Actions, protože tyto operace pipeline skutečně provádí @darkfactory-e9c10221.


#heading(level: 3)[Fázovaný průchod a řídicí smyčka]

Řízení úlohy v kontejneru přebírá skript `agent_runner.py`. Průchod není realizován jako jediná dlouhá interakce, nýbrž je rozdělen do fází oddělených kontrolními branami:

- *Fáze interpretace:* Runner načte text issue a předloží jej modelu se systémovou instrukcí pro dekompozici problému. Model zformuluje pochopení úlohy a navrhne akceptační kritéria. Runner výsledek zapíše jako komentář k issue a ukončí běh, čímž vyčká na schválení člověkem.
- *Fáze plánování:* Po explicitním schválení interpretace je workflow spuštěno znovu. Model analyzuje strukturu repozitáře a sestaví konkrétní plán úprav — specifikuje seznam souborů určených ke změně a předpokládaný sled kroků. Tento plán je opět předložen člověku ke schválení.
- *Implementační smyčka a verifikace:* Teprve po schválení plánu runner vytvoří dedikovanou pracovní větev, aby nezasahoval do hlavní vývojové větve. Harness následně model navádí k úpravě kódu. Runner poté spustí dostupné formátovací nástroje a deklarované testovací sady: Python testy při přítomnosti `pyproject.toml`, Cargo testy pro Rust workspace a kořenový `test` skript pro Node/Bun projekt. Při prvním neúspěchu předá chybový výstup jednomu opravnému kroku modelu. V hodnocené revizi však po tomto opravném kroku před commitem povinně nespouští celou testovací sadu znovu; jde proto o omezení produkční cesty, nikoli o end-to-end důkaz zeleného opraveného stromu.
- *Seberevize a draft pull request:* Po implementační fázi runner vytvoří commit, odešle větev a otevře draft pull request. Seberevize nejprve deterministicky porovná změněné soubory s explicitním file-scope plánu, pokud jej plán obsahuje, a následně předá diff modelu ke code review. Čistá seberevize pokračuje samostatnou modelovou kontrolou souladu výsledného diffu s plánem. Teprve kladný výsledek této kontroly označí pull request jako připravený k lidské revizi @darkfactory-e9c10221.


#heading(level: 3)[Serializace stavu, checkpointing a obnova]

V distribuovaném prostředí automatizovaných pipeline mohou běh přerušit limity externích služeb nebo jiné provozní chyby. Hodnocená produkční cesta explicitně řeší jeden konkrétní případ: úplné vyčerpání dostupné modelové řady kvůli kvótě, při němž vytvoří checkpoint pro pozdější obnovení.

Pythonovský runner nezapisuje checkpoint průběžně po každém kroku. Pokud se vyčerpají všechny dostupné modelové pokusy, uloží `.antigravity_checkpoint.json` s identifikátorem položky, větví a dosud dokončenými kroky, případné rozpracované změny commitne na pracovní větev, položku označí jako blokovanou a zapíše čas obnovení. Samostatný workflow `quota-resume.yml` provádí každých 15 minut sweep zralých záznamů; alternativou je příkaz `/resume`. Deklarativní grafové jádro ukládá svůj `RunState` odděleně do souboru `.df` atomickou náhradou. Jde tedy o dva rozdílné mechanismy perzistence v témže snapshotu @darkfactory-e9c10221.


#heading(level: 1)[Výsledky a diskuse] <results-section>


#heading(level: 2)[Zjištění] <results-first>

Pipeline organizuje průchod požadavku jako sled událostí v repozitáři. Po vytvoření issue runner vygeneruje interpretaci zadání; její schválení uživatelem iniciuje tvorbu plánu a teprve další schválení zahájí samotnou implementaci. Dvě schvalovací brány tak oddělují porozumění požadavku a plánování od samotných úprav zdrojového kódu @darkfactory-e9c10221.

Workflow před spuštěním ověřuje, zda je agent pro daný repozitář povolen, a ignoruje komentáře vytvořené automatickými boty. Autentizační tokeny jsou předány z prostředí GitHub Actions a pracovní strom projektu je připojen do kontejneru, v němž běží pythonovský runner @darkfactory-e9c10221.

Po schválení plánu pipeline vytvoří pracovní větev a předá implementační instrukci harnessu. Runner spustí dostupné formátovací nástroje a deklarované testovací sady; při prvním neúspěchu předá jejich výstup jednomu opravnému kroku. V této revizi však po opravě povinně neopakuje celou testovací sadu před commitem. Následně otevře draft pull request, provede deterministickou kontrolu explicitního file-scope a modelovou seberevizi a při čistém výsledku ještě samostatně porovná finální diff s plánem. Teprve poté označí pull request jako připravený k lidské revizi @darkfactory-e9c10221.

Inspekce testovací sady ukazuje pokrytí ukládání a atomické obnovy grafového stavu, plánování a autorizace bran, scope kontroly, plánovaného quota-resume sweepu a failoveru mezi poskytovateli. Tyto testy ověřují konkrétní řídicí mechanismy v izolaci; samy o sobě neprokazují provozní úspěšnost celé pipeline ani to, že model po opravném kroku odstraní lokální regresi @darkfactory-e9c10221.

Při úplném vyčerpání modelové řady runner uloží quota checkpoint, označí položku jako blokovanou a zapíše repository variable s časem obnovení. Běh lze znovu vyvolat příkazem `/resume` nebo plánovaným sweepem; samostatné testy ověřují zralý i nezralý quota záznam, neúspěšný dispatch a zachování záznamu pro další pokus @darkfactory-e9c10221.


#heading(level: 2)[Diskuse]

Pinovaný snapshot dokládá mechanismy trvalého stavu, oprávnění, izolace změn, automatických kontrol a obnovy. Neměří však účinnost jednotlivých postupů Agentického inženýrství, kvalitu práce s kontextem ani provozní úspěšnost orchestrace. Následující interpretace jsou proto omezeny na strukturální vlastnosti revize `e9c10221`.

#strong[Dělba odpovědnosti mezi modelem a harnessem.]
Samostatné volání jazykového modelu nemá bez dodaného kontextu a nástrojů trvalý přístup ke stavu vývojového prostředí. Hodnocený systém proto rozděluje odpovědnost mezi model a řídicí vrstvu: GitHub Actions a pythonovský runner připravují prostředí, určují pořadí fází, předávají nástrojové výstupy a vykonávají automatické kontroly, zatímco model zajišťuje interpretaci, implementační návrhy, opravy a části revize. Harness zde není čistě deterministický; kombinuje deterministické mechanismy s modelovými kroky v explicitně řízeném procesu @anthropic-harness-design @darkfactory-e9c10221.

#strong[Architektonický kompromis: autonomie vs. správa.]
Produkční cesta kombinuje dvě lidská schválení před implementací s automatickým spuštěním testů, scope kontrolou, modelovou seberevizí, kontrolou souladu s plánem a následnou lidskou revizí pull requestu. Deklarativní graf v témže snapshotu navíc modeluje samostatné deviation a merge gates. Tato vícevrstvá kontrola omezuje riziko driftu zadání a změn mimo schválený rozsah, nezaručuje však jejich odstranění. Cenou je více přerušení autonomie a závislost na lidských rozhodnutích @darkfactory-e9c10221 @anthropic-managed-agents.

#strong[Kontext a perzistence stavu.]
V souladu s poznatky o degradaci vybavení informací v dlouhém kontextu @liu2024 DarkFactory externalizuje významnou část pracovního stavu do git/GitHub artefaktů a při vyčerpání kvóty také do checkpointu. Jednotlivé agentní fáze dostávají účelově sestavené prompty s požadavkem, plánem, diffem nebo bezprostředním chybovým výstupem podle daného kroku. Statická inspekce však neměří skutečnou délku kontextu, tokenové náklady ani kvalitu výběru informací; z této architektury proto nelze samostatně odvodit úsporu tokenů ani vyšší přesnost modelu @darkfactory-e9c10221.

#strong[Deterministické kontroly jako protiváha stochastické generace.]
Softwarové inženýrství nabízí agentům strojově ověřitelnou zpětnou vazbu testů a dalších projektových kontrol. V hodnocené produkční cestě je deterministické samotné spuštění deklarovaných testovacích sad a file-scope kontrola, zatímco code review a plan alignment znovu používají model. Runner předává první chybový výstup opravnému kroku, ale před commitem po této opravě povinně neopakuje testovací sadu. Snapshot proto dokládá kombinaci deterministických a modelových kontrol, nikoli plně deterministickou end-to-end verifikaci @darkfactory-e9c10221.


#heading(level: 1)[Závěr]

Jazykový model sám o sobě pouze generuje výstup v závislosti na vstupním kontextu. Agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design. Ani toto propojení však pro účinné nasazení ve vývoji softwaru nestačí bez postupů Agentického inženýrství, které vymezují rozsah autonomie, určují body lidského rozhodnutí a zajišťují ověřování výsledků.

Analýza pipeline DarkFactory doložila, jak lze takový systém realizovat v praxi: řídí průchod požadavku, vytváří izolovanou větev, spouští projektové testy, kontroluje rozsah změn, při vyčerpání kvóty ukládá checkpoint a předává výsledek k lidské revizi. Zároveň odhalila konkrétní omezení produkčního runneru: po automatickém opravném kroku není v této revizi před commitem vynucen nový úplný běh testovací sady.

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
