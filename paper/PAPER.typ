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

Nástroje založené na jazykových modelech dnes doplňují kód, odpovídají na dotazy v IDE a v posledních verzích pracují přímo v repozitáři — spouštějí příkazy, testy a připravují změny k revizi @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. Část práce, kterou dosud vývojář prováděl sám, tak lze přenést na agenta.

Z toho ale neplyne, že coding agents jsou běžně používané. Podle odhadu Gradually tvoří jejich pravidelní uživatelé jen malou část všech uživatelů generativní AI @gradually-ai-usage-2026.

#figure(
  image("img/generated/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle nejpokročilejší používané kategorie. Pravidelní uživatelé AI coding agents tvoří podle Gradually malou část celku @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent pracovat nad projektem, nestačí mu vytvořit odpověď. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro testy a CI, trvalý stav mezi kroky a bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak se jazykový model propojuje s prostředím vývoje softwaru, jakou roli při tom hraje #strong[harness] a jaké postupy umožňují agenty využívat účinně a kontrolovaně.

Praktická část analyzuje Pythonovou pipeline DarkFactory a ověřuje vybrané mechanismy řízení, kontroly změn a pokračování běhu na základě zdrojového kódu, testů a záznamů CI.

#heading(level: 1)[Teoretická část]

#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Jazykový model (#strong[LLM]) předpovídá další token na základě předchozích. Architektura Transformer zpracovává vztahy mezi tokeny pomocí mechanismu attention @vaswani2017 @brown2020. Při inferenci model dostane obsah context window a vytvoří výstup. Sám však soubory nemění ani nespouští příkazy — provedení navržené akce zajišťuje harness @anthropic2024tooluse.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov king a queen @mikolov2013linguistic.

#figure(
  image("img/vector-embedding-queen.svg", width: 78%),
  caption: [Jednoduchá ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *king* a *queen* podle principu popsaného v @mikolov2013linguistic.],
) <fig-embedding-queen>

#heading(level: 3)[Context window a kompakce]

#strong[Context window] vymezuje informace dostupné při jednom volání modelu — instrukce, části repozitáře, historii nástrojů, výsledky předchozích kroků. Samotná velikost okna nezaručuje, že model všechny podstatné informace využije; jejich účinnost závisí i na umístění v dlouhém kontextu @liu2024.

Při delší práci proto harness vybírá, co do dalšího kroku předá. Kompakce nahrazuje starší průběh strukturovaným souhrnem rozhodnutí a výsledků, takže se do každého volání nemusí vkládat celý přepis @anthropic-context-engineering.

#heading(level: 2)[Agent a harness]

Harness je runtime, který propojuje model s nástroji a prostředím projektu. Připravuje context window, udržuje stav běhu, zprostředkovává přístup k souborům a zaznamenává pozorování @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 3)[Smyčka agentního provádění]

V agentní smyčce model navrhne další akci, harness ji provede v prostředí a výsledek vrátí jako pozorování. Tento princip odpovídá přístupu #strong[ReAct], v němž se střídá uvažování, jednání a pozorování @yao2022.

#figure(
  image("img/react-loop.svg", width: 92%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku; princip podle @yao2022.],
) <fig-react-loop>

#heading(level: 3)[Agent a chatbot]

U chatbotu člověk sám vybírá soubory, upravuje projekt a spouští nástroje; chatbot jen odpovídá v konverzaci. Agent naproti tomu prostřednictvím harnessu čte a mění soubory, spouští příkazy a testy, přijímá jejich výstup a pokračuje podle něj. Podstatný rozdíl je tedy v tom, kdo provádí práci nad projektem @anthropic2024tooluse @openai-agents-sandbox.

#heading(level: 2)[Agentické inženýrství]

Pokud má agent pracovat spolehlivě, nestačí dobře navrhnout výsledný software. Je třeba promyslet zadání, kontext, ověřování a způsob integrace výsledku. Tyto postupy se souhrnně označují jako Agentické inženýrství @anthropic-harness-design @anthropic-managed-agents.

