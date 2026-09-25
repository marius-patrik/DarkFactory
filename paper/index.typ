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

  title: "AI asistované softwarové inženýrství",
  practical-title: "DarkFactory",

  annotation-cs: [
    Práce zkoumá přechod od konverzační asistence k delegovanému agentnímu vývoji a roli harnessu jako běhového a integračního prostředí coding agenta. Cílem je vysvětlit, jak propojení jazykového modelu s nástroji, stavem, verifikací a lidskými kontrolními body umožňuje řízené provádění softwarových úloh v praxi. Agentické inženýrství práce vymezuje jako soubor postupů, které činí AI-asistovaný vývoj účinným, kontrolovaným, opakovatelným a škálovatelným. Teoretická část vychází z odborných publikací a dokumentace nástrojů. Praktická část implementuje jednoduchou produkční pipeline DarkFactory, v níž je GitHub vývojovým prostředím, GitHub Actions výpočetním prostředím, kontejner izolační vrstvou a GitHub Issues stavovým systémem. Je popsáno přijetí a plánování požadavku, lidské schválení, izolovaná implementace na větvi, automatická review smyčka, zpětná vazba, merge a odstranění větve. Výsledky ukazují, že praktická autonomie vzniká především rozdělením odpovědnosti mezi model, harness, GitHub a člověka.
  ],
  abstract-en: [
    This thesis examines the transition from conversational assistance to delegated agentic development and the role of the harness as the runtime and integration environment of a coding agent. Its objective is to explain how connecting a language model to tools, state, verification, and human control points enables the controlled execution of software tasks in practice. Agentic Engineering is defined as a set of practices that make AI-assisted development efficient, controlled, repeatable, and scalable. The theoretical part is based on academic publications and tool documentation. The practical part implements a simple production pipeline, DarkFactory, in which GitHub is the development environment, GitHub Actions is the execution environment, a container provides isolation, and GitHub Issues serves as the state system. It describes request intake and planning, human approval, isolated implementation on a branch, an automatic review loop, feedback, merging, and branch deletion. The findings indicate that practical autonomy arises primarily from the division of responsibility among the model, the harness, GitHub, and the human.
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
//TODO: add a mention that for the purpose of this thesis the word Agentic is translated to czech as "Agentické" being an anglicism in the czech langauge, but this is not yet established so I am the one coining this the point is that agentni is not the same as agentic, agentic is a property of the system, agentni is a property of the agent. Agentic engineering is about designing systems that are agentic, not about designing agents. The word "agentické" is used to describe the engineering practices that make a system agentic, not to describe the agents themselves or something that belongs to them.
#heading(level: 1)[Úvod]

Nástroje založené na velkých jazykových modelech prošly rychlým vývojem: od doplňování kódu při psaní v editoru přes konverzační chatboty až po autonomní agenty, kteří pomocí nástrojů samostatně provádějí změny a spouštějí příkazy v běhovém prostředí @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. S rostoucími schopnostmi modelů roste i jejich adopce, avšak většina uživetelů nemá představu čeho tyto nástroje jsou skutečně schopny. Většina populace se s generativní AI setkává jenom na povrchu prostřednictvím chatbotů a to bezplatným tedy omezeným přístupem. Odhad zdroje klade počet uživatelů chatbotů na 28% populace zatímco pravidelné užití AI coding agents pouze na 0,36~% světové populace@gradually-ai-usage-2026.

#figure(
  image("img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu. Hodnota 30 milionů pravidelných uživatelů coding agents, přibližně 0,36~% světové populace, je redakční střed odhadovaného rozmezí 25--35 milionů @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění příkazů, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.


#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak harness dělá z jazykového modelu autonomního agenta a jaké postupy umožňují využívat agenty účinně a kontrolovaně.

Praktická část analyzuje DarkFactory, jednoduchou produkční pipeline pro AI-asistovaný softwarový vývoj. GitHub je v ní vývojovým prostředím, GitHub Actions zajišťuje běhy, Docker kontejner odděluje prostředí, Github Issues slouží jako plánovací/stavový systém a pythonovský řadič ve spolupráci s produkčními harnessy např claude, agy, codex nebo opencode realizuje interpretaci, plánování, implementaci, revizi a integraci změn.
//mark the harnesses strong put them in brackets and add examples of the actual harness interfaces via screenshot

#heading(level: 1)[Teoretická část]


#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Jazykový model (#strong[LLM]) předpovídá další token na základě předešlých obsaženém v #strong[kontextu]. #strong[Transformer] využívá mechanismu attention @vaswani2017 @brown2020 pro zpracování vztahů mezi jednotlivými tokeny. Při inferenci model zpracuje obsah kontextového okna a vytvoří posloupnost výstupních tokenů. Samotná #strong[Inference] však nemění soubory, nespouští příkazy ani neuchovává stav mezi kroky. Tyto činnosti zajišťuje harness, který modelu zpřístupňuje nástroje a pomocí rekursivního procesu zvaného ReAct dělá z jednotné generace souvislou konverzaci @anthropic2024tooluse.

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

Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy, když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdíleného stavu a integračních kontrol. Orchestrace je však nezbytná pro rozsáhlé úlohy, které by nebylo možné implementovat v rozsahu jednoho kontextového okna, spolehání na kompakci by vedlo ke katastrofické divergenci a kdybyse agent soustředil na celek nebyl by schopen efektivně implementovat jednotné části zadaní.

#strong[Goal loop] označuje nadřazenou řídicí smyčku: po dílčím dokončení ReAct smyčky harness porovná pozorovaný stav s cílem a podmínkami přijetí a podle výsledku běh ukončí, nebo zahájí další iteraci či změnu strategie. @yao2022.

#strong[human-in-the-loop] (#strong[HITL]) označuje bod kde se do automatizované smyčky doplní kontrolní brány, v nichž je vyžadováno explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak může ponechat agentovi ohraničenou implementační práci a současně si zachovat odpovědnost za záměr a integraci.

#pagebreak(weak: true)
#align(center)[
  #set par(justify: false)
  #v(1fr)
  #text(size: 15pt, tracking: 2pt)[PRAKTICKÁ ČÁST]
  #v(0.8cm)
  #text(size: 24pt, weight: "bold", hyphenate: false)[DarkFactory]
]
#pagebreak(weak: true)


#heading(level: 1)[Praktická část]


#heading(level: 2)[Metodika] <practical-first>

Praktická část implementuje záměrně jednoduchou produkční pipeline, v níž je vývojovým prostředím přímo GitHub a harness produkční coding agent. Cílem je ukázat, jak lze spojit události GitHubu, automatizované plánování, izolovanou práci v kontejneru a lidskou integraci do jednoho opakovatelného procesu.

Předmětem analýzy jsou čtyři navazující vrstvy:
1. *GitHub jako zdroj pravdy:* issue a jeho komentáře uchovávají požadavek, schválení, plán a zpětnou vazbu; větev, commit a pull request uchovávají změnu a její průběžnou revizi.
2. *GitHub Actions jako výpočetní prostředí:* jednotlivé události spouštějí krátké workflow, která checkoutují repozitář, sestaví obraz, spustí agenta a provedou následnou integraci.
3. *Python a Docker jako izolační vrstva:* workflow předá událost a pracovní strom pythonovskému runneru v kontejneru; runner volá harness a předává mu nástroje, přihlašovací údaje a stav úlohy.
4. *Review smyčka jako podmínka integrace:* automatická revize diffu, opravy a další revize se opakují do té doby, než se uzavře poslední nález; teprve poté je pull request předán člověku.

//the methodology should be described as implementing the inital python as simple as possible via production coding agents to make the point of the thesis, not to implement a complex system. The goal is to show how the harness and the agent can be used in a simple production pipeline, not to create a fully-featured system. The focus is on the interaction between the agent, the harness, and the human reviewer, and how this interaction can be structured to achieve effective and controlled software development. we should mention that well use the implemented pipeline itself to add further complexity tothe system over time

#heading(level: 2)[Architektura produkčního běhu]

DarkFactory nepotřebuje pro základní průchod samostatný server, databázi ani běžícího agenta na vlastním počítači. GitHub slouží jako rozhraní i jako trvalý stavový systém, každá práce agenta probíhá jako izolovaný běh v GitHub Actions.

#figure(
  image("img/darkfactory-architecture.svg", width: 92%),
  caption: [Architektura: GitHub poskytuje události a vývojový stav, Docker odděluje běh a produkční harness `agy` `claude` `codex` či `opencode` nebo později vlastní `df` zajišťují model, nástroje a pozorování @darkfactory-e9c10221.],
) <fig-darkfactory-architecture>

