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
    Odborná práce vymezuje vztah mezi jazykovým modelem, agentem a harnessem v agentickém vývoji softwaru. Popisuje postupy Agentického inženýrství, zejména návrh zadání a kontextu, ověřování, orchestraci a lidskou integraci. Praktická část analyzuje Pythonovou pipeline DarkFactory nad GitHub Actions. Na základě zdrojového kódu a automatizovaných testů popisuje řízený průchod požadavku, kontrolu změn, checkpoint a lidské schvalovací brány.
  ],
  abstract-en: [
    This thesis defines the relationship between a language model, an agent, and a harness in agentic software development. It describes Agentic Engineering practices, especially task and context design, verification, orchestration, and human integration. The practical part analyses the Python DarkFactory pipeline running on GitHub Actions. Using source code and automated tests, it describes a governed request workflow, change control, checkpointing, and human approval gates.
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
jazykové modely; coding agents; harness; Agentické inženýrství; GitHub Actions; DarkFactory

#nadpis-bez-cisla[Keywords]
language models; coding agents; harness; Agentic Engineering; GitHub Actions; DarkFactory
#pagebreak()

#outline(title: [Obsah], depth: 3, indent: 1.4em)

#set page(footer: context {
  align(center, text(font: PISMO, size: 11pt, counter(page).display("1")))
})

#heading(level: 1)[Úvod]

Generativní AI se ve vývoji softwaru používá od doplňování kódu a konverzační podpory až po nástroje, které pracují v repozitáři, spouštějí příkazy a testy a připravují změny k revizi @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. Část činností, které dosud vývojář prováděl přímo, lze proto delegovat na agenta.

Široké používání generativní AI však neznamená stejně rozšířené používání #strong[coding agents]. Odhad Gradually uvádí pravidelné uživatele AI coding agents jako malou část všech uživatelů generativní AI @gradually-ai-usage-2026.

#figure(
  image("img/generated/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle nejpokročilejší používané kategorie. Pravidelní uživatelé AI coding agents tvoří podle Gradually malou část celku @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Práce agenta nad projektem vyžaduje více než vytvoření odpovědi: výběr kontextu, přístup k pracovnímu prostředí, řízení účinků změn, pozorování z testů nebo CI, trvalý stav a rozhodnutí o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents. Jejich propojení umožňuje postupovat od požadavku k ověřené změně v projektu.

#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem je ukázat, jak se jazykový model propojuje s prostředím vývoje softwaru, jakou roli při tom má #strong[harness] a jaké postupy umožňují agenty využívat účinně a kontrolovaně.

Praktickým cílem je popsat, jak DarkFactory organizuje delegovanou práci agenta, a ověřit vybrané mechanismy řízení, kontroly změn a pokračování běhu na základě zdrojového kódu, testů a záznamů CI.

#heading(level: 1)[Teoretická část]

#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Jazykový model předpovídá další token podle tokenů, které mu předcházejí. Architektura jazykových modelů #strong[LLM] je založena na #strong[Transformeru], který využívá mechanismus #strong[attention] ke zpracování vztahů mezi tokeny @vaswani2017 @brown2020. Při #strong[inferenci] model zpracuje obsah #strong[context window] a vytvoří výstup. Model sám však nemění soubory ani nespouští příkazy; provedení navržené akce zajišťuje #strong[harness] @anthropic2024tooluse.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov #strong[king] a #strong[queen] @mikolov2013linguistic.

#figure(
  image("img/vector-embedding-queen.svg", width: 78%),
  caption: [Jednoduchá ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *king* a *queen* podle principu popsaného v @mikolov2013linguistic.],
) <fig-embedding-queen>

#heading(level: 3)[Context window a kompakce]

#strong[Context window] vymezuje informace dostupné při jednom volání modelu. Může obsahovat instrukce, části repozitáře, historii nástrojů i výsledky předchozích kroků. Jeho velikost však sama nezaručuje, že model využije všechny podstatné informace; jejich účinnost závisí také na umístění v dlouhém kontextu @liu2024.

