// ─────────────────────────────────────────────────────────────
//  ODBORNÁ PRÁCE — jediný kanonický zdrojový soubor .typ
// ─────────────────────────────────────────────────────────────

#let PISMO = ("Caladea", "New Computer Modern")

#let meta = (
  autor: "Patrik Marius",
  trida: "4.D",
  vedouci: "Michal Dočekal",
  konzultant: none,
  skola: "Gymnázium J. K. Tyla",
  skola-zkratka: "GJKT",
  mesto: "Hradci Králové",
  rok: 2026,
  annotation-cs: [
    Odborná práce zkoumá architekturu agentního harnessu a metodiku agentického inženýrství pro dlouhotrvající vývoj softwaru. Vychází ze zjištění, že samotná inference jazykového modelu nezajišťuje trvalý stav, kontrolované účinky v prostředí ani deterministické ověřování změn. Práce formuluje roli harnessu jako běhové vrstvy propojující inferenci se stavem, nástroji a kontrolními mechanismy a představuje DarkFactory jako implementační artefakt tohoto přístupu. Evaluace na základě implementace, automatizovaných testů a CI běhů na cílových repozitářích dokládá funkčnost klíčových mechanismů řízené autonomie a obnovitelnosti a přesně vymezuje hranice dosažených výsledků.
  ],
  abstract-en: [
    This thesis investigates the agent harness architecture and agentic engineering methodology for long-running software development. It builds on the premise that language model inference alone does not provide persistent state, controlled environment side effects, or deterministic change verification. The thesis formulates the role of the harness as a runtime layer connecting model inference with durable state, tools, and control mechanisms, presenting DarkFactory as an implementation artefact of this approach. Evaluation based on implementation, automated test suites, and CI runs across target repositories substantiates the core mechanisms of controlled autonomy and execution recovery while defining the empirical boundaries of the findings.
  ],
)

#let nadpis-bez-cisla(text-nadpisu) = heading(numbering: none, outlined: true, bookmarked: false, text-nadpisu)

#set document(title: "Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory", author: meta.autor)
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm),
  footer: none,
)
#set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
#set par(justify: true, leading: 1.5 * 0.65em, spacing: 8pt, first-line-indent: 0pt)

#set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)

#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  block(above: 21pt, below: 10pt, sticky: true, text(size: 16pt, weight: "bold", it))
}
#show heading.where(level: 2): it => pad(left: 0.75em)[#block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))]
#show heading.where(level: 3): it => pad(left: 1.5em)[#block(above: 17pt, below: 8pt, sticky: true, text(size: 12pt, weight: "bold", it))]

#show figure.caption: set text(size: 10pt)
#show raw: set text(font: ("DejaVu Sans Mono",), size: 9.5pt)
#show raw.where(block: true): it => block(
  fill: rgb("#1e293b"), stroke: 0.5pt + rgb("#334155"), inset: (x: 10pt, y: 8pt), radius: 4pt, width: 100%,
  text(fill: rgb("#f1f5f9"), it),
)
#show raw.where(block: false): it => box(
  fill: rgb("#f1f5f9"), stroke: 0.3pt + rgb("#cbd5e1"), inset: (x: 3pt, y: 1pt), radius: 2pt,
  text(fill: rgb("#0f172a"), it),
)
#show link: set text(fill: rgb("#0b4f9e"))
#show cite: it => super(it)
#set table(stroke: 0.5pt, inset: (x: 5pt, y: 4pt))
#set figure(numbering: "1")

// ── Přední část ──────────────────────────────────────────

// Titulní strana
#align(center)[
  #v(1cm)
  #text(size: 14pt, weight: "bold", meta.skola)
  #v(1fr)
  #text(size: 24pt, weight: "bold", hyphenate: false)[Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory]
  #v(0.7cm)
  #text(size: 15pt, tracking: 2pt)[ODBORNÁ PRÁCE]
  #v(1fr)
]
#align(left)[
  #set text(size: 12pt)
  #grid(columns: (1fr, auto), column-gutter: 1.2em,
    [Autor práce: #meta.autor, #meta.trida],
    [Vedoucí práce: #meta.vedouci],
  )
  #v(0.8cm)
  #align(center)[#text(size: 12pt, str(meta.rok))]
]
#pagebreak()

// Prohlášení
#nadpis-bez-cisla[Prohlášení]
Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval samostatně pod dohledem vedoucího uvedeného na první straně. Všechny použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby tištěná forma práce byla uchována na #meta.skola a tam používána jako tištěný zdroj např. pro další studentské práce či pro prezentaci vzdělávání na #meta.skola-zkratka.

#v(1.5cm)
V #meta.mesto dne #box(width: 4.5cm, repeat("…")) #h(1fr) Podpis autora práce: #box(width: 4.5cm, repeat("…"))
#pagebreak()

// Anotace a klíčová slova
#nadpis-bez-cisla[Anotace]
#meta.annotation-cs

#nadpis-bez-cisla[Abstract]
#meta.abstract-en

#nadpis-bez-cisla[Klíčová slova]
agentní AI; agentické inženýrství; agentní harness; softwarové inženýrství; jazykové modely; autonomní agenti; DarkFactory