#heading(level: 3)[Zadání a kontext]

Delegovaná práce potřebuje explicitní výsledek, rozsah, omezení a podmínky přijetí. Specifikace určuje, co se má změnit, i co se změnit nesmí. Při #strong[prompt engineeringu] se formulují instrukce pro konkrétní krok; #strong[context engineering] vybírá zadání, pravidla repozitáře, soubory, historii a výsledky nástrojů pro context window @openai-prompt-engineering @anthropic-context-engineering. Soubor AGENTS.md může tato pravidla uchovat přímo v repozitáři @agents-md.

Harness může prostředí rozšiřovat o další prostředky. Skills jsou znovu použitelné instrukce a skripty pro určité úlohy @agentskills-spec, Hooks reagují na události běhu a mohou spustit kontrolu nebo vynutit pravidlo @openai-agents-lifecycle. Standard MCP (Model Context Protocol) pak umožňuje připojit k harnessu externí nástroje a zdroje @mcp-specification. Tyto prostředky řídí harness; nejde o samostatné agenty.

#heading(level: 3)[Orchestrace a lidská integrace]

Práci lze rozdělit mezi více agentů. Ve vzoru coordinator/subagent hlavní agent předá dílčí úkol s omezeným kontextem a převezme výsledek. Workflow graph popisuje závislosti a větvení mezi kroky; swarm označuje volnější spolupráci skupiny agentů @openai-agent-orchestration @openai-swarm.

Human-in-the-loop (#strong[HITL]) označuje místa, kde postup vyžaduje lidské rozhodnutí — schválení plánu, úpravu rozsahu, vyhodnocení výsledku nebo přijetí změny. Integrace tak zahrnuje nejen technickou kontrolu, ale i lidskou revizi a převzetí odpovědnosti @github-branches @github-pull-requests.

#heading(level: 1)[Praktická část]

#heading(level: 2)[Metodika] <practical-first>

Praktická část analyzuje vybranou revizi systému DarkFactory @darkfactory-e9c10221. Podklady tvoří konfigurace workflow GitHub Actions, Pythonový runner, definice Docker prostředí a automatizované testy.

Analýza rekonstruuje průběh úlohy od události v repozitáři po předání změny k integraci. Tvrzení o architektuře vycházejí ze zdrojového kódu; testy a záznamy CI ověřují vybrané scénáře.

#heading(level: 2)[DarkFactory]

DarkFactory je Pythonová pipeline běžící nad GitHub Actions. Workflow spustí Docker kontejner, v němž Pythonový runner připraví prostředí, předá harnessu instrukce a zpracuje výsledek @darkfactory-e9c10221.

#figure(
  image("img/darkfactory-python-pipeline.svg", width: 100%),
  caption: [Řídicí workflow Pythonové pipeline DarkFactory. Schéma zachycuje průchod od nového požadavku přes dvě schvalovací brány, implementaci a opakovanou seberevizi až po lidskou revizi pull requestu; větev přerušení odpovídá zachování checkpointu a obnovení běhu @darkfactory-e9c10221.],
) <fig-darkfactory-python-pipeline>

#heading(level: 3)[Spuštění a pracovní prostředí]

Pipeline reaguje na události v repozitáři. Workflow připraví pracovní adresář, sestaví obraz kontejneru a předá runneru údaje o události spolu s pracovním stromem. Harness tak pracuje v izolovaném prostředí nad konkrétní verzí repozitáře @darkfactory-e9c10221.

#heading(level: 3)[Průchod delegované úlohy]

Runner převede požadavek na instrukci pro harness. Průchod zahrnuje vytvoření plánu, provedení změn a kontrolu výsledku. Plán vymezuje zamýšlenou práci, pracovní větev odděluje změnu od hlavní větve a pull request vytváří bod pro posouzení výsledku @darkfactory-e9c10221.

#heading(level: 3)[Řízení změny a pokračování běhu]