Při delší práci proto harness vybírá, které informace předá do dalšího kroku. #strong[Kompakce] nahrazuje starší průběh strukturovaným souhrnem rozhodnutí, provedených změn a dosavadních výsledků. Zachovává návaznost práce, aniž by se do každého volání vkládal celý přepis předchozí interakce @anthropic-context-engineering.

#heading(level: 2)[Agent a harness]

Agentní systém propojuje jazykový model s nástroji a prostředím, v němž vzniká změna. #strong[Harness] pro tento proces připravuje context window, udržuje stav běhu, zprostředkovává pracovní prostředí a zaznamenává pozorování @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 3)[Smyčka agentního provádění]

V agentní smyčce model navrhne další akci, harness ji předá prostředí a výsledek vrátí jako pozorování. Tento princip odpovídá přístupu #strong[ReAct], v němž se střídá uvažování, jednání a pozorování prostředí @yao2022. Harness určuje, které akce jsou dostupné, jak se provedou a jak se jejich výsledek uloží.

#figure(
  image("img/react-loop.svg", width: 92%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku; princip podle @yao2022.],
) <fig-react-loop>

#heading(level: 3)[Agent a chatbot]

Chatbot poskytuje odpověď v konverzaci; člověk sám vybírá soubory, upravuje projekt, spouští nástroje a rozhoduje o dalším postupu. Agent naproti tomu pracuje v prostředí projektu. Prostřednictvím harnessu může číst a měnit soubory, spouštět příkazy a testy, přijímat jejich výstup a pokračovat podle něj. Rozdíl proto nespočívá pouze v kvalitě vytvářeného textu, ale v účasti na provádění vymezené práce @anthropic2024tooluse @openai-agents-sandbox.

#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství označuje postupy, které umožňují agenty využívat účinně a kontrolovaně. Předmětem návrhu není pouze výsledný software, ale i zadání, kontext, ověřování a způsob integrace výsledku @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 3)[Zadání a kontext]

Delegovaná práce potřebuje explicitní výsledek, rozsah, omezení a podmínky přijetí. Specifikace určuje, co se má změnit i co se změnit nesmí. Při #strong[prompt engineeringu] se formulují instrukce pro konkrétní krok; #strong[context engineering] vybírá zadání, pravidla repozitáře, soubory, historii a výsledky nástrojů pro context window @openai-prompt-engineering @anthropic-context-engineering. Soubor #strong[AGENTS.md] může tato pravidla, příkazy sestavení a ověřování uchovat přímo v repozitáři @agents-md.

#strong[Skills] rozšiřují prostředí o znovu použitelné instrukce, postupy, skripty a zdroje pro určité úlohy @agentskills-spec. #strong[Hooks] reagují na události běhu a mohou zaznamenat postup, spustit kontrolu nebo vynutit pravidlo @openai-agents-lifecycle. #strong[Model Context Protocol] (#strong[MCP]) standardizuje propojení harnessu s externími nástroji, daty a zdroji @mcp-specification. Nejde o samostatné agenty, ale o prostředky, které harness zpřístupňuje a řídí.

#heading(level: 3)[Orchestrace a lidská integrace]

Více agentů může rozdělit, specializovat nebo paralelizovat práci. Ve vzoru #strong[coordinator/subagent] hlavní agent předá dílčí úkol s omezeným kontextem a převezme výsledek k integraci. #strong[Workflow graph] popisuje závislosti, větvení a předání mezi kroky; #strong[swarm] označuje volnější spolupráci více agentů @openai-agent-orchestration @openai-swarm.

#strong[Human-in-the-loop] (#strong[HITL]) vymezuje místa, kde automatizovaný postup vyžaduje lidské rozhodnutí. Člověk může schválit plán, upravit rozsah, vyhodnotit výsledek ověřování nebo přijmout změnu k integraci. Integrace proto vyžaduje nejen technickou kontrolu výsledků a řešení konfliktů, ale i lidskou revizi a převzetí odpovědnosti @github-branches @github-pull-requests.

#heading(level: 1)[Praktická část]

#heading(level: 2)[Metodika] <practical-first>

