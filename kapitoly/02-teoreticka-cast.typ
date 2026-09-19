#import "../templates/registry.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, terms

= #finalized[Teoretická část: Vymezení konceptu]

== #finalized[Správa verzí \[Version Control\], Plánování \[Planning\], Kontinuální integrace \[Continuous Integration\] (CI a GitHub Actions) a Požadované kontroly \[Required Checks\]]

=== #finalized[#term(terms.git, marker: false, linked: false, emphasized: false) a #term(terms.github, marker: false, linked: false, emphasized: false)]
#accepted[
Pro autonomní vývoj softwaru je spolehlivá správa verzí naprosto nezbytným základem. Jazykové modely generují kód na základě statistické pravděpodobnosti, a proto se nevyhnutelně dopouštějí chyb, logických přehmatů či regresí. Verzovací systém vytváří bezpečné a deterministické prostředí, v němž lze každou úpravu zaznamenat, otestovat a v případě selhání kdykoliv vrátit zpět k funkčnímu stavu. Namísto teoretických abstrakcí práce přímo využívá distribuovaný systém #term(terms.git) v kombinaci s platformou #term(terms.github).

Klíčové komponenty infrastruktury zahrnují:
- *Distribuovaný systém Git* @chacon2014: Ukládá kompletní historii projektu v podobě jednotlivých revizí (_commitů_). Vývojář i agent pracují s plnou lokální kopií repozitáře, což umožňuje provádět změny, přepínat větve a spouštět lokální testy zcela nezávisle na síťovém připojení.
- *Platforma GitHub*: Slouží jako centrální bod pro sdílení kódu, týmovou koordinaci a automatizaci:
  - *Zadávání a sledování úkolů (Issues)*: Strukturovaná textová zadání požadavků a hlášení chyb, která agentovi slouží jako výchozí specifikace úlohy.
  - *Revize změn (Pull Requests)*: Uživatelské rozhraní pro přehledné zobrazení diffu, diskusi nad kódem a formální schválení člověkem.
  - *Automatizace (GitHub Actions)*: Běhové prostředí pro automatické spouštění testů, linterů a překladů při každé události v repozitáři.

Agent v tomto pojetí nevystupuje jako černá skříňka s proprietárním protokolem, nýbrž jako standardní přispěvatel, který plně respektuje běžné vývojářské zvyklosti a nástroje.
]

=== #finalized[Větve (Branches)]

#unconfirmed[
Základním bezpečnostním pravidlem při zapojení autonomních agentů do vývoje je striktní izolace rozpracovaného kódu. Stabilní kód v hlavní větvi (`main`) nesmí být nikdy přímo vystaven experimentům a chybám modelu. Agent proto veškeré úpravy provádí ve vyhrazených pracovních větvích odbočených ze základní linie projektu.

Tento princip přináší následující výhody:
- *Ochrana produkční větve*: Hlavní větev (`main`) reprezentuje stabilní, otestovaný stav připravený k nasazení. Přímé zapisování do této větve je zakázáno jak lidským vývojářům, tak autonomním agentům.
- *Dedikovaná větev pro každý úkol*: Agent pro každé zadání dynamicky vytvoří novou samostatnou větev (např. `task/123-oprava-parseru` či `agent/feature-auth`).
- *Izolace chyb a mezistavů*: Případné syntaktické chyby, dočasné nefunkční stavy ani neúspěšné hypotézy neovlivňují stabilitu hlavní větve ani práci ostatních vývojářů v týmu.
- *Bezpečné zahození nezdařených běhů*: Pokud se agent dostane do slepé uličky nebo vyčerpá přidělený rozpočet kroků, celou větev lze smazat jedním příkazem bez jakýchkoliv následků pro zbytek repozitáře.

Pokud se hlavní větev během práce agenta posune dopředu v důsledku jiné aktivity v repozitáři, pracovní větev agenta se musí před dokončením zaktualizovat (`git rebase` nebo `git merge`), aby byla zajištěna bezkonfliktní integrace.
]

=== #finalized[Pull Request]