#v(0.8cm)
#text(weight: "bold")[Keywords] \
agentic AI; agentic engineering; agent harness; software engineering; language models; autonomous agents; DarkFactory
#pagebreak()

// Obsah
#outline(title: [Obsah], depth: 3, indent: 1.4em)

// ── Vlastní text ─────────────────────────────────────────

#set page(footer: context {
  align(center, text(font: PISMO, size: 11pt, counter(page).display("1")))
})
#heading(level: 1)[Úvod]

Delegování komplexních programátorských úloh na agentní systém má smysl teprve tehdy, když lze současně kontrolovat jeho stav, účinky v prostředí a ověřování změn. Růst schopností jazykových modelů proto sám o sobě nestačí; rozhodující je běhové a metodické okolí, které jejich výstupy zapojí do vývojového procesu.

#heading(level: 2)[Motivace a vymezení problému]

Současný pokrok ve schopnostech velkých jazykových modelů zásadním způsobem proměňuje možnosti automatizace softwarového inženýrství. Moderní modely dokáží generovat syntakticky správný kód, navrhovat algoritmy, analyzovat chybové výpisy a vyhledávat souvislosti napříč zdrojovými texty. Samotná schopnost modelu vygenerovat věrohodný textový výstup však ještě nepředstavuje kontrolovaný inženýrský proces. Reálný vývoj softwaru vyžaduje vymezení izolovaných hranic změn, sledování trvalého stavu, provádění deterministických kontrol a řízenou integraci do společného repozitáře.

Empirická data ukazují, že používání generativní umělé inteligence dosáhlo masového globálního rozšíření, avšak její nasazení ve formě autonomních agentů zůstává specifickou doménou. Jak uvádí analýza organizace Gradually ze srpna 2026 @gradually-ai-usage-2026, drtivá většina světové populace buď s generativní AI nepřišla do vědomého kontaktu, nebo využívá základní bezplatné či předplacené textové asistenty. Pravidelné využívání specializovaných kódovacích agentů (AI coding agents) představuje odhadem 25 až 35 milionů uživatelů (přibližně 0,36 % populace), jak ilustruje @fig-gradually-usage. Tento nepoměr potvrzuje, že přechod od interaktivního chatu ke skutečně agentnímu vývoji vyžaduje odlišné nástroje a vyšší míru technické připravenosti.

#figure(
  image("img/generated/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení světové populace podle nejpokročilejší používané kategorie generativní AI v srpnu 2026. Každý z 2 500 bodů představuje přibližně 3,3 milionu lidí; kategorie jsou vzájemně výlučné. Kategorie pravidelných uživatelů AI coding agents vychází z deduplikovaného odhadu Gradually (střed 30 milionů uživatelů). Převzato z @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Zároveň dochází k prudkému růstu vnitřních schopností samotných modelů. Analýza institutu Epoch AI na datech Epoch Capabilities Index (ECI) k 1. září 2026 @epoch-eci-frontier-2026 dokumentuje, že od nástupu uvažujících (reasoning) modelů v září 2024 dosahuje tempo posunu technologické hranice přibližně 14 ECI bodů ročně, zatímco u modelů bez explicitního uvažování činí růst zhruba 6 bodů ročně (@fig-epoch-eci). Vyšší kapacita logického uvažování umožňuje modelům řešit složitější algoritmické problémy a lépe porozumět rozsáhlým kontextům.

#figure(
  image("img/generated/epoch-eci-frontier-2026-09-01.svg", width: 100%),
  caption: [Vývoj technologické hranice Epoch Capabilities Index (ECI) od nástupu reasoning modelů v září 2024. Trendy ukazují růst přibližně 14 bodů ročně pro reasoning modely oproti 6 bodům ročně u standardních modelů. Převzato z @epoch-eci-frontier-2026.],
) <fig-epoch-eci>

Rostoucí schopnost modelu generovat řešení však sama o sobě neřeší fundamentální inženýrské výzvy. Jazykový model je ze své podstaty bezstavový inferenční mechanismus: nepamatuje si předchozí běhy mimo bezprostřední kontextové okno a bez napojení na nástroje nemůže sám ověřit funkčnost navrženého kódu kompilací či spuštěním testů. Bez okolního řídicího systému zvyšuje čistě modelová inference riziko nekonzistentních úprav souborů a ztráty kontextu při rozsáhlejších úlohách.

V populárním diskurzu se v této souvislosti objevil koncept tzv. *Vibe Coding* @karpathy2025vibecoding, který označuje intuitivní styl programování založený na pokynech v přirozeném jazyce a omezené kontrole navrženého kódu. Tento přístup může být účinný při tvorbě prototypů nebo experimentech @willison2025vibecoding, sám však nepokrývá specifikaci, dohledatelnost změn a systematické odhalování vad, které vyžaduje dlouhodobý vývoj.

Technickou odpověď proto představuje specializovaná běhová vrstva — *harness* — spolu s metodikou *agentického inženýrství*. Harness obklopuje modelovou inferenci, spravuje trvalý stav úlohy, zprostředkovává nástroje a provádí kontroly. Agentické inženýrství tyto schopnosti organizuje do procesu, jehož změny lze sledovat, ověřovat a podle potřeby zastavit.