Praktická část má podobu analýzy softwarového artefaktu. Předmětem je vybraná revize systému DarkFactory identifikovaná v bibliografii @darkfactory-e9c10221. Analýza vychází z konfigurace workflow #strong[GitHub Actions], Pythonového runneru, definice #strong[Docker] prostředí a automatizovaných testů. Tyto podklady umožňují popsat spuštění pipeline, předání práce harnessu, řízení změn i ověření vybraných scénářů.

Analýza rekonstruuje průběh úlohy od události v repozitáři po předání změny k integraci. Zaměřuje se na vytvoření pracovního prostředí, předání úlohy harnessu, práci se stavem a kontroly, které vymezují rozsah provedené změny. Tvrzení o architektuře vycházejí ze zdrojového kódu; testy a záznamy CI ověřují vybrané scénáře.

#heading(level: 2)[DarkFactory]

DarkFactory tvoří Pythonová pipeline nad #strong[GitHub Actions], která spouští agentní harness v #strong[Docker] kontejneru @darkfactory-e9c10221. Pythonový runner připravuje prostředí, spustí harness, předá mu instrukce a zpracuje výsledek jeho běhu.

#figure(
  image("img/darkfactory-python-pipeline.svg", width: 100%),
  caption: [Řídicí workflow Pythonové pipeline DarkFactory. Schéma zachycuje průchod od nového požadavku přes dvě schvalovací brány, implementaci a opakovanou seberevizi až po lidskou revizi pull requestu; větev přerušení odpovídá zachování checkpointu a obnovení běhu @darkfactory-e9c10221.],
) <fig-darkfactory-python-pipeline>

#heading(level: 3)[Spuštění a pracovní prostředí]

Pipeline reaguje na události v repozitáři. Workflow připraví pracovní adresář, sestaví obraz kontejneru a předá runneru údaje o události spolu s pracovním stromem projektu. Runner tak propojuje vstup z GitHubu s izolovaným prostředím, v němž může harness pracovat nad konkrétní verzí repozitáře @darkfactory-e9c10221.

#heading(level: 3)[Průchod delegované úlohy]

Runner převede požadavek na instrukci pro harness a řídí jeho další zpracování. Průchod zahrnuje vytvoření plánu, provedení změn a kontrolu výsledku. Plán vymezuje zamýšlenou práci, pracovní větev odděluje prováděnou změnu od hlavní větve a pull request vytváří bod, v němž lze výsledek posoudit před integrací @darkfactory-e9c10221.

#heading(level: 3)[Řízení změny a pokračování běhu]

Pipeline sleduje rozsah změn a stav pracovního stromu, aby bylo možné rozlišit očekávané a nepovolené účinky provedení. Ukládá rovněž údaje potřebné pro navázání dalšího kroku po přerušení. Testy pokrývají například práci se stavem běhu, obnovení rozpracované úlohy, změnu poskytovatele a kontrolu rozsahu oprávnění @darkfactory-e9c10221. Schválení plánu, revize a integrace zůstávají lidskými rozhodovacími body @darkfactory-request-359.

#heading(level: 1)[Výsledky a diskuse]

#heading(level: 2)[Zjištění] <results-first>

Pythonová pipeline organizuje průchod požadavku jako sled událostí v repozitáři. Po otevření požadavku runner vytvoří interpretaci; následné lidské schválení spouští vytvoření plánu a další schválení jeho implementaci. Workflow připraví pracovní strom, sestaví kontejner a předá runneru údaje o události. Dvě schvalovací brány tak oddělují vymezení požadavku a plánu od změny zdrojového kódu @darkfactory-e9c10221.

Workflow před spuštěním ověřuje, zda je agent pro repozitář povolen, a vynechává komentáře vytvořené boty. Pro přístup k repozitáři používá přihlašovací údaje předané běhu GitHub Actions; pracovní strom je následně připojen do kontejneru, v němž běží Pythonový runner. Tato konfigurace spojuje událost GitHubu, pracovní kopii projektu a agentní běh do jednoho řízeného kroku @darkfactory-e9c10221.