#unconfirmed[
#diff[Pull request (PR) představuje stěžejní komunikační uzel mezi autonomním agentem a lidským inženýrem. Jedná se o formální žádost o začlenění navržených změn z pracovní větve do větve hlavní. V tomto bodě se plně uplatňuje princip zapojení člověka do smyčky (*Human-in-the-loop*):][#term(terms.pull_request, render: "both", detail-language: "cs", detail-style: "inline"). V tomto bodě se plně uplatňuje princip #term(terms.human_in_the_loop):] agent kód samostatně navrhne a otestuje, avšak konečné rozhodnutí o jeho přijetí náleží vývojáři.

Rozhraní pull requestu integruje všechny podstatné informace na jednom místě:
- *Řádkový diff*: Vizuální srovnání původního a nového stavu, kde jsou jasně barevně odlišeny přidané, změněné a smazané řádky.
- *Strukturovaný souhrn změn*: Agent v popisu PR srozumitelně shrne, jaké úpravy provedl, jakou logiku zvolil a na které původní issue reagoval.
- *Výsledky automatických kontrol*: Přehled stavu automatizovaných testů a linterů z GitHub Actions (zelený či červený indikátor).
- *Revizní diskuse*: Možnost vývojáře přidávat komentáře k libovolnému řádku kódu, klást doplňující dotazy nebo vyžadovat přepracování konkrétních částí.

Lidský vývojář v roli revizora (Reviewer) posuzuje celkový architektonický záměr a rozhoduje o schválení, vrácení k dopracování, či zamítnutí pull requestu.
]

#unconfirmed[
=== Slučování změn (Squash and Merge)

Způsob, jakým se změny z pracovní větve začlení do větve hlavní, má zásadní dopad na dlouhodobou udržitelnost a čitelnost repozitáře. Autonomní agent při řešení úlohy obvykle postupuje iterativní metodou pokus-omyl: upraví soubor, spustí testy, odhalí překlep a provede další drobný commit. V pracovní větvi tak vzniká dlouhá sekvence pomocných a experimentálních záznamů.

Zatímco klasický merge commit přenese do hlavní větve veškeré dílčí commity a rebase je lineárně přeskládá, v agentním vývoji se jako optimální strategie uplatňuje *Squash and Merge*:
- *Sloučení mezikroků*: Všechny commity z pracovní větve jsou spojeny do jediného nového commitu, který je vložen do `main`.
- *Eliminace interního šumu*: Pomocné commity vzniklé při ladění testů se do hlavní větve vůbec nedostanou; historie projektu zůstává čistá a přehledná podle pravidla: jeden úkol = jeden commit.
- *Atomický návrat změn (`git revert`)*: Pokud se v budoucnu ukáže, že začleněná úprava zanesla do produkce nečekanou vadu, lze celý úkol vrátit jediným atomickým příkazem bez nutnosti rozplétat desítky dílčích mezikroků.
]

#unconfirmed[
=== Kontinuální integrace (CI a GitHub Actions)

Samotný jazykový model kód pouze generuje na základě statistických závislostí v trénovacích datech; nemá schopnost vnitřně ověřit, zda je vytvořený program syntakticky bezchybný a funkčně správný. Nezastupitelnou roli objektivního arbitra správnosti proto plní *kontinuální integrace* (CI) @humble2010.

V rámci platformy GitHub zajišťuje kontinuální integraci vestavěný nástroj *GitHub Actions*:
- *Spouštění v čistých kontejnerech*: Každé workflow běží v nově alokovaném virtuálním prostředí se zamčenými verzemi nástrojů a závislostí, což vylučuje chyby způsobené lokálním stavem počítače vývojáře.
- *Automatická exekuce*: Integrační pipeline se automaticky spouští při každém pushi do pracovní větve i při otevření pull requestu.
- *Deterministická zpětná vazba pro agenta*: Pokud překlad nebo testy selžou, chybový protokol z terminálu je předán zpět do kontextu agenta, který na jeho základě provede informovanou opravu kódu.
]

#critique[
  *Nestálost testů (Flaky Tests) v integračních bězích:*
  Spoléhání se na automatické testy v CI naráží na problém nestálých testů (_flaky tests_), které občas selžou kvůli časování, síťové odezvě či asynchronním stavům, aniž by kód obsahoval chybu. Pokud agent narazí na takto náhodně selhávající test, může začít nesmyslně upravovat správný kód ve snaze chybu odstranit. CI pipeline proto musí nestálé testy minimalizovat nebo umožnit automatické opakování selhaného běhu v čistém prostředí.
]