#heading(level: 2)[Cíl práce a výzkumné otázky]

Hlavním cílem této práce je navrhnout a technicky vyhodnotit architekturu harnessu pro dlouhotrvající agentní vývoj softwaru, přičemž konkrétním implementačním artefaktem této architektury je systém DarkFactory @darkfactory.

K naplnění hlavního cíle jsou stanoveny čtyři dílčí cíle:
1. *Teoretická báze:* Vymezit teoretické a architektonické principy fungování velkých jazykových modelů, jejich inferenčních omezení a mechanismů harnessu nezbytných pro dlouhotrvající autonomní běh.
2. *Metodika agentického inženýrství:* Formulovat ucelenou softwarově-inženýrskou metodiku řízení agentního vývoje, která propojuje specifikaci, plánování, izolaci změn, deterministické ověřování a orchestraci.
3. *Implementace DarkFactory:* Realizovat navrženou architekturu a metodiku v podobě funkčního softwarového harnessu DarkFactory.
4. *Empirické vyhodnocení:* Technicky vyhodnotit vlastnosti a limity navrženého řešení na základě reprodukovatelných důkazů z implementace, automatizovaných testů, CI běhů a integrace do cílových repozitářů.

Práce zkoumá tři otázky:
- *O1 (Řízená autonomie):* Jak lze v dlouhotrvajícím agentním procesu zajistit autonomní postup modelu tak, aby prováděné změny zůstaly deterministicky ověřitelné a podléhaly explicitním hranicím kontroly a integrace?
- *O2 (Přerušení a obnova):* Jaké systémové mechanismy harnessu umožňují spolehlivě detekovat uváznutí, chybové stavy a přerušení dlouhotrvajícího běhu a obnovit stav vývojového procesu bez ztráty kontinuity a nutnosti opakovat celou úlohu?
- *O3 (Trvalý stav a aktivní kontext):* Jakým způsobem lze efektivně oddělit dlouhodobý stav vývojové úlohy od konečného a degradačně zatíženého kontextového okna jazykového modelu?

#heading(level: 2)[Metodika]

Práce metodologicky vychází z rámce *Design Science Research Methodology (DSRM)* pro informační systémy a softwarové inženýrství @hevner2004designscience @peffers2007dsrm. Výzkum je zaměřen na vytvoření a vyhodnocení nového inženýrského artefaktu — agentního harnessu DarkFactory —, který řeší praktický problém řízeného a dlouhotrvajícího autonomního vývoje.

Postup práce zahrnuje následující kroky:
- *Rešerše a analýza požadavků:* Studium primární odborné literatury z oblasti architektury Transformerů, inferenčních systémů a agentních architektur @vaswani2017 @yao2022 @liu2024, doplněné o analýzu otevřených specifikací (Model Context Protocol @mcp-spec-2026, Agent Skills @agentskills-spec) a first-party technické dokumentace předních vývojových platforem @anthropic-harness-design @anthropic-managed-agents @openai-agents-sdk.
- *Návrh a konstrukce artefaktu:* Architektonický návrh komponent harnessu a formalizace postupů agentického inženýrství. Implementace systému DarkFactory v prostředí TypeScript a běhového systému Bun s využitím verzovacího systému Git a platformy GitHub Actions.
- *Empirické ověření:* Testování navržených mechanismů pomocí automatizovaných testovacích sad (jednotkové a integrační testy), verifikace stavových přechodů v rámci CI pipeline a nasazení na reálných cílových repozitářích (`omnis`, `ChessWithQuests`, `DarkFactory-Paper`).
- *Analýza výsledků a omezení:* Faktuální interpretace výsledků testů a běhů CI, vyhodnocení odpovědí na výzkumné otázky a striktní vymezení hranic platnosti závěrů podle dostupných empirických důkazů.

#heading(level: 1)[Teoretická část]

Růst schopností modelu je užitečný pro vývoj pouze v kombinaci s prostředím, které zachová stav, zprostředkuje účinky a umožní jejich kontrolu. Teoretická část proto spojuje vlastnosti jazykového modelu s návrhem harnessu a následně s metodikou agentického inženýrství.

#heading(level: 2)[Jazykový model]

Agentní systém využívá velký jazykový model (Large Language Model, LLM) jako mechanismus pro zpracování instrukcí a tvorbu dalšího kroku. Pro určení hranic této role je podstatná jeho reprezentace dat a způsob inference.

#heading(level: 3)[Architektura a reprezentace]

Velký jazykový model je v základu parametrický statistický model aproximující pravděpodobnostní rozdělení nad posloupnostmi diskrétních symbolů — tokenů @brown2020. Většina moderních architektur využívaných v agentních systémech je postavena na autoregresivním dekodéru architektury *Transformer* @vaswani2017. Základním stavebním prvkem je mechanismus vícehlavé pozornosti (*multi-head self-attention*), který umožňuje dynamicky modelovat závislosti mezi libovolnými dvěma pozicemi v sekvenci bez ohledu na jejich vzájemnou vzdálenost. V každé vrstvě Transformeru jsou vstupní vektory transformovány pomocí projekčních matic na dotazy (*queries*), klíče (*keys*) a hodnoty (*values*), přičemž maticové násobení dotazů a klíčů určuje míru pozornosti, kterou model při predikci věnuje ostatním tokenům v kontextu.