Po schválení plánu pipeline vytvoří pracovní větev a předá implementační instrukci harnessu. Runner následně spustí dostupné formátovací a testovací nástroje; při neúspěchu testů provede jeden opravný krok. Poté vytvoří commit, odešle větev a otevře návrhový pull request. Seberevize pracuje s diffem pull requestu, porovnává změněné soubory s rozsahem plánu a při nálezech spouští opravu a další revizi. Zdrojový kód a testy tak zachycují jak ověřování výsledku, tak kontrolu změn mimo schválený rozsah @darkfactory-e9c10221.

Pokud seberevize nenajde další nález, pipeline porovná výsledný diff s plánem. Při shodě označí pull request jako připravený k lidské revizi; při nesouladu uloží odchylky do komentáře k požadavku a plánu. Přechod k lidskému přijetí je proto podmíněn nejen vytvořením změny, ale také kontrolou jejího vztahu ke schválenému rozsahu @darkfactory-e9c10221.

Runner ukládá checkpoint s údaji potřebnými pro navázání rozpracovaného běhu. Při vyčerpání kvóty uchová postup, označí běh jako blokovaný a umožní jeho obnovení příkazem #strong[/resume]. Testy pokrývají serializaci stavu běhu, obnovení pipeline, změnu poskytovatele i kontrolu rozsahu oprávnění @darkfactory-e9c10221.

#heading(level: 2)[Diskuse]

Zjištěný průchod ukazuje, že delegovaná práce agenta je organizována jako proces nad repozitářem, nikoli jako jednorázová konverzace s modelem. Pythonová pipeline propojuje instrukci s pracovním stromem, nástroji, pozorováním z testů a pull requestem. Tím vytváří prostředí, v němž lze změnu provést, sledovat a předat k posouzení.

Rozdělení rolí je v tomto uspořádání podstatné. Jazykový model vytváří interpretaci, plán nebo návrh změny, zatímco Pythonový runner rozhoduje, kdy se jednotlivý krok provede, jaké údaje získá a jaký následuje další krok. Harness zde vykonává agentní práci v pracovním prostředí; pipeline ji zasazuje do workflow GitHubu a propojuje ji s pravidly repozitáře @darkfactory-e9c10221.

Schvalování interpretace a plánu, kontrola rozsahu, seberevize a lidské přijetí pull requestu odpovídají postupům Agentického inženýrství popsaným v teoretické části. #strong[HITL] zde nefunguje jako zásah až po dokončení práce, ale jako součást průchodu, která vymezuje záměr před implementací a rozhoduje o integraci výsledku. Checkpoint doplňuje tento postup o možnost navázat na již vykonanou práci po přerušení.

Checkpoint nemění obsah schváleného plánu ani nenahrazuje revizi změny. Zachovává stav potřebný pro pokračování běhu, zatímco plán, kontrola rozsahu a pull request nadále vymezují, které změny lze provést a přijmout. Kontinuita práce je tak spojena s kontrolními mechanismy pipeline, nikoli pouze s historií jedné konverzace modelu @darkfactory-e9c10221.

#heading(level: 1)[Závěr]

Jazykový model vytváří výstup v rámci context window; agent vzniká jeho propojením s nástroji, prostředím, stavem a pozorováním. Harness zajišťuje toto propojení a vytváří podmínky pro řízené provádění práce v repozitáři @anthropic2024tooluse @anthropic-harness-design.

Stanovený cíl byl naplněn vymezením role modelu, harnessu a postupů Agentického inženýrství. Analýza Pythonové pipeline DarkFactory popsala řízený průchod požadavku, práci s pracovní větví, ověřování, kontrolu rozsahu změn, checkpoint a lidské schvalovací brány. Agentické inženýrství tak přesouvá podstatnou část práce vývojáře k návrhu podmínek, v nichž může agent vykonávat vymezenou práci a předat ji k integraci.

Úlohou vývojáře proto není pouze přijmout nebo odmítnout vytvořený kód. Určuje zadání, omezení, podmínky přijetí a místa, v nichž je nezbytné lidské rozhodnutí.

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("bib/references.bib", style: "iso-690-numeric", title: none)

#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