#unconfirmed[
=== Požadované kontroly (Required Checks) a ochrana větví

K tomu, aby byla kontinuální integrace efektivní, nestačí testy pouze spouštět — jejich úspěšné dokončení musí být systémově vynuceno. GitHub za tímto účelem poskytuje pravidla ochrany větví (_Branch Protection Rules_), která zabraňují začlenění neověřeného kódu do stabilní větve `main`.

Klíčové mechanismy ochrany zahrnují:
- *Požadované kontroly (_Required Checks_)*: Seznam úloh v GitHub Actions, které musí skončit explicitním úspěchem (zelený stav), aby bylo technicky možné pull request sloučit:
  - *Statická analýza a linter*: Kontrola dodržení kódového stylu, odhalování mrtvého kódu a základních syntaktických prohřešků.
  - *Typová kontrola a build*: Jistota, že kód lze bez chyb zkompilovat a že typový systém nezaznamenal nekonzistence.
  - *Automatizované testy*: Úspěšný průchod jednotkových i integračních testů ověřujících požadované chování.
- *Pravidlo deterministického výsledku*: Každá kontrola musí skončit jednoznačným výsledkem; tiché přeskočení testu nebo nejednoznačný stav sloučení zablokuje.
- *Povinné schválení člověkem*: Požadavek na explicitní autorizaci kódu lidským vývojářem dříve, než GitHub povolí sloučení do produkční větve.
]

== #finalized[#term(terms.language_model, name-type: "industry", language: "en", marker: false, linked: false, emphasized: false), chatboti a agenti]

#blue-note[
  Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je *agentické inženýrství* (_agentic engineering_) a *architektura řídicího harnessu* pro autonomní vývoj softwaru. Následující text je proto záměrně zredukován na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů, degradace pozornosti a rozhraní nástrojů.
]

=== #finalized[Úvod]

#accepted[
V agentickém softwarovém inženýrství vystupuje velký jazykový model (LLM) jako stochastické kognitivní jádro celého systému. Z hlediska vnitřní architektury se jedná o dekodérový transformer (_Decoder-only_), jehož typickými představiteli jsou moderní modely řad Claude, GPT či DeepSeek @vaswani2017. Role modelu nespočívá ve vystupování jako vševědoucí orákulum se spolehlivou znalostí okolního světa, nýbrž jako pokročilý generátor hypotéz, kódu a strukturovaných volání nástrojů řízený obdrženým kontextem.

Základní principy fungování modelu zahrnují:
- *Autoregresivní predikce*: Model zpracovává zadanou sekvenci textu a na jejím základě iterativně předpovídá nejpravděpodobnější následující symboly (tokeny).
- *Stochastická povaha*: Vzhledem k pravděpodobnostnímu vzorkování může model na totožný vstup reagovat mírně odlišně, což vyžaduje deterministické mantinely v nadřazeném řídicím harnessu.

Pro efektivní nasazení modelu do vývojového cyklu je nezbytné porozumět způsobu, jakým reprezentuje informace a jaké fyzické limity vymezují jeho operační paměť.
]

=== #finalized[Tokeny, tokenizace a Vektorová reprezentace \[Embedding\]]

#finalized[
Jazykový model nepracuje přímo se znaky ani slovy v lidském slova smyslu. Vstupní text je nejprve deterministickým algoritmem převeden na číselné reprezentace, se kterými následně počítají maticové vrstvy neuronové sítě.

Tento proces zahrnuje následující pojmy:
]
- #finalized[*Tokeny a tokenizér*: Token představuje základní diskrétní jednotku (celé slovo, slabiku či fragment znaků). Převod mezi textem a posloupností číselných tokenů zajišťuje tokenizér (nejčastěji na bázi algoritmu Byte Pair Encoding, BPE).]
- #finalized[#term(terms.embedding, render: "both", detail-language: "cs", detail-style: "inline") (např. vektorová analogie $"král" - "muž" + "žena" approx "královna"$).]
- #finalized[*Jazyková asymetrie tokenizace*: Vzhledem k trénovacím datům optimalizovaným primárně pro angličtinu spotřebovávají flektivní jazyky s bohatou diakritikou (včetně češtiny) 2× až 3× více tokenů pro vyjádření téhož významu.]