Přirozený text i zdrojový kód jsou do modelu přenášeny prostřednictvím *tokenizéru*, který rozkládá vstupní řetězec na posloupnost celočíselných identifikátorů. Současné tokenizéry využívají subword algoritmy, nejčastěji *Byte-Pair Encoding (BPE)* @sennrich2016bpe. Tokenizace umožňuje efektivně reprezentovat běžná slova a syntaktické konstrukce jazyka jediným tokenem, zatímco neznámá či vzácná slova skládá z menších podslovních fragmentů. Počet tokenů přímo vymezuje výpočetní náročnost zpracování, spotřebu paměti a limity maximální délky vstupu.

Každý diskrétní token je následně namapován do spojitého vícerozměrného prostoru prostřednictvím *vektorové reprezentace* (*embeddingu*) @mikolov2013word2vec @mikolov2013linguistic. V tomto spojitém latentním prostoru mohou být sémanticky nebo syntakticky příbuzné prvky reprezentovány podobnými vektory. Natrénovaná reprezentace tak modelu pomáhá pracovat s abstraktními pojmy, jako jsou typy, proměnné, funkce či softwarové architektury. Tyto vnitřní reprezentace jsou však aktivní výhradně během dopředného průchodu modelem; model si vytvořené abstrakce po dokončení výpočtu nepamatuje.

#heading(level: 3)[Inference a kontext]

Vlastní provádění výpočtu — *inference* — probíhá autoregresivním způsobem: model přijme na vstupu posloupnost tokenů (aktivní kontext), provede dopředný průchod neuronovou sítí a na výstupu spočítá pravděpodobnostní rozdělení pro následující token. Z tohoto rozdělení je vybrán další token, který je připojen ke stávajícímu kontextu, a celý cyklus se opakuje, dokud model nevygeneruje speciální ukončovací token (*end-of-sequence*) nebo nedosáhne nastaveného limitu @vllm-inference-engine. Generování lze řídit parametry vzorkování, zejména *teplotou* (*temperature*), která ovlivňuje koncentraci pravděpodobnostního výběru @openai-responses-temperature. Nižší teplota omezuje variabilitu výstupu, sama však nezaručuje správnost ani úplný determinismus.

Zásadním technickým mechanismem pro optimalizaci inference je *KV Cache (Key-Value Cache)* @ainslie2023 @kwon2023pagedattention. Jelikož se dříve vygenerované tokeny v kontextu nemění, výpočetní systém ukládá jejich spočtené vektory klíčů a hodnot do vyrovnávací paměti GPU, aby je nemusel při každém kroku počítat znovu. Velikost KV cache roste lineárně s délkou kontextu a počtem souběžných požadavků, což představuje významný hardwarový limit pro maximální délku aktivního kontextového okna (*context window*).

Ačkoliv moderní modely nabízejí nominální kontextová okna o kapacitě stovek tisíc až milionů tokenů, jejich schopnost efektivně využívat informace napříč celým oknem naráží na zásadní limity. Experimentální práce Liu et al. @liu2024 prokázala jev označovaný jako *Lost in the Middle*: schopnost modelu vyhledat a správně aplikovat relevantní informaci výrazně klesá, pokud je tato informace umístěna uprostřed dlouhého kontextu, zatímco informace na začátku a konci okna jsou zpracovávány s vyšší přesností. Tento fenomén degradace pozornosti (*context rot*) znamená, že pouhé mechanické nafukování kontextu celými repozitáři může snížit spolehlivost a zvýšit chybovost.

Z hlediska dlouhotrvajícího vývoje z toho plyne zásadní závěr: samotný jazykový model nemůže sloužit jako spolehlivá trvalá paměť softwarového projektu. Dlouhodobý stav vývojového procesu musí být spravován externě, mimo kontextové okno modelu.

#heading(level: 2)[Harness]

Pokud je jazykový model vnímán jako bezstavový inferenční engine, pak *harness* představuje běhový systém (*runtime*), který tuto inferenci obklopuje, řídí její vstupy a výstupy a propojuje ji s vnějším světem @anthropic-harness-design @anthropic-managed-agents. Základní vztah lze vyjádřit vzorcem: *model provádí inferenci, harness zajišťuje běh*.

#heading(level: 3)[Smyčka a stav]

Základním provozním mechanismem harnessu je *agentní smyčka* (*agent loop*). Místo jednorázového dotazu a odpovědi harness organizuje cyklus postavený na paradigmatu ReAct (*Reasoning and Acting*) @yao2022. Model na základě aktuálního stavu a instrukcí nejprve formuluje úvahu a následně navrhne konkrétní strukturovanou akci. Harness tuto akci zachytí, ověří, vykoná ve vnějším prostředí a výsledek (pozorování) vrátí modelu jako vstup pro další krok smyčky (@fig-react-loop).

#figure(
  image("img/react-loop.svg", width: 92%),
  caption: [Schéma agentní smyčky ReAct implementované v harnessu: model na základě kontextu navrhne akci, harness ji zprostředkuje a vykoná v prostředí a vrácené pozorování se stává součástí kontextu pro další inferenční krok. Převzato z @yao2022.],
) <fig-react-loop>

