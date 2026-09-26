// Styles: typefaces, page geometry, headings, code, figures and the draft marking all
// live in ./styles. This file is the thesis text.
//
// `apply` wraps everything below it, so every `#set`/`#show` rule in ./styles reaches
// the text. Rules written here at the top level apply too, and win over it — which is
// how the footer is switched on once the front matter is over.
#import "styles/main.typ": apply, nadpis-bez-cisla, meta, page-footer, draft

#set document(title: meta.title, author: meta.author, date: none)

#show: apply

#set page(footer: none)

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

#set page(footer: page-footer)


//intro
#heading(level: 1)[Úvod]

Nástroje založené na velkých jazykových modelech prošly rychlým vývojem: od doplňování kódu při psaní v editoru přes konverzační chatboty až po autonomní agenty, kteří pomocí nástrojů samostatně provádějí změny a spouštějí příkazy v běhovém prostředí @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. S rostoucími schopnostmi modelů roste i jejich adopce, avšak většina uživetelů nemá představu čeho tyto nástroje jsou skutečně schopny. Většina populace se s generativní AI setkává jenom na povrchu prostřednictvím chatbotů a to bezplatným tedy omezeným přístupem. Odhad zdroje klade počet uživatelů chatbotů na 28% populace zatímco pravidelné užití AI coding agents pouze na 0,36~% světové populace@gradually-ai-usage-2026.

#figure(
  image("img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu. Hodnota 30 milionů pravidelných uživatelů coding agents, přibližně 0,36~% světové populace, je redakční střed odhadovaného rozmezí 25--35 milionů @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění příkazů, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.

#box[
  #set par(justify: true)
  #strong[Poznámka k terminologii.] Anglické #strong[agentic] nemá v češtině ustálený překlad; pro potřeby této práce je mu přiřazeno tvořené přídavné jméno #strong[agentické]. Rozdíl mezi dvěma výrazy, které se v běžném užívání zaměňují, je přitom zásadní. #strong[Agentní] označuje vlastnost agenta, tedy toho, kdo jedná; #strong[agentický] označuje vlastnost systému, tedy toho, kdo je *schopen* jednat. Jazykový základ tomu odpovídá: anglické #strong[agentic] je odvozeno od podstatného jména #strong[agent] příponou #strong[-ic] a znamená mající schopnost, prostředky nebo pravomoc jednat, nikoli samo jednajícího @mw-agentic. V této práci je proto #strong[agentické] užíváno výhradně v druhém smyslu: agentické inženýrství není stavbou agentů, ale návrhem systémů, které se takovým chováním vyznačují.
]


#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak harness dělá z jazykového modelu autonomního agenta a jaké postupy umožňují využívat agenty účinně a kontrolovaně.