#finalized[
Z inženýrského hlediska je proto žádoucí vést systémové prompty, technické plány i komunikaci mezi nástroji v angličtině, aby se šetřila kapacita kontextu a snížila latence inference.
]

#unconfirmed[
=== Tahy a správa KV cache

Interakce mezi modelem, uživatelem a okolním vývojovým prostředím neprobíhá spojitě, nýbrž v diskrétních krocích označovaných jako *tahy* (_turns_). Každý tah představuje jednu ucelenou výměnu zprávy, na niž systém reaguje.

Životní cyklus tahů a správa paměti zahrnují:
- *Typy tahů v agentní smyčce*:
  - *Tah uživatele či prostředí (_User Turn_)*: Nové zadání úkolu nebo vnější událost.
  - *Tah modelu (_Model Turn_)*: Vygenerovaná odpověď nebo strukturovaný požadavek na spuštění nástroje.
  - *Tah nástroje (_Tool Execution Turn_)*: Zpětné hlášení výsledku exekuce (výpis souboru, výstup kompilátoru).
- *Správa KV cache (Key-Value Cache)*: Aby inferenční engine nemusel při každém novém tahu přepočítávat celou historii od začátku, ukládá mezivýpočty klíčů a hodnot matic pozornosti do paměti.
- *Kontextové okno (_Context Window_)*: Pevně limitovaná kapacita paměti modelu. Tento strop je dán hardwarovými limity GPU akcelerátorů a kvadratickou složitostí plné pozornosti ($O(N^2)$ vzhledem k délce sekvence).
]

#unconfirmed[
=== Kompakce kontextu a ztrátová komprese

Při rozsáhlejších úlohách se kontextové okno nevyhnutelně zaplní. V okamžiku, kdy objem historie dosáhne kritické hranice, musí řídicí harness přistoupit ke *kompakci kontextu* (_compaction_) — model je vyzván, aby dosavadní průběh sezení zkrátil do syntetického souhrnu, který nahradí starší část historie.

Tento proces však představuje destruktivní ztrátovou kompresi:
- *Ztráta deterministických detailů*: Model při rekurzivním zkracování vynechává přesná čísla řádků, signatury privátních funkcí, přesné cesty k souborům a doslovná chybová hlášení kompilátoru.
- *Oslabení negativních pravidel*: Explicitní zákazy (např. neměnit veřejné rozhraní API) bývají v souhrnu zevšeobecněny nebo zcela vypuštěny.
- *Konfirmační zkreslení (_Confirmation Bias_)*: Model v souhrnu upřednostňuje fakta odpovídající jeho vnitřním statistickým asociacím na úkor netriviálních specifik konkrétního projektu.
]

#unconfirmed[
=== Sémantický posun (Semantic Drift)

Opakovaná ztrátová komprese vede k závažné patologii známé jako *sémantický posun* (_Semantic Drift_). Pokud je historie sezení v dlouhém vývojovém běhu shrnována vícekrát po sobě, vzniká řetězec ztrátových transformací ($S_(k+1) = f(S_k, Delta_k)$).

Rizika sémantického posunu spočívají v těchto jevech:
- *Efekt tiché pošty*: Drobné zkreslení či halucinace vzniklá v kole $k$ je v kole $k+1$ přijata jako nezpochybnitelný historický fakt.
- *Divergence modelu od reality*: Po několika cyklech komprese se vnitřní model reality agenta zcela rozejde se skutečným stavem zdrojového kódu v souborovém systému.

Výsledkem je stav, kdy agent sebevědomě reportuje vyřešení úkolu, ačkoliv reálný kód zůstává v nefunkčním či neúplném stavu.
]

#unconfirmed[
=== Alternativní paměťové architektury (RAG a stavový graf)

Aby se předešlo ztrátě informací způsobené kompakcí, moderní agentní architektury přesouvají část paměti mimo samotné kontextové okno. Namísto spoléhání se na jediný lineární textový kontext se uplatňují strukturovaná externí úložiště.