Aby mohl vývojový proces trvat déle než jedno kontextové okno a přežít případná přerušení, harness zavádí striktní oddělení tří vrstev kontinuity @openai-agents-sessions @openai-agents-run-state:
1. *Sezení (Session):* Logická identifikační hranice vymezující souvislý běh nebo komunikační kanál, přes který jsou propojeny jednotlivé tahy a kroky.
2. *Přepis (Transcript):* Lineární žurnál veškerých událostí, vstupů uživatele, odpovědí modelu, vyvolaných nástrojů a systémových hlášení. Slouží k auditování a reprodukci historie.
3. *Trvalý stav (State / Run State):* Strukturovaná data zachycující aktuální fázi úlohy, stav pracovního stromu, modifikované soubory, schválený plán a dílčí výsledky.

Toto rozlišení je kritické: aktivní modelový kontext není totožný s trvalým stavem ani s úplným přepisem. Harness udržuje stav i přepis v externím perzistentním úložišti (např. na disku ve formátu JSON/SQLite) a do kontextového okna modelu předkládá pouze pečlivě vybranou a zhutněnou část informací nezbytnou pro rozhodnutí o následujícím kroku. Dojde-li k pádu procesu, vyčerpání limitů nebo síťovému výpadku, harness dokáže načíst uložený Run State a navázat na práci bez nutnosti začínat od začátku.

#heading(level: 3)[Prostředí a nástroje]

Agentní systém při vývoji softwaru interaguje s reálným *prostředím* (*agent environment*), které zahrnuje souborový systém, systém správy verzí, kompilátory, testovací nástroje, síťová rozhraní a systémové procesy @anthropic-managed-agents. Model sám o sobě nemá a z bezpečnostních důvodů ani nesmí mít přímý přístup k systémovým voláním operačního systému.

Tuto interakci harness zprostředkovává pomocí mechanismu *vyvolávání nástrojů* (*tool calling*) @anthropic2024tooluse. Harness definuje množinu dostupných nástrojů ve formě schémat (např. JSON Schema), která specifikují název nástroje, popis jeho účelu a typy požadovaných parametrů. Během inference model nevytváří běžný text, ale vygeneruje strukturovaný požadavek na volání konkrétního nástroje s definovanými argumenty.

Harness požadavek zachytí a podrobí jej validaci: zkontroluje formální správnost parametrů, oprávnění agenta a bezpečnostní limity. Teprve po úspěšném ověření harness nástroj fyzicky spustí a jeho výstup (např. obsah souboru, výstup kompilátoru, chybovou hlášku) předá zpět modelu jako pozorování. Tím je striktně oddělen *záměr modelu* od *skutečného provedení účinku*.

Skutečné spouštění kódu (*code execution*) a testovacích sad v reálném prostředí představuje zdroj ověřitelné zpětné vazby (*ground-truth observation*) @anthropic2026codeexecution. Výsledek kompilátoru nebo testu poskytuje informaci o konkrétním běhu, kterou nelze nahradit samotným odhadem modelu. Z bezpečnostního hlediska harness tyto operace izoluje v *izolovaném prostředí* (*sandboxu*), například v lehkých kontejnerech či virtualizačních klecích @agache2020firecracker @openai-agents-sandbox, aby omezil možné účinky nekontrolovaných skriptů na hostitelský systém.

#heading(level: 3)[Rozšíření]

Moderní architektura harnessu je rozšiřitelná, pokud rozlišuje znalosti, vynucování pravidel a připojení vnějších schopností. *Skills* jsou znovupoužitelné balíčky instrukcí, skriptů a doprovodných zdrojů zaměřené na určitý typ úlohy @agentskills-spec @claude-code-skills. Harness tak může příslušné postupy načíst až ve chvíli, kdy je úloha potřebuje, místo aby jimi trvale zatěžoval každý aktivní kontext.

*Hooks* doplňují tento model o deterministické handlery napojené na životní cyklus běhu @claude-code-hooks. Pravidlo spuštěné před vyvoláním nástroje, po jeho dokončení nebo při chybě může vynutit bezpečnostní kontrolu, formátování či linter nezávisle na tom, zda jej model připomene ve své instrukci. Rozhodování modelu tak zůstává oddělené od pravidel, která musí platit při každém provedení.

*Model Context Protocol (MCP)* standardizuje napojení runtime na externí nástroje a datové zdroje @mcp-spec-2026 @mcp-tools-2026. V jeho klient-server architektuře harness komunikuje s lokálními i vzdálenými servery, které poskytují nástroje, prompty a zdroje. Integrace tím získává společné rozhraní a nemusí pro každý externí systém vytvářet vlastní mechanismus.

#heading(level: 2)[Agentické inženýrství]

Samotná existence modelu a harnessu poskytuje technické schopnosti, avšak neurčuje, jak má být vývoj organizován, aby splňoval kvalitativní a bezpečnostní standardy softwarového inženýrství. Tuto disciplínu formuluje *agentické inženýrství* (*Agentic Engineering*). Jde o metodický přístup, který na schopnostech harnessu staví systematický, specifikací řízený a deterministicky ověřitelný vývojový proces.