#figure(
  image("img/darkfactory-pipeline.svg", width: 92%),
  caption: [Průchod požadavku: implementace a plánování jsou odděleny lidskými bránami, implementace probíhá na větvi a review smyčka pokračuje do vyřešení nálezů @darkfactory-e9c10221.],
) <fig-darkfactory-pipeline>

Workflow `agent.yml` reaguje na otevření issue, nový komentář, review komentář, `repository_dispatch` nebo ruční spuštění. Podmínka na úrovni jobu ověřuje, zda je agent pro repozitář povolen, a filtruje automatické komentáře, aby vlastní výstup pipeline nevytvářel nové události. Po volbě cílového repozitáře workflow checkoutuje jeho pracovní kopii, sestaví obraz podle `docker/Dockerfile.agent` a spustí příkaz `dispatch` v kontejneru.

Pythonový runner není náhradou harnessu. Je rozhodovací a integrační vrstvou, která převádí událost GitHubu na konkrétní agentní krok, zpracovává jeho výstup a vyvolává další událost. Modelové kroky jsou přitom stále prováděny harnessem nad explicitně předaným pracovním stromem @darkfactory-e9c10221.

Přihlašovací údaje se neukládají do repozitáře. GitHub App nebo jiný autorizovaný token se používá pro checkout, issue, pull requesty a push; přihlašovací údaje modelových providerů jsou předány workflow jako GitHub Secrets a následně prostředím kontejneru. Tím pipeline odděluje své automatizační oprávnění od přihlašovacího materiálu agenta a umožňuje změnit poskytovatele bez změny pracovního stromu @darkfactory-e9c10221.