K hlavním přístupům patří:
- *Hierarchická epizodická paměť (RAG)*: Ukládání doslovných protokolů nástrojů a historie úloh do externí databáze; do kontextu se selektivně injektují pouze bezprostředně relevantní fragmenty.
- *Persistentní graf stavu projektu (_Project State Graph_)*: Udržování explicitního, strukturovaného přehledu o stavu repozitáře (seznam modifikovaných souborů, otevřené úkoly, výsledky testů a platné invarianty) mimo kontextové okno.

Díky tomu může agent kdykoliv obnovit přesný stav projektu bez závislosti na ztrátovém rekurzivním shrnování.
]

#unconfirmed[
=== #term(terms.context_rot, marker: false, linked: false, emphasized: false)

Schopnost jazykového modelu pracovat s dlouhým kontextem nelze posuzovat pouze podle nominální velikosti okna. Ačkoliv moderní modely deklarují kapacitu statisíců tokenů, jejich schopnost efektivně vyhledávat a logicky propojovat fakta s rostoucí délkou kontextu výrazně klesá. #diff[Tento jev se označuje jako *degradace pozornosti* (_Context Rot_).][Tento jev se v agentickém inženýrství označuje jako #term(terms.context_rot, render: "both", detail-language: "cs", detail-style: "inline").]

V praxi se projevuje dvěma hlavními mechanismy:
- *Lost in the Middle* @liu2024: Pozornostní vrstvy transformeru spolehlivě vnímají informace na samém začátku a konci okna, zatímco fakta umístěná uprostřed dlouhého textu jsou často přehlížena.
- *Multi-Needle Reasoning*: Schopnost logicky provázat několik na sobě závislých informací rozptýlených napříč různými soubory; s rostoucí délkou kontextu tato schopnost prudce klesá.

Při komplexním křížovém refaktoringu ve velkém kontextu proto model často přehlédne klíčové souvislosti, které by v menším a čistším okně zpracoval bez potíží.
]

#unconfirmed[
=== #term(terms.prompt_engineering, name-separator: "paren", name-order: "en-cs", marker: false, linked: false, emphasized: false) a negativní instrukce

#diff[Základní chování agenta vymezuje *systémový prompt* @anthropic-prompt, který definuje jeho identitu, sadu dostupných nástrojů a provozní mantinely.][#term(terms.prompt_engineering, render: "both", detail-language: "cs", detail-style: "inline") představuje klíčový předpoklad deterministického chování: základní chování agenta vymezuje systémový prompt @anthropic-prompt, který definuje jeho identitu, sadu dostupných nástrojů a provozní mantinely.]
 Při formulaci těchto pravidel však vývojáři narážejí na specifickou vlastnost autoregresivních modelů — problematické zpracování zákazů a negativních instrukcí.

Příčiny a inženýrská řešení tohoto jevu:
- *Úskalí negativních instrukcí*: Zákazy formulované negací (např. „nemazat existující testy“) modely často porušují, protože matice pozornosti ($Q K^T$) asociativně aktivuje zakázaný pojem dříve, než autoregresní proces uplatní logický operátor negace.
- *Afirmativní formulace*: Pravidla je nutné formulovat pozitivně — namísto výčtu zákazů vymezit přesný postup a povolené mantinely chování.
- *Deterministická ochrana v harnessu*: Kde nestačí prompt, musí zasáhnout kód řídicího harnessu — například zpřístupněním testovacích souborů pouze pro čtení nebo zablokováním destruktivních operací na úrovni systémového volání.
]

== #accepted[#term(terms.agentic_engineering, name-separator: "paren", name-order: "cs-en", marker: false, linked: false, emphasized: false) a #term(terms.harness, language: "en", marker: false, linked: false, emphasized: false)]

=== #finalized[Úvod]

#accepted[
V terminologii agentického inženýrství používá tato práce pojem #term(terms.harness). #term(terms.harness, render: "explanation", detail-language: "cs", detail-style: "inline", register: false, linked: false, marker: false, emphasized: false). Samotné inferenční jádro provádí výhradně matematické maticové operace nad zadanými váhami a vektory tokenů; veškerou orchestraci, práci se soubory a řízení bezpečnosti zajišťuje harness.