Praktická část analyzuje DarkFactory, jednoduchou produkční pipeline pro AI-asistovaný softwarový vývoj. GitHub je v ní vývojovým prostředím, GitHub Actions zajišťuje běhy, Docker kontejner odděluje prostředí, Github Issues slouží jako plánovací/stavový systém a pythonovský řadič ve spolupráci s produkčními harnessy (#strong[`claude`], #strong[`agy`], #strong[`codex`], #strong[`opencode`]) realizuje interpretaci, plánování, implementaci, revizi a integraci změn. Jejich skutečná rozhraní uvádí @architektura.

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

Agentické inženýrství (#strong[Agentic Engineering]) označuje soubor postupů, jimiž se vývoj softwaru pomocí coding agentů stává účinným, kontrolovaným, opakovatelným a škálovatelným @willison-agentic-engineering. Jeho předmětem není samotný agent ani jeho model, ale systém, v němž agent pracuje: zadání, omezení, nástroje, pravidla integrace a odpovědnost člověka. Odtud také jeho popis jako archetypu #strong[agentického inženýra], jehož přidanou hodnotu už netvoří psaní kódu, ale formulace zadání, řízení agentních běhů a kritické posouzení strojem vytvořených výstupů @alenezi2026agentic. Mezi hlavní oblasti patří: #strong[Prompt Engineering], #strong[Context Engineering], #strong[Harness Engineering], #strong[Loop Engineering] a #strong[Workflow/Graph Engineering] @openai-prompt-engineering @anthropic-context-engineering @anthropic-harness-design @openai-agents-sandbox @openai-agent-orchestration. Cílem je, aby vývojář mohl efektivně a kontrolovaně delegovat dílčí úkoly agentovi, aniž by ztratil přehled o záměru, rozsahu a kvalitě výsledku.


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
1. *GitHub jako zdroj pravdy:* issue a jeho komentáře uchovávají požadavek, schválení, plán a zpětnou vazbu; větev, commit a pull request uchovávají změnu a její průběžnou revizi @github-branches @github-pull-requests.
2. *GitHub Actions jako výpočetní prostředí:* jednotlivé události spouštějí krátké workflow, která checkoutují repozitář, sestaví obraz, spustí agenta a provedou následnou integraci.
3. *Python a Docker jako izolační vrstva:* workflow předá událost a pracovní strom pythonovskému runneru v kontejneru; runner volá harness a předává mu nástroje, přihlašovací údaje a stav úlohy.
4. *Review smyčka jako podmínka integrace:* automatická revize diffu, opravy a další revize se opakují do té doby, než se uzavře poslední nález; teprve poté je pull request předán člověku.

Metodika sama se řídí tvrzením práce. Pythonovský runner, o kterém tato část pojednává, byl napsán co nejjednodušeji pomocí produkčních coding agentů, tedy právě těm nástroji, které následně popisuje. Cílem nebyla stavba co nejucelenějšího systému, ale co nejmenší uzavřená smyčka, na níž lze ukázat, jak se navzájem ovlivňují agent, harness a lidský recenzent. Pozornost je proto soustředěna na tuto interakci a na její členění, nikoli na šíři nabízených funkcí.

Zjednodušení je záměrné a má svou cenu. Systém bez vlastního stavového serveru, bez databáze a bez trvalého běžícího procesu je na první pohled méně schopný než plnohodnotná platforma, oproti níž je však reprodukovatelný, dohledatelný a jehož každé rozhodnutí zůstává vidět v issue, commitu nebo průběhu kontroly. Zároveň umožňuje zvyšovat složitost postupně: každý nový prvek pipeline byl přidán až poté, co bylo na konkrétní úloze zřejmé, že současná podoba nestačí. Samotná pipeline se tak stala nástrojem, kterým byla psána i další její část.

#heading(level: 2)[Architektura produkčního běhu] <architektura>

DarkFactory nepotřebuje pro základní průchod samostatný server, databázi ani běžícího agenta na vlastním počítači. GitHub slouží jako rozhraní i jako trvalý stavový systém, každá práce agenta probíhá jako izolovaný běh v GitHub Actions.

#figure(
  image("img/darkfactory-architecture.svg", width: 92%),
  caption: [Architektura: GitHub poskytuje události a vývojový stav, GitHub Actions výpočet, Docker odděluje běh a pythonovský runner převádí událost na agentní krok. Produkční harnessy `claude`, `codex`, `opencode` a `agy` zajišťují model, nástroje a pozorování @darkfactory-d576ec8f.],
) <fig-darkfactory-architecture>

#figure(
  image("img/darkfactory-pipeline.svg", width: 92%),
  caption: [Průchod požadavku: implementace a plánování jsou odděleny lidskými bránami, implementace probíhá na větvi a review smyčka pokračuje do vyřešení nálezů @darkfactory-d576ec8f.],
) <fig-darkfactory-pipeline>

Workflow `agent.yml` reaguje na otevření issue, nový komentář, review komentář, `repository_dispatch` nebo ruční spuštění. Podmínka na úrovni jobu ověřuje, zda je agent pro repozitář povolen, a filtruje automatické komentáře, aby vlastní výstup pipeline nevytvářel nové události. Po volbě cílového repozitáře workflow checkoutuje jeho pracovní kopii, sestaví obraz podle `docker/Dockerfile.agent` a spustí příkaz `dispatch` v kontejneru.

Pythonový runner není náhradou harnessu. Je rozhodovací a integrační vrstvou, která převádí událost GitHubu na konkrétní agentní krok, zpracovává jeho výstup a vyvolává další událost. Modelové kroky jsou přitom stále prováděny harnessem nad explicitně předaným pracovním stromem @darkfactory-d576ec8f.