#heading(level: 3)[Zadání a plánování]

Pro netriviální změnu agentické inženýrství vyžaduje explicitní zadání a ohraničený plán @sommerville2016. Neformální pokyny v přirozeném jazyce často trpí nejednoznačností a opomíjejí okrajové stavy.

Metodika proto zavádí *vývoj řízený specifikací* (*Spec-Driven Development*) @github-spec-kit. Specifikace před zahájením implementace spojuje požadovaný výsledek s omezeními, negativními cíli a akceptačními podmínkami. Vymezuje tedy nové chování, zachovávaná rozhraní, hranice úlohy i způsob ověření, aby plán později nešel posuzovat podle neurčitého dojmu z výsledného kódu.

Na základě schválené specifikace agent vytváří *ohraničený plán* (*bounded plan*), který rozkládá implementaci do posloupnosti logických, na sebe navazujících kroků. Oddělení plánování od implementace umožňuje před zápisem ověřit rozsah práce a následně posuzovat změnu přímo proti specifikaci, čímž se snižuje riziko odklonu od původního zadání (*goal drift*).

#heading(level: 3)[Řízení změny a ověřování]

Veškerý kód vygenerovaný jazykovým modelem je v agentickém inženýrství považován za netestovaný návrh změny. Úloha proto probíhá v izolované větvi, jejíž pracovní strom neovlivňuje hlavní větev ani souběžné procesy @chacon2014 @github-branches. Pull Request v tomto procesu tvoří integrační hranici: soustřeďuje diff, historii commitů i diskusi a umožňuje posoudit změnu proti zadání @github-pull-requests @github-pull-request-reviews.

Před přijetím změny proběhnou deterministické kontroly zahrnující sestavení, statickou analýzu a testy @sommerville2016. CI je spouští v čistém prostředí nad přesným hashem revize @humble2010; povinné stavové kontroly proto mohou mechanicky zabránit sloučení neúspěšného návrhu @github-required-status-checks. Automatické výsledky doplňuje revize člověkem nebo specializovaným agentem, která ověřuje shodu s požadavky a specifikací.

#heading(level: 3)[Instrukce, kontext a autonomie]

Efektivita a bezpečnost agenta závisí na způsobu, jakým jsou mu dodávány instrukce a jak je spravován jeho aktivní kontext @anthropic-context-engineering. Nejvyšší prioritu mají systémová pravidla harnessu, pod nimi trvalé projektové instrukce v souborech typu `AGENTS.md` nebo `CLAUDE.md` @openai-agents-md @claude-code-memory, potom specifikace konkrétní úlohy a schválený plán a nakonec dynamická data běhu, například obsah souborů, výstupy terminálu a chybová hlášení. Tato posloupnost odděluje stabilní omezení od informací, které se mění s každým krokem.

Správa kontextu vyžaduje aktivní selekci a *kompakci* (*context compaction*) @jiang2023llmlingua. Jelikož repozitáře přesahují velikost kontextového okna a trpí degradací pozornosti @liu2024, harness využívá selektivní načítání a vyhledávání (*Retrieval-Augmented Generation, RAG*) @lewis2020rag, aby do kontextu vkládal pouze soubory a symboly bezprostředně související s aktuálním krokem.

Závažným bezpečnostním rizikem je zpracování nedůvěryhodných externích dat. Útok typu *Prompt Injection* (OWASP LLM01) @owasp-llm01-prompt-injection @owasp-prompt-injection spočívá v tom, že záškodnický text obsažený v analyzovaném souboru, webové stránce či chybovém logu přebije systémové instrukce a přiměje model k nežádoucí akci. Harness proto musí striktně oddělovat řídicí kanál (instrukce) od datového kanálu (pozorování z prostředí) a uplatňovat striktní validaci vstupů.

Autonomie agenta má být deterministicky ohraničena. Harness může nastavit pevné *rozpočty běhu* (*execution budgets*), například maximální počet iterací, stropy na počet tokenů, finanční limity a časové zámky @microsoft-agent-looping. Pro vysoce rizikové operace (např. destruktivní změny souborů, nasazení do produkce nebo autorizace sloučení větve) je vhodný přístup *Člověk ve smyčce (Human-in-the-loop, HITL)* @openai-agents-hitl, při němž harness vyžaduje schválení lidským operátorem před provedením akce.

#heading(level: 3)[Orchestrace]

Komplexní softwarové úlohy často přesahují možnosti jediného agentního běhu s plochým kontextem. Pro jejich řešení agentické inženýrství využívá *orchestraci* — koordinaci více specializovaných rolí či procesů @openai-agent-orchestration.

Základním předpokladem efektivní orchestrace je *oddělitelné vlastnictví* (*separable ownership*). Dvě úlohy mohou běžet paralelně pouze tehdy, pokud modifikují vzájemně nezávislé části kódu a jejich změny lze deterministicky integrovat bez kolizí. Pokud tato podmínka není splněna, paralelní generování kódu vede ke zmatení kontextu a konfliktním změnám.