#heading(level: 2)[Interpretace a plánování požadavku]

Výchozím bodem je issue s formulovaným požadavkem. Runner načte jeho titulek a text, vyžádá si od modelu interpretaci a zapíše výsledek jako komentář. Komentář má oddělit doslovné shrnutí požadavku, architektonický rozsah a návrh verifikace. Tím se z chatové odpovědi stane zkontrolovatelný návrh, který lze před dalším během přijmout nebo opravit.

Po schválení interpretace je workflow spuštěno znovu. Model nyní dostane schválený požadavek a sestaví implementační plán, ve kterém uvádí očekávané změny, soubory nebo oblasti repozitáře a kroky ověření. Plán se opět zobrazí v issue. Schválení je tak explicitní bránou: samotná schopnost agenta plán vytvořit neznamená oprávnění měnit kód.

Zpětná vazba člověka není součástí nového vývoje od začátku. Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se opravuje rozhodnutí před vytvořením pracovní větve. Tento jednoduchý model odděluje porozumění zadání, plánování a vlastní implementaci bez potřeby složitého grafového orchestrátoru @darkfactory-e9c10221.


#heading(level: 2)[Implementace a automatická revize]

Po schválení plánu runner vytvoří nebo načte pracovní větev odvozenou z výchozí větve. Implementační instrukce obsahuje schválený plán, omezení na jeho rozsah a pravidla pro testy a dokumentaci. Harness následně může procházet repozitář, upravovat soubory a používat nástroje nad `/workspace`; změny zůstávají izolované mimo výchozí větev.

Po implementaci runner spustí dostupné formátovací nástroje a deklarované testovací sady. Při neúspěchu předá výstup kontroly agentnímu kroku `fix`, který má opravit chybu bez opuštění schváleného rozsahu. Následně runner vytvoří commit, odešle větev a otevře draft pull request. Tím se oddělí samotná změna od jejího posouzení: implementace může být dokončena, ale pull request ještě není připraven k merge @darkfactory-e9c10221.