Každý harness je tak definován deklarativně: binář, způsob, jak se z promptu sestaví příkazová řádka, a způsob přihlášení. Přidání harnessu je tak změna dat, nikoli kódu. @fig-harness-interfaces uvádí rozhraní skutečně používaná v popisované revizi; `<prompt>` je zadání, `<model>` vybraný model a `<dur>` časový limit.

// The invocation each harness is declared with, together with the version of the tool
// against which the declaration was checked. `<ver>` is the version captured on
// 2026-09-27; `claude` could not be captured locally and rests on its published
// documentation, which is marked as such rather than presented as a capture.
#let harness-interfaces = (
  "antigravity   agy 1.2.10",
  "  --print <prompt> --model <model> --dangerously-skip-permissions --print-timeout <dur>",
  "claude        claude (dokumentace, nezachyceno)",
  "  --print <prompt> --model <model> --output-format text --dangerously-skip-permissions",
  "gemini        gemini 0.55.1",
  "  -p <prompt> --model <model> --yolo",
  "codex         codex-cli 0.155.1",
  "  exec <prompt> --model <model> --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check",
  "kimi          kimi 0.42.0",
  "  --prompt <prompt> --model <model> --output-format text --yolo",
  "grok          grok 1.0.30",
  "  --single <prompt> --model <model> --always-approve",
  "cursor        cursor-agent 2026.08.11",
  "  --print <prompt> --model <model> --force",
  "opencode      opencode 1.18.32",
  "  run <prompt> --model <model> --auto",
)

#figure(
  raw(block: true, harness-interfaces.join("\n")),
  caption: [Rozhraní produkčních harnessů: název v registru, binář a ověřená verze, poté příkazová řádka, kterou z bináře runner sestavuje. Deklarace odpovídá revizi @darkfactory-d576ec8f, verze byly zkontrolovány 27. září 2026.],
) <fig-harness-interfaces>

Sleduje se tím vlastní argument práce. Harness není abstraktní pojem, ale konkrétní program s konkrétní volbou přepínačů, a právě tato volba určuje, zda model smí spouštět příkazy bez dotazu a v jakém formátu vrací odpověď.

Kontrola proti nainstalovaným nástrojům zároveň odhalila, že deklarativní registr chrání před přejmenováním přepínače, nikoli před změnou jeho významu. V uvedené revizi se u `kimi` uvádí `--yolo` jako způsob, jak modelu povolit vše bez dotazování. Verze 0.42.0 tento přepínač stále přijímá, ale popisuje jej jako režim *Ask When Needed*, v němž se rizikové akce, otázky a plány ptají dál; úplně neomezený režim se nyní jmenuje `--auto`. Překlepnutí v registru by se tedy neprojevilo chybou, ale tiššým omezením oprávnění. Je to konkrétní důkaz toho, že popsané rozhraní je snímek stavu a nikoli trvalá vlastnost, a je proto součástí závěrů v kapitole @diskuse.

Přihlašovací údaje se neukládají do repozitáře. GitHub App nebo jiný autorizovaný token se používá pro checkout, issue, pull requesty a push; přihlašovací údaje modelových providerů jsou předány workflow jako GitHub Secrets a následně prostředím kontejneru. Tím pipeline odděluje své automatizační oprávnění od přihlašovacího materiálu agenta a umožňuje změnit poskytovatele bez změny pracovního stromu @darkfactory-d576ec8f.


#heading(level: 2)[Interpretace a plánování požadavku]

Výchozím bodem je issue s formulovaným požadavkem. Runner načte jeho titulek a text, vyžádá si od modelu interpretaci a zapíše výsledek jako komentář. Komentář má oddělit doslovné shrnutí požadavku, architektonický rozsah a návrh verifikace. Tím se z chatové odpovědi stane zkontrolovatelný návrh, který lze před dalším během přijmout nebo opravit.

Po schválení interpretace je workflow spuštěno znovu. Model nyní dostane schválený požadavek a sestaví implementační plán, ve kterém uvádí očekávané změny, soubory nebo oblasti repozitáře a kroky ověření. Plán se opět zobrazí v issue. Schválení je tak explicitní bránou: samotná schopnost agenta plán vytvořit neznamená oprávnění měnit kód.

Zpětná vazba člověka není součástí nového vývoje od začátku. Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se opravuje rozhodnutí před vytvořením pracovní větve. Tento jednoduchý model odděluje porozumění zadání, plánování a vlastní implementaci bez potřeby složitého grafového orchestrátoru @darkfactory-d576ec8f.