Ústřední komponentou a hlavní prováděcí funkcí, která v architektuře harnessu řídí samotný běh a iterativní koordinaci agenta v reálném vývojovém prostředí, je #term(terms.agent_loop). #term(terms.agent_loop, render: "explanation", detail-language: "cs", detail-style: "inline", register: false, linked: false, marker: false, emphasized: false).
]

=== #finalized[#term(terms.agent, marker: false, linked: false, emphasized: false) vs. #term(terms.chatbot, marker: false, linked: false, emphasized: false)]

#accepted[
#term(terms.chatbot, render: "both", detail-language: "cs", detail-style: "inline"). #term(terms.agent, render: "both", detail-language: "cs", detail-style: "inline"). Rozdíl mezi nimi nespočívá v odlišném jazykovém modelu, ale v architektuře jeho zapojení do pracovního prostředí.

Srovnání obou přístupů:
- *Konverzační chatbot*:
  - Reaguje pouze na přímé textové výzvy v uzavřeném okně chatu.
  - Nemá přímý přístup k souborovému systému ani k nástrojům operačního systému.
  - Uživatel musí navržený kód ručně zkopírovat, vložit do projektu a otestovat.
- *Autonomní agent*:
  - Je vybaven sadou výkonných nástrojů (_tools_) pro práci s repozitářem.
  - Aktivně prozkoumává soubory, modifikuje zdrojový kód, spouští testy a interpretuje jejich návratové kódy.
  - Funguje v autonomní prováděcí smyčce, v níž iterativně reaguje na reálnou odezvu vývojového prostředí.
]

#unconfirmed[
=== #diff[Agentní smyčka a prováděcí cyklus ReAct][#term(terms.agent_loop, name-type: "both", name-separator: "bar", name-type-separator: "paren", marker: false, linked: false, emphasized: false)]

Agentní smyčka (_Agent Loop_) představuje výkonné jádro celého řídicího harnessu. Zatímco pasivní konverzační chatbot jednorázově odpoví na uživatelský dotaz a čeká na další vstup, agentní smyčka autonomně udržuje kontinuální iterativní proces, v němž harness opakovaně vyhodnocuje stav repozitáře, volá jazykový model a vykonává požadované systémové akce.

V každé iteraci agentní smyčky harness zajišťuje tyto klíčové funkce:
- *Inicializace a správa sezení*: Sestavení systémového promptu, dynamická injekce kontextu repozitáře a sledování spotřeby tokenů.
- *Běhové prostředí nástrojů*: Bezpečné spouštění příkazů v operačním systému a zpětné předávání výstupů modelu.
- *Řízení stavových přechodů a vynucování mantinelů*: Dohled nad dodržováním procesních pravidel, detekce a zastavení uvíznutých běhů a vynucování lidských schvalovacích bran.

Vnitřní kognitivní krok modelu uvnitř smyčky se řídí operačním vzorem *ReAct* (_Reasoning + Acting_) @yao2022, který propojuje rozvahu s přímým jednáním. Tento prováděcí cyklus sestává ze čtyř navazujících fází znázorněných na @fig-react-loop:
1. *Rozvaha (_Thought_)*: Model vyhodnotí aktuální stav kontextu a formuluje svůj nejbližší záměr.
2. *Volání nástroje (_Tool Call_)*: Emitování strukturovaného požadavku na provedení konkrétní akce s určenými parametry.
3. *Vykonání a pozorování (_Observation_)*: Harness bezpečně provede akci v systému a výstup (výpis souboru či chybovou zprávu) vloží zpět do kontextu.
4. *Navazující iterace*: Model v dalším tahu analyzuje získanou odezvu a rozhoduje o dalším kroku.

Kvalita a provozní spolehlivost celého systému tak závisí v prvé řadě na robustnosti architektury harnessu a spolehlivosti jeho agentní smyčky, nikoliv pouze na samotném jazykovém modelu.

]

#figure(
  image("../img/react-loop.svg", width: 100%),
  caption: [#accepted[Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.]],
) <fig-react-loop>

#unconfirmed[
=== Spouštění nástrojů [Tool Calling]

Aby mohl agent provádět reálné inženýrské operace, musí mu řídicí harness zpřístupnit systémové nástroje. Způsob, jakým jsou nástroje modelům předkládány, zásadně ovlivňuje ergonomii vývoje i bezpečnost celého systému.