Koordinátor může delegovat oddělitelnou dílčí odpovědnost specializovanému subagentovi s vlastním kontextem a nástroji @anthropic-managed-agents. Pokud se mění vlastník celé úlohy, handoff předá další roli pouze stav relevantní pro pokračování @openai-agent-orchestration. Pro explicitní pořadí, větvení a návraty je vhodný workflow graf @microsoft-agent-workflows. DAG popisuje pouze acyklické závislosti, zatímco agentní proces potřebuje obecný orientovaný graf, pokud se po neúspěšném testu nebo zamítnuté revizi vrací do opravy @microsoft-agent-looping.

I při zapojení pokročilé orchestrace zůstává nutné zachovat finální integrační bránu, deterministické CI kontroly a formální revizi.

#heading(level: 1)[Praktická část]

#heading(level: 2)[DarkFactory]

#heading(level: 1)[Výsledky a diskuse]

Dostupná evidence je vázána na konkrétní revize zdrojového kódu, testovací sady, CI běhy a cílové repozitáře. Následující výsledky proto rozlišují mezi pozorovaným průběhem a tím, co z něj lze oprávněně vyvodit.

#heading(level: 2)[Ověření implementace a systému]

Evaluace systému DarkFactory se opírá o pevně identifikovaný a reprodukovatelný snapshot zdrojového kódu na commitu `e9c10221b40589512d262a0edb95f709b923150c` @darkfactory-e9c10221 a jemu odpovídající běh průběžné integrace GitHub Actions číslo `35616745304` @darkfactory-ci-35616745304.

Komponentové a jednotkové ověření realizované v rámci referenčního CI běhu proběhlo plně úspěšně napříč všemi 15 definovanými joby. Hlavní testovací sada spouštěná v prostředí Bun vykázala 670 úspěšných testů ve 102 testovacích souborech bez jediného selhání @darkfactory-ci-35616745304. Testy pokrývají deterministickou persistenci a serializaci Run State, detekci zastaralého plánu, zachování historie při přepnutí poskytovatele, odvození výsledného stavu z pracovního stromu Git, kontrolu rozsahu oprávnění a ověření původu obnoveného stavu.

Integrační testy v témže snapshotu ověřily provázanost stavového automatu řídícího životní cyklus úlohy. Testy potvrdily správnost přechodů mezi fázemi zadání, plánování, implementace, automatizované revize a schválení, stejně jako reakci systému na webhooks události z platformy GitHub a respektování povinných stavových kontrol @darkfactory-e9c10221.

Zároveň je však nutné explicitně konstatovat limity dostupné evidence: empirický materiál uzavřený k září 2026 nezahrnuje ani jeden plně automatizovaný, živý produkční průchod kompletním životním cyklem od schválení požadavku až po finální merge a rekonciliaci na reálném produkčním nasazení (tato položka zůstala otevřeným akceptačním kritériem v rámci Requestu #359 @darkfactory-request-359). Výsledky proto prokazují spolehlivost navržených mechanismů a jejich systémovou integraci v testovacím a simulačním rámci, nikoli však bezobslužný provoz v neomezeném produkčním prostředí.

#heading(level: 2)[Ověření na repozitářích]

Ověření přenositelnosti a funkčnosti navržených vývojových a integračních postupů bylo provedeno na flotile cílových repozitářů. Evaluace rozlišuje mezi aktivními projekty a historickými či archivovanými repozitáři, přičemž hodnotí konkrétní revize s doložitelnými výsledky automatizovaných pipeline (@tab-repositories).

#figure(
  table(
    columns: (1.5fr, 1fr, 2.2fr, 1.8fr),
    align: (left, center, left, left),
    [*Repozitář*], [*Revize*], [*Důkaz ověření*], [*Výsledek*],
    [`omnis`], [`a53660a1`], [CI run `34708160162`, deploy-docs, release], [Úspěšný (web, paper, docs)],
    [`ChessWithQuests`], [`50a50797`], [CI run `34708180783`, verify-docs, deploy, release], [Úspěšný (paper, web, docs)],
    [`DarkFactory-Paper`], [`5bc04974`], [CI run `35617820423`, deploy `35617820271`, release `35617820286`], [Úspěšný (manuscript, site, release)],
    [`template-OdbornaPrace`], [archivováno], [Stav repozitáře k datu evaluace], [Neaktivní (archivováno)],
    [`OdbornaPrace-mono`], [archivováno], [Stav repozitáře k datu evaluace], [Neaktivní (archivováno)],
  ),
  caption: [Přehled ověření integračních a vývojových pipeline na cílových repozitářích flotily. Zahrnuje konkrétní testované commity a identifikátory běhů CI.],
) <tab-repositories>

V repozitáři `omnis` na revizi `a53660a1c0c6619f94768e5d520405052fb03df6` pipeline run `34708160162` úspěšně dokončil všechny předepsané joby včetně sestavení webové aplikace, kompilace dokumentace a publikačních kontrol @omnis-a53660a1 @omnis-ci-34708160162. V repozitáři `ChessWithQuests` na commitu `50a50797f29c2a636d973981993191a65df3d131` proběhl běh `34708180783` se shodným úspěšným výsledkem pokrývajícím herní logiku, dokumentaci i publikační proces @chesswithquests-50a50797 @chesswithquests-ci-34708180783.