#heading(level: 2)[Implementace a automatická revize]

Po schválení plánu runner vytvoří nebo načte pracovní větev odvozenou z výchozí větve. Implementační instrukce obsahuje schválený plán, omezení na jeho rozsah a pravidla pro testy a dokumentaci. Harness následně může procházet repozitář, upravovat soubory a používat nástroje nad `/workspace`; změny zůstávají izolované mimo výchozí větev.

Po implementaci runner spustí dostupné formátovací nástroje a deklarované testovací sady. Při neúspěchu předá výstup kontroly agentnímu kroku `fix`, který má opravit chybu bez opuštění schváleného rozsahu. Následně runner vytvoří commit, odešle větev a otevře draft pull request. Tím se oddělí samotná změna od jejího posouzení: implementace může být dokončena, ale pull request ještě není připraven k merge @darkfactory-d576ec8f.

Na draft pull requestu začíná automatická review smyčka. Každá iterace načte aktuální větev a diff, provede deterministickou kontrolu souborů proti plánu a následně předá diff modelové revizi. Pokud review najde chyby, chybějící testy, nevhodný rozsah nebo jiný problém, runner zveřejní nález a spustí nový GitHub Actions běh s fází opravy. Oprava změní větev a spustí další review. Smyčka pokračuje, dokud review nevrátí žádný akční nález; opakovaný stejný nález bez progresu se naopak označí jako zablokovaný stav @darkfactory-d576ec8f.

Po čisté review ještě proběhne kontrola souladu výsledného diffu se schváleným plánem. Teprve když jsou čisté obě kontroly, je draft pull request označen jako připravený k lidské revizi. Tento krok je důležitý, protože automatická revize může skončit bez nálezu, aniž by sama zaručila, že implementace odpovídá původnímu zadání.


#heading(level: 2)[Zpětná vazba, schválení a úklid]

Po otevření pro lidskou revizi může člověk použít schvalovací workflow nebo zpětnou vazbu na pull requestu. Změnový požadavek zachycuje runner jako opravný běh na stejné větvi. Agent obdrží plán, konkrétní feedback a aktuální kontext větve, provede úpravu, commitne ji a znovu spustí automatickou review smyčku. Tím se zpětná vazba nevrací do schváleného plánu ani nevyžaduje nový počátek celého požadavku; zachovává se pouze řetězec revizí na jednom pull requestu @darkfactory-d576ec8f.

Schválení pull requestu zpracovává samostatný workflow. Po ověření, že akci provedl autor issue nebo oprávněný člen repozitáře, převede draft na ready stav, zkontroluje požadované schválení a zapne merge. Při úspěchu se použije `--delete-branch`, takže se pracovní větev po sloučení odstraní. Integrace tedy nekončí pouhým otevřením pull requestu: zahrnuje přechod do ready, splnění ochrany větve, merge a bezpečné odstranění větve @github-pull-requests @darkfactory-d576ec8f.

Tato architektura je záměrně jednoduchá. GitHub poskytuje události, schválení, uložení změn a průběh kontroly. GitHub Actions poskytuje výpočet. Docker odděluje běh, Python koordinuje, harness vykonává agentní práci. Složitější služby, trvalý stavový server a více souběžných agentů jsou záměrně mimo základní návrh. Výhodou je snadná reprodukovatelnost a viditelnost každého rozhodnutí. Výhodou je zároveň závislost na dostupnosti GitHubu a na kvalitě promptu, modelu a pravidel repozitáře, kterou samotná automatizace neodstraňuje.

#draft[
  Popsaný průchod odpovídá počátečnímu stavu, kdy pythonovský runner volal cizí produkční CLI. Pozdější revize @darkfactory-e9c10221 tuto vrstvu zrušila: veškeré agentní kroby vedou přes vlastní harness `df`, který si sám volí model a přepíná poskytovatele, a externí CLI zůstávají jen jako zapsané, neinstaltované položky registru. Pro práci má to dva důsledky, které ještě nejsou rozhodnuté. Zaprvé se tím argumentace musí opřít o revizi, v níž dané rozhraní ještě existovala, což je slabší místo, než kdyby praktická část popisovala vlastní nástroj. Zadruhé se nabízí otázka, zda vlastní harness není vhodnější předmět praktické části právě proto, že jeho rozhraní lze popsat úplně a jeho změny jsou autorově vlastní. Zatím je tedy tato poznámka návrhem k doplnění, nikoli závěrem.
]