Na draft pull requestu začíná automatická review smyčka. Každá iterace načte aktuální větev a diff, provede deterministickou kontrolu souborů proti plánu a následně předá diff modelové revizi. Pokud review najde chyby, chybějící testy, nevhodný rozsah nebo jiný problém, runner zveřejní nález a spustí nový GitHub Actions běh s fází opravy. Oprava změní větev a spustí další review. Smyčka pokračuje, dokud review nevrátí žádný akční nález; opakovaný stejný nález bez progresu se naopak označí jako zablokovaný stav @darkfactory-e9c10221.

Po čisté review ještě proběhne kontrola souladu výsledného diffu se schváleným plánem. Teprve když jsou čisté obě kontroly, je draft pull request označen jako připravený k lidské revizi. Tento krok je důležitý, protože automatická revize může skončit bez nálezu, aniž by sama zaručila, že implementace odpovídá původnímu zadání.


#heading(level: 2)[Zpětná vazba, schválení a úklid]

Po otevření pro lidskou revizi může člověk použít schvalovací workflow nebo zpětnou vazbu na pull requestu. Změnový požadavek zachycuje runner jako opravný běh na stejné větvi. Agent obdrží plán, konkrétní feedback a aktuální kontext větve, provede úpravu, commitne ji a znovu spustí automatickou review smyčku. Tím se zpětná vazba nevrací do schváleného plánu ani nevyžaduje nový počátek celého požadavku; zachovává se pouze řetězec revizí na jednom pull requestu @darkfactory-e9c10221.

Schválení pull requestu zpracovává samostatný workflow. Po ověření, že akci provedl autor issue nebo oprávněný člen repozitáře, převede draft na ready stav, zkontroluje požadované schválení a zapne merge. Při úspěchu se použije `--delete-branch`, takže se pracovní větev po sloučení odstraní. Integrace tedy nekončí pouhým otevřením pull requestu: zahrnuje přechod do ready, splnění ochrany větve, merge a bezpečné odstranění větve @darkfactory-e9c10221.

Tato architektura je záměrně jednoduchá. GitHub poskytuje události, schválení, uložení změn a průběh kontroly. GitHub Actions poskytuje výpočet. Docker odděluje běh, Python koordinuje, harness vykonává agentní práci. Složitější služby, trvalý stavový server a více souběžných agentů jsou záměrně mimo základní návrh. Výhodou je snadná reprodukovatelnost a viditelnost každého rozhodnutí. Výhodou je zároveň závislost na dostupnosti GitHubu a na kvalitě promptu, modelu a pravidel repozitáře, kterou samotná automatizace neodstraňuje.



#heading(level: 1)[Výsledky a diskuse] <results-section>


#heading(level: 2)[Zjištění] <results-first>

První zjištění se týká volby vývojového prostředí. Požadavek, jeho schválení, plán, zpětná vazba i výsledná revize zůstávají v GitHubu, takže jednotlivé běhy nemusí sdílet vlastní databázi ani trvalý proces. GitHub Actions přijme událost, připraví checkout a kontejner a následně spustí pythonovský runner. Runner předá práci harnessu a výsledek převede zpět do issue, větve nebo pull requestu @darkfactory-e9c10221.

Druhé zjištění potvrzuje oddělení lidského rozhodnutí od modelového návrhu. Issue nejprve vyvolá interpretaci, následně plán a teprve po schválení obou kroků se vytvoří pracovní větev a spustí implementace. Tím pipeline nevytváří změny v hlavní větvi pouze na základě samotného návrhu agenta @darkfactory-e9c10221.

Třetí zjištění se týká průběhu revize. Implementace je nejprve odevzdána jako draft pull request. Automatická kontrola nejprve porovná změněné soubory se schváleným plánem a poté předá diff modelové review. Nalezené problémy spouštějí samostatný běh opravy, po němž následuje nová kontrola. Teprve čistá review a kontrola souladu s plánem otevřou pull request pro lidskou revizi @darkfactory-e9c10221.