Pipeline sleduje rozsah změn a stav pracovního stromu, aby šlo rozlišit očekávané a nepovolené účinky. Při přerušení ukládá checkpoint pro navázání dalšího kroku. Testy pokrývají práci se stavem, obnovení rozpracované úlohy, změnu poskytovatele i kontrolu oprávnění @darkfactory-e9c10221. Schválení plánu, revize a integrace zůstávají lidskými rozhodovacími body @darkfactory-request-359.

#heading(level: 1)[Výsledky a diskuse]

#heading(level: 2)[Zjištění] <results-first>

Pythonová pipeline organizuje průchod požadavku jako sled událostí v repozitáři. Po otevření požadavku runner vytvoří interpretaci; následné lidské schválení spouští vytvoření plánu a další schválení jeho implementaci. Dvě schvalovací brány tak oddělují vymezení požadavku a plánu od změny zdrojového kódu @darkfactory-e9c10221.

Workflow před spuštěním ověřuje, zda je agent pro repozitář povolen, a vynechává komentáře vytvořené boty. Přihlašovací údaje předá běh GitHub Actions; pracovní strom je připojen do kontejneru, v němž běží Pythonový runner @darkfactory-e9c10221.

Po schválení plánu pipeline vytvoří pracovní větev a předá implementační instrukci harnessu. Runner spustí formátovací a testovací nástroje; při neúspěchu testů provede opravný krok. Poté vytvoří commit, odešle větev a otevře návrhový pull request. Seberevize porovná změněné soubory s rozsahem plánu; při nálezech spustí opravu a další revizi. Pokud seberevize nenajde nesoulad, pipeline označí pull request jako připravený k lidské revizi @darkfactory-e9c10221.

Runner ukládá checkpoint pro navázání rozpracovaného běhu. Při vyčerpání kvóty uchová postup, označí běh jako blokovaný a umožní jeho obnovení příkazem /resume. Testy pokrývají serializaci stavu, obnovení pipeline, změnu poskytovatele i kontrolu oprávnění @darkfactory-e9c10221.

#heading(level: 2)[Diskuse]

Zjištění ukazují, že delegovaná práce agenta není jednorázová konverzace s modelem, ale proces řízený pipeline nad repozitářem. Model vytváří interpretaci, plán nebo návrh změny; o pořadí kroků, předání údajů a reakci na výsledek rozhoduje Pythonový runner. Toto rozdělení odpovídá pojmu harness z teoretické části — runtime, který zasazuje výstup modelu do pracovního prostředí @darkfactory-e9c10221.

Pozoruhodné je, že kontrolní mechanismy pipeline zasahují do více míst průchodu. Schválení interpretace, schválení plánu, seberevize a lidské přijetí pull requestu vytvářejí čtyři brány, z nichž dvě vyžadují lidské rozhodnutí. HITL zde tedy není jen kontrola hotového výstupu, ale součást průchodu, která vymezuje záměr dříve, než se začne implementovat.

Checkpoint zaznamenává stav potřebný pro pokračování po přerušení, aniž by měnil obsah schváleného plánu nebo nahrazoval revizi. Práce tak může pokračovat i po vyčerpání kvóty nebo selhání poskytovatele, ale kontrolní mechanismy zůstávají v platnosti @darkfactory-e9c10221.

#heading(level: 1)[Závěr]

Jazykový model sám vytváří výstup v rámci context window. Agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním — propojením, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design.

Analýza Pythonové pipeline DarkFactory ukázala, jak takový harness v praxi organizuje práci: řídí průchod požadavku, vytváří pracovní větev, ověřuje výsledek, kontroluje rozsah změn, ukládá checkpoint a předává výsledek k lidské revizi. Stanovený cíl práce — vymezit vztah modelu, harnessu a Agentického inženýrství a ověřit vybrané mechanismy — byl tím naplněn.

Úloha vývojáře se tím posouvá od přímého provádění k návrhu zadání, omezení a bodů, v nichž je nezbytné lidské rozhodnutí.

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("bib/references.bib", style: "iso-690-numeric", title: none)

#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