*Strukturované volání nástrojů (_Tool / Function Calling_)* používá vstupy a výstupy striktně validované vůči formálním JSON schématům. Zajišťuje vysokou typovou bezpečnost, avšak přináší režii tokenů spotřebovaných na definice schémat.
]

#unconfirmed[
=== Sandbox

*Přímé spouštění kódu (_Code Execution_)* umožňuje agentovi generovat skripty (bash, Python), které harness spouští v izolovaném terminálu. Tento model poskytuje maximální flexibilitu pro softwarový vývoj, avšak vyžaduje nekompromisní bezpečnostní izolaci.
]

#critique[
  *Iluzorní bezpečnost pískoviště*: Přímé spouštění netestovaného syntetického kódu v běžném Docker kontejneru nelze považovat za plnohodnotnou bezpečnostní hranici (_security boundary_). Přístup k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky environmentálních tajností (GitHub tokeny, API klíče k LLM) přes skryté síťové kanály a kompromitaci CI infrastruktury. Pro bezpečný produkční provoz je nezbytná formální izolace na bázi microVM (např. AWS Firecracker, gVisor) a striktní izolace síťových jmenných prostorů.
]

#unconfirmed[
=== Patologie divergence: perseverace a oscilace

Ponechání jazykového modelu v neomezené prováděcí smyčce vede k předvídatelným selháním. V důsledku autoregresivní povahy se v kontextu snadno vytvoří pravděpodobnostní atraktor, který model uvězní v neproduktivním cyklu.

Mezi typické patologie patří:
- *Perseverace a zacyklení*: Opakované volání identického nástroje se stejnými neplatnými argumenty (např. čtení neexistujícího souboru) i po obdržení chybové zprávy.
- *Oscilace a těkání (_Thrashing_)*: Střídavé přepínání mezi dvěma protichůdnými zásahy (úprava modulu A rozbije modul B a následná oprava B rozbije modul A).
- *Nekontrolovaná spotřeba zdrojů (_Context Runaway_)*: Rychlé vyčerpání kontextového okna i finančního rozpočtu na volání API bez dosažení cíle.
]

=== #finalized[#term(terms.skills, name-separator: "paren", name-order: "cs-en", marker: false, linked: false, emphasized: false)]

#accepted[Se vzrůstající komplexitou úloh nelze veškeré instrukce, skripty a doménové znalosti vkládat do základního systémového promptu. K modulárnímu rozšíření schopností agenta slouží #term(terms.skills, render: "both", detail-language: "cs", detail-style: "inline").]

#unconfirmed[
Architektura dovedností staví na následujících principech:
- *Definiční soubor `SKILL.md`*: Dovednost tvoří adresář obsahující definiční soubor se strukturovanou hlavičkou (YAML frontmatter vymezující název a popis role) a detailním návodem k použití.
- *Dynamické načítání pro úsporu kontextu*: Do výchozího promptu se vloží pouze stručný přehled dostupných dovedností. Kompletní instrukce a skripty se do kontextu načtou až v okamžiku, kdy agent danou dovednost explicitně vyvolá.
- *Skripty a záchytné body (_Scripts & Hooks_)*: Dovednosti mohou obsahovat deterministické skripty pro rutinní transformace kódu a událostní háčky vyvolávané při stavových přechodech harnessu.

#diff[][Kromě kontextových dovedností využívají pokročilé řídicí architektury také programové #term(terms.plugins, render: "both", detail-language: "cs", detail-style: "inline"). Zatímco _Skills_ fungují jako kontextové procedury a instrukce interpretované modelem, pluginy rozšiřují samotný harness na nativní systémové úrovni.]
]

#unconfirmed[
=== #term(terms.mcp, marker: false, linked: false, emphasized: false) servery

#diff[Pro sjednocení rozhraní mezi jazykovými modely a externími nástroji či datovými zdroji vznikl otevřený standard *Model Context Protocol (MCP)* @anthropic-mcp. Namísto vytváření proprietárních rozhraní pro každou službu definuje MCP univerzální protokol.][Pro sjednocení rozhraní mezi jazykovými modely a externími nástroji či datovými zdroji vznikl #term(terms.mcp, render: "both", detail-language: "cs", detail-style: "inline") @anthropic-mcp. Namísto vytváření proprietárních rozhraní pro každou službu definuje MCP univerzální protokol.]