Čtvrté zjištění se týká zpětné vazby a integrace. Změnový požadavek na pull requestu spouští opravu na stejné větvi a po pushi znovu vstupuje do review smyčky. Schválení pull requestu naopak spouští merge s odstraněním větve. Pipeline tedy nekončí automatickým vytvořením kódu, ale přechází do explicitního lidského schválení a následné integrace @darkfactory-e9c10221.



#heading(level: 2)[Diskuse]

Zjištění lze interpretovat jako konkrétní podobu Agentického inženýrství: praktická autonomie není vlastností samotného modelu, ale výsledkem návrhu prostředí, v němž model pracuje. GitHub poskytuje trvalý kontext a lidskou odpovědnost, Python určuje přechody mezi kroky, Docker omezuje běhové prostředí a harness propojuje model s nástroji a pozorováními. Tato dělba odpovědnosti je v souladu s principy efektivního a kontrolovaného systému popsanými v teoretické části @anthropic-harness-design @anthropic-managed-agents @darkfactory-e9c10221.

Review smyčka ukazuje výhodu a zároveň omezení průběžné kontroly. Deterministická scope kontrola může zachytit změnu mimo plán a testy mohou poskytnout konkrétní zpětnou vazbu, ale modelová revize zůstává pravděpodobnostní. Opakované iterace zvyšují počet příležitostí k nálezu, nikoli záruku konečné správnosti. Zablokování při opakování stejného nálezu je proto rozumnou ochranou před nekonečným během, nikoli důkazem vyřešení problému @darkfactory-e9c10221.

Jednoduchost návrhu má také ekonomickou a epistemickou cenu. Nevyžaduje databázi, dlouho běžícího agenta ani samostatnou orchestrátorskou službu, a celý průběh je dohledatelný v issue, commitech, kontrolách a pull requestu. Na druhé straně pipeline závisí na dostupnosti GitHubu, kvalitě issue, schopnosti modelu pracovat s nástroji a pravidlech, která definují akceptační podmínky. Jednoduchá architektura tedy usnadňuje reprodukci postupu, ale nenahrazuje odpovědnost člověka za architekturu, bezpečnost a přijetí výsledku @darkfactory-e9c10221.

Deterministické a modelové kontroly se proto doplňují, nenahrazují. Formátovací nástroje, testy a kontrola scope poskytují opakovatelné pozorování; modelové review, plánování a opravy interpretují zadání a neočekávané nálezy. Tato kombinace odpovídá cíli Agentického inženýrství zvýšit užitečnost delegované práce při zachování explicitních bran, ale její skutečná kvalita zůstává závislá na datech, promptu, modelu a konkrétním repozitáři @darkfactory-e9c10221.



#heading(level: 1)[Závěr]

Jazykový model sám o sobě pouze generuje výstup v závislosti na vstupním kontextu. Agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design. Ani toto propojení však pro účinné nasazení ve vývoji softwaru nestačí bez postupů Agentického inženýrství, které vymezují rozsah autonomie, určují body lidského rozhodnutí a zajišťují ověřování výsledků.

Implementace pipeline DarkFactory ukázala jednoduchou produkční realizaci těchto postupů. GitHub slouží jako vývojové prostředí a místo trvalého stavu, GitHub Actions jako výpočetní prostředí, Docker kontejner jako izolace a produkční harness pro modelovou práci s nástroji. Požadavek prochází interpretací a plánováním, implementace probíhá na samostatné větvi a změna je předána přes draft pull request a opakovací smyčku review--fix. Po čisté review následuje lidské schválení, merge a odstranění větve.

Úloha vývojáře se v tomto uspořádání posouvá od rutinního provádění kódu k formulaci zadání, schvalování plánu, definování akceptačních podmínek a rozhodování, zda je výsledek připraven k integraci. Práce tedy nepopisuje plnou autonomii agenta, ale kontrolované předání vybrané části softwarového inženýrství.

Zjištění zároveň ukazují meze této realizace. Modelové review může být opakované, ale není deterministickou zárukou správnosti; opakovaný nález bez progresu vede k blokaci. 

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