Aktivním publikačním repozitářem samotné této práce je `DarkFactory-Paper`. Na snapshotu `5bc04974f9aed0f55295389154124a09059ff35e` proběhly bez chyb hlavní integrační testy (CI run `35617820423`), nasazení dokumentace (`35617820271`) i publikační release workflow (`35617820286`) @darkfactory-paper-5bc04974 @darkfactory-paper-ci-35617820423 @darkfactory-paper-deploy-35617820271 @darkfactory-paper-release-35617820286.

Zbývající dva původně zamýšlené repozitáře (`template-OdbornaPrace` a `OdbornaPrace-mono`) byly v průběhu výzkumu archivovány @template-odbornaprace-repo @odbornaprace-mono-repo a nejsou proto do aktivního vyhodnocení započítávány. Výsledky tak prokazují spolehlivou funkčnost automatizovaných integračních pipeline na třech odlišných aktivních projektech.

#heading(level: 2)[Odpovědi na výzkumné otázky]

*O1 (Řízená autonomie):* Dostupná evidence podporuje řízenou autonomii jako kombinaci formální specifikace, schváleného plánu, izolované větve, validačních bran a řízeného Pull Requestu. Sada 670 automatizovaných testů a úspěšný CI run `35616745304` systému DarkFactory dokládají kontrolu rozsahu oprávnění, blokování zápisu bez schváleného plánu a ověřování změn @darkfactory-e9c10221 @darkfactory-ci-35616745304. Absence plného živého průchodu celým životním cyklem v produkčním nasazení @darkfactory-request-359 ponechává odolnost vůči neočekávaným vnějším událostem ověřenou pouze v simulačních a integračních testech.

*O2 (Přerušení a obnova):* V dostupném návrhu je obnova založena na oddělení provozního stavu (Run State) a žurnálu interakcí (Session/Transcript) od operační paměti, na rozpočtech běhu a na ověření integrity stavu. Testovací případy v DarkFactory ověřují, že po simulovaném pádu či provider failoveru systém načte Run State, ověří recovery provenance a naváže na rozpracovanou práci bez ztráty konzistence pracovního stromu @darkfactory-e9c10221. Evidence potvrzuje obnovitelnost testovaných scénářů, nikoli univerzální garanci pro libovolný distribuovaný stav třetích stran.

*O3 (Trvalý stav a aktivní kontext):* Rozpor mezi dlouhodobým vývojovým stavem a omezeným kontextovým oknem řeší oddělení externího stavu a historie od aktivního kontextu, do něhož se vybírají data potřebná pro bezprostřední krok smyčky. Architektura DarkFactory podle dostupné evidence odděluje Run State od generovaných promptů a používá selektivní injekci kontextu @darkfactory-e9c10221. Tento postup může omezit degradaci pozornosti, ale výběr a kompakce stále mohou vynechat skryté závislosti v rozsáhlém kódu.

#heading(level: 2)[Diskuse a omezení]

Dosažené výsledky podporují závěr, že samotnou modelovou inferenci je pro dlouhotrvající vývoj účelné zastřešit harnessem. Testovací sady a integrační pipeline dokládají fungování kontroly změn, izolace v repozitáři a základních postupů obnovy v ověřených scénářích.

Zároveň je však nezbytné jasně formulovat, co z dostupných důkazů nevyplývá. Práce nepředkládá statistický srovnávací benchmark produktivity, nákladů či chybovosti agentního vývoje oproti lidským programátorům na standardizovaných sadách úloh, například SWE-bench. Výsledky nedokazují schopnost systému zcela autonomně vyvíjet komplexní software bez počátečního zadání a finální lidské revize; člověk jako garant specifikace a schvalovatel v bodech HITL zůstává podmínkou bezpečnosti. Evaluace také neodstraňuje stochastickou povahu jazykových modelů: harness může chybné výstupy zachytit a zablokovat, ale nezaručuje, že model v libovolné situaci nalezne optimální řešení.

#heading(level: 1)[Závěr]

Spolehlivý dlouhotrvající vývoj nelze založit na růstu schopností jazykového modelu samotného: bezstavová inference nezajišťuje trvalou kontinuitu, neposkytuje řízené provedení účinků v prostředí a v dlouhém kontextu čelí degradaci pozornosti.

Přínosem je propojení harnessu a metodiky agentického inženýrství do jednoho návrhového rámce. Harness organizuje agentní smyčku ReAct, spravuje perzistentní Run State mimo kontextové okno modelu a zprostředkuje nástroje i kontroly. Metodika na tuto vrstvu navazuje specifikací, ohraničeným plánováním, izolací větví Git, CI kontrolami a explicitní integrací.

Principy byly v dostupné implementaci a testovacím rámci ověřeny prostřednictvím 670 úspěšných automatizovaných testů v 15 CI jobech a verifikace na třech aktivních repozitářích. Evidence podporuje mechanismy řízené autonomie, obnovy a oddělení stavu od aktivního kontextu v testovaných scénářích. Zároveň chybí živý produkční průchod celým životním cyklem, takže rozsah zobecnění zůstává omezený.

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("bib/references.bib", style: "iso-690-numeric", title: none)

#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