#heading(level: 1)[Výsledky a diskuse] <results-section>


#heading(level: 2)[Zjištění] <results-first>

První zjištění se týká volby vývojového prostředí. Požadavek, jeho schválení, plán, zpětná vazba i výsledná revize zůstávají v GitHubu, takže jednotlivé běhy nemusí sdílet vlastní databázi ani trvalý proces. GitHub Actions přijme událost, připraví checkout a kontejner a následně spustí pythonovský runner. Runner předá práci harnessu a výsledek převede zpět do issue, větve nebo pull requestu @darkfactory-d576ec8f.

Druhé zjištění potvrzuje oddělení lidského rozhodnutí od modelového návrhu. Issue nejprve vyvolá interpretaci, následně plán a teprve po schválení obou kroků se vytvoří pracovní větev a spustí implementace. Tím pipeline nevytváří změny v hlavní větvi pouze na základě samotného návrhu agenta @darkfactory-d576ec8f.

Třetí zjištění se týká průběhu revize. Implementace je nejprve odevzdána jako draft pull request. Automatická kontrola nejprve porovná změněné soubory se schváleným plánem a poté předá diff modelové review. Nalezené problémy spouštějí samostatný běh opravy, po němž následuje nová kontrola. Teprve čistá review a kontrola souladu s plánem otevřou pull request pro lidskou revizi @darkfactory-d576ec8f.

Čtvrté zjištění se týká zpětné vazby a integrace. Změnový požadavek na pull requestu spouští opravu na stejné větvi a po pushi znovu vstupuje do review smyčky. Schválení pull requestu naopak spouští merge s odstraněním větve. Pipeline tedy nekončí automatickým vytvořením kódu, ale přechází do explicitního lidského schválení a následné integrace @darkfactory-d576ec8f.



#heading(level: 2)[Diskuse] <diskuse>

Zjištění lze interpretovat jako konkrétní podobu Agentického inženýrství: praktická autonomie není vlastností samotného modelu, ale výsledkem návrhu prostředí, v němž model pracuje. GitHub poskytuje trvalý kontext a lidskou odpovědnost, Python určuje přechody mezi kroky, Docker omezuje běhové prostředí a harness propojuje model s nástroji a pozorováními. Tato dělba odpovědnosti je v souladu s principy efektivního a kontrolovaného systému popsanými v teoretické části @anthropic-harness-design @anthropic-managed-agents @darkfactory-d576ec8f.

Review smyčka ukazuje výhodu a zároveň omezení průběžné kontroly. Deterministická scope kontrola může zachytit změnu mimo plán a testy mohou poskytnout konkrétní zpětnou vazbu, ale modelová revize zůstává pravděpodobnostní. Opakované iterace zvyšují počet příležitostí k nálezu, nikoli záruku konečné správnosti. Zablokování při opakování stejného nálezu je proto rozumnou ochranou před nekonečným během, nikoli důkazem vyřešení problému @darkfactory-d576ec8f.

Jednoduchost návrhu má také ekonomickou a epistemickou cenu. Nevyžaduje databázi, dlouho běžícího agenta ani samostatnou orchestrátorskou službu, a celý průběh je dohledatelný v issue, commitech, kontrolách a pull requestu. Na druhé straně pipeline závisí na dostupnosti GitHubu, kvalitě issue, schopnosti modelu pracovat s nástroji a pravidlech, která definují akceptační podmínky. Jednoduchá architektura tedy usnadňuje reprodukci postupu, ale nenahrazuje odpovědnost člověka za architekturu, bezpečnost a přijetí výsledku @darkfactory-d576ec8f.

Deterministické a modelové kontroly se proto doplňují, nenahrazují. Formátovací nástroje, testy a kontrola scope poskytují opakovatelné pozorování; modelové review, plánování a opravy interpretují zadání a neočekávané nálezy. Tato kombinace odpovídá cíli Agentického inženýrství zvýšit užitečnost delegované práce při zachování explicitních bran, ale její skutečná kvalita zůstává závislá na datech, promptu, modelu a konkrétním repozitáři @darkfactory-d576ec8f.



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