Základní vlastnosti protokolu MCP:
- *Protokolové rozhraní*: Komunikace probíhá prostřednictvím standardu JSON-RPC (přes standardní vstup/výstup `stdio` nebo proud událostí `Server-Sent Events / SSE`).
- *Architektonické oddělení*: Implementace nástrojů běží jako samostatný proces mimo jádro harnessu. MCP servery fungují jako znovupoužitelné komponenty, které lze snadno sdílet napříč různými agenty a projekty.
]

#unconfirmed[
=== #finalized[Škálování: Multiagentní systémy (Subagenti) a grafy (DAG workflows) \[Scaling: Multiagent Systems (Subagents) and DAG Workflows (Graphs)\]]

Monolitická agentní smyčka selhává při řešení komplexních, vícefázových úloh. Pro spolehlivé škálování se v moderních systémech uplatňuje hierarchická dělba práce a formalizace procesu do podoby grafu.

Klíčové přístupy ke škálování zahrnují:
- *Subagenti (_Subagents_)*: Hlavní orchestrátor dekomponuje rozsáhlou úlohu a deleguje dílčí kroky na specializované agenty (např. průzkumník repozitáře, plánovač, kódovací dělník). Po dokončení je kontext subagenta zahozen a orchestrátor obdrží pouze čistý výsledek, což chrání primární kontext před znečištěním (_context pollution_).
- *Pracovní postupy jako grafy (DAG / Graph Engineering)*: Životní cyklus požadavku je modelován jako orientovaný acyklický graf (příjem $arrow$ plán $arrow$ kód $arrow$ testy $arrow$ schválení). Hrany definují striktní závislosti (`needs`); selhání v libovolném uzlu okamžitě zastaví navazující kroky.
]

#unconfirmed[
=== #term(terms.human_in_the_loop, marker: false, linked: false, emphasized: false)

Základním principem navrženého řešení není nekritická plná autonomie, nýbrž efektivní kooperace člověka a stroje. Autonomnímu systému náleží mechanické a rutinní úkony, zatímco klíčová architektonická a nevratná rozhodnutí zůstávají plně pod kontrolou vývojáře.

Řízení lidského dohledu staví na těchto pilířích:
- *Lidské schvalovací brány (_Human Gates_)*: Formální procesní uzly, v nichž se automatický běh pozastaví a vyčká na autorizaci operátora:
  - *1. brána (Záměr a plán)*: Člověk autorizuje technický plán a rozpad požadavku dříve, než agent začne modifikovat kód v souborech.
  - *2. brána (Sémantická revize)*: Člověk provádí finální kontrolu diffu v pull requestu před jeho začleněním do hlavní větve.
- *Prevence únavy z revizí (_Review Fatigue_)*: Vyvážená frekvence kontrol — zamezení mikromanagementu na úrovni jednotlivých souborů při zachování kontroly nad celkovým architektonickým směrem.
- *Dohledatelnost původního zadání*: Trvalé uchovávání doslovného znění požadavku (GitHub Issue) bez ztrátových parafrází modelem, což brání vymizení okrajových podmínek v průběhu vývoje.
- *Transparentnost selhání a deterministická eskalace*: Zákaz tichého pohlcování chyb či halucinovaných omluv při selhání. Při vyčerpání rozpočtu nebo selhání testů harness vygeneruje strukturovaný diagnostický incident (diff, chybové hlášení, stav kontextu) a předá jej vývojáři k manuálnímu zásahu.
]

#critique[
  *Kognitivní limity lidské schvalovací brány (Review Fatigue):*
  Spoléhání se na finální sémantickou kontrolu diffu v pull requestu naráží na lidské kognitivní limity. Výzkumy prokazují, že u rozsáhlých diffů (nad 300–400 řádků) dramaticky klesá hloubka lidské pozornosti — vývojář kód pouze zběžně prohlédne a spoléhá na zelenou fajfku z CI. Aby byla lidská brána efektivní, harness musí diffy rozkládat do sémanticky sevřených mikrokroků, generovat interaktivní vysvětlení netriviálních rozhodnutí a explicitně zvýrazňovat změny v kritických architektonických komponentách.
]
