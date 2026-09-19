#import "../templates/registry.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note, term, kw

= #confirmed[Teoretická část – Analýza konceptu]

== #confirmed[Git a GitHub (Správa verzí)]

=== #confirmed[Úvod]
#confirmed[
Pro autonomní vývoj softwaru je spolehlivá správa verzí naprosto nezbytným základem. Jazykové modely generují kód na základě statistické pravděpodobnosti, a proto se nevyhnutelně dopouštějí chyb, logických přehmatů či regresí. Verzovací systém vytváří bezpečné a deterministické prostředí, v němž lze každou úpravu zaznamenat, otestovat a v případě selhání kdykoliv vrátit zpět k funkčnímu stavu. #diff[Namísto teoretických abstrakcí práce přímo využívá distribuovaný systém *Git* v kombinaci s platformou *GitHub*.][Namísto teoretických abstrakcí práce přímo využívá distribuovaný systém #term("Git", explanation: "Distribuovaný systém správy verzí umožňující sledování historie změn kódu, větvení a deterministické vracení k předchozím funkčním stavům repozitáře.") v kombinaci s platformou #term("GitHub", explanation: "Cloudová platforma pro hosting gitových repozitářů, správu vývojového cyklu (Issues, Pull Requests) a automatizaci CI/CD pracovních postupů.") .]

Klíčové komponenty infrastruktury zahrnují:
- *Distribuovaný systém Git* @chacon2014: Ukládá kompletní historii projektu v podobě jednotlivých revizí (_commitů_). Vývojář i agent pracují s plnou lokální kopií repozitáře, což umožňuje provádět změny, přepínat větve a spouštět lokální testy zcela nezávisle na síťovém připojení.
- *Platforma GitHub*: Slouží jako centrální bod pro sdílení kódu, týmovou koordinaci a automatizaci:
  - *Zadávání a sledování úkolů (Issues)*: Strukturovaná textová zadání požadavků a hlášení chyb, která agentovi slouží jako výchozí specifikace úlohy.
  - *Revize změn (Pull Requests)*: Uživatelské rozhraní pro přehledné zobrazení diffu, diskusi nad kódem a formální schválení člověkem.
  - *Automatizace (GitHub Actions)*: Běhové prostředí pro automatické spouštění testů, linterů a překladů při každé události v repozitáři.

Agent v tomto pojetí nevystupuje jako černá skříňka s proprietárním protokolem, nýbrž jako standardní přispěvatel, který plně respektuje běžné vývojářské zvyklosti a nástroje.
]

#unconfirmed[
=== Větve (Branches) a izolace kódu

Základním bezpečnostním pravidlem při zapojení autonomních agentů do vývoje je striktní izolace rozpracovaného kódu. Stabilní kód v hlavní větvi (`main`) nesmí být nikdy přímo vystaven experimentům a chybám modelu. Agent proto veškeré úpravy provádí ve vyhrazených pracovních větvích odbočených ze základní linie projektu.

Tento princip přináší následující výhody:
- *Ochrana produkční větve*: Hlavní větev (`main`) reprezentuje stabilní, otestovaný stav připravený k nasazení. Přímé zapisování do této větve je zakázáno jak lidským vývojářům, tak autonomním agentům.
- *Dedikovaná větev pro každý úkol*: Agent pro každé zadání dynamicky vytvoří novou samostatnou větev (např. `task/123-oprava-parseru` či `agent/feature-auth`).
- *Izolace chyb a mezistavů*: Případné syntaktické chyby, dočasné nefunkční stavy ani neúspěšné hypotézy neovlivňují stabilitu hlavní větve ani práci ostatních vývojářů v týmu.
- *Bezpečné zahození nezdařených běhů*: Pokud se agent dostane do slepé uličky nebo vyčerpá přidělený rozpočet kroků, celou větev lze smazat jedním příkazem bez jakýchkoliv následků pro zbytek repozitáře.

Pokud se hlavní větev během práce agenta posune dopředu v důsledku jiné aktivity v repozitáři, pracovní větev agenta se musí před dokončením zaktualizovat (`git rebase` nebo `git merge`), aby byla zajištěna bezkonfliktní integrace.
]

#unconfirmed[
=== Model pull requestu (PR)

#diff[Pull request (PR) představuje stěžejní komunikační uzel mezi autonomním agentem a lidským inženýrem. Jedná se o formální žádost o začlenění navržených změn z pracovní větve do větve hlavní. V tomto bodě se plně uplatňuje princip zapojení člověka do smyčky (*Human-in-the-loop*):][#term("Pull Request", explanation: "Formální návrh na začlenění změn z jedné větve repozitáře do druhé, který slouží jako platforma pro automatizované testování (CI), kódovou revizi člověkem a diskusi o navržených úpravách.") představuje stěžejní komunikační uzel mezi autonomním agentem a lidským inženýrem. Jedná se o formální žádost o začlenění navržených změn z pracovní větve do větve hlavní. V tomto bodě se plně uplatňuje princip #term("Human-in-the-loop", explanation: "Návrhový vzor vyžadující autorizaci lidského operátora formou schvalovacích bran (Human Gates) v klíčových rozhodovacích bodech před provedením nevratných systémových operací.") :] agent kód samostatně navrhne a otestuje, avšak konečné rozhodnutí o jeho přijetí náleží vývojáři.

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

== #confirmed[LLM, chatboti a agenti]

#blue-note[
  Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je *agentní inženýrství* (_agentic engineering_) a *architektura řídicího harnessu* pro autonomní vývoj softwaru. Následující text je proto záměrně zredukován na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů, degradace pozornosti a rozhraní nástrojů.
]

=== #confirmed[Úvod]

#confirmed[
V agentním softwarovém inženýrství vystupuje velký jazykový model (LLM) jako stochastické kognitivní jádro celého systému. Z hlediska vnitřní architektury se jedná o dekodérový transformer (_Decoder-only_), jehož typickými představiteli jsou moderní modely řad Claude, GPT či DeepSeek @vaswani2017. Role modelu nespočívá ve vystupování jako vševědoucí orákulum se spolehlivou znalostí okolního světa, nýbrž jako pokročilý generátor hypotéz, kódu a strukturovaných volání nástrojů řízený obdrženým kontextem.

Základní principy fungování modelu zahrnují:
- *Autoregresivní predikce*: Model zpracovává zadanou sekvenci textu a na jejím základě iterativně předpovídá nejpravděpodobnější následující symboly (tokeny).
- *Stochastická povaha*: Vzhledem k pravděpodobnostnímu vzorkování může model na totožný vstup reagovat mírně odlišně, což vyžaduje deterministické mantinely v nadřazeném řídicím harnessu.

Pro efektivní nasazení modelu do vývojového cyklu je nezbytné porozumět způsobu, jakým reprezentuje informace a jaké fyzické limity vymezují jeho operační paměť.
]

=== #confirmed[Tokeny, tokenizace a embedding]

#confirmed[
Jazykový model nepracuje přímo se znaky ani slovy v lidském slova smyslu. Vstupní text je nejprve deterministickým algoritmem převeden na číselné reprezentace, se kterými následně počítají maticové vrstvy neuronové sítě.

Tento proces zahrnuje následující pojmy:
]
- #confirmed[*Tokeny a tokenizér*: Token představuje základní diskrétní jednotku (celé slovo, slabiku či fragment znaků). Převod mezi textem a posloupností číselných tokenů zajišťuje tokenizér (nejčastěji na bázi algoritmu Byte-Pair Encoding, BPE).]
- #confirmed[#diff[*Embedding*: Každý token je promítnut do vícerozměrného vektorového prostoru, kde geometrická vzdálenost a úhel vektorů vyjadřují sémantickou příbuznost pojmů][#term("Embedding", explanation: "Vícerozměrná vektorová reprezentace textu a tokenů, v níž geometrická vzdálenost a úhel vektorů zachycují sémantickou příbuznost a významové vztahy."): Každý token je promítnut do vícerozměrného vektorového prostoru, kde geometrická vzdálenost a úhel vektorů vyjadřují sémantickou příbuznost pojmů] (např. vektorová analogie $"král" - "muž" + "žena" approx "královna"$).]
- #confirmed[*Jazyková asymetrie tokenizace*: Vzhledem k trénovacím datům optimalizovaným primárně pro angličtinu spotřebovávají flektivní jazyky s bohatou diakritikou (včetně češtiny) 2× až 3× více tokenů pro vyjádření téhož významu.]

#confirmed[
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
=== Degradace pozornosti (Context Rot)

Schopnost jazykového modelu pracovat s dlouhým kontextem nelze posuzovat pouze podle nominální velikosti okna. Ačkoliv moderní modely deklarují kapacitu statisíců tokenů, jejich schopnost efektivně vyhledávat a logicky propojovat fakta s rostoucí délkou kontextu výrazně klesá. #diff[Tento jev se označuje jako *degradace pozornosti* (_Context Rot_).][Tento jev se v agentním inženýrství označuje jako #term("Context Rot", explanation: "Degradace pozornosti a kvality logického uvažování modelu způsobená zaplněním kontextového okna dlouhou historií a šumem, vedoucí k přehlížení instrukcí a ztrátě souvislostí.") (degradace pozornosti).]

V praxi se projevuje dvěma hlavními mechanismy:
- *Lost in the Middle* @liu2024: Pozornostní vrstvy transformeru spolehlivě vnímají informace na samém začátku a konci okna, zatímco fakta umístěná uprostřed dlouhého textu jsou často přehlížena.
- *Multi-Needle Reasoning*: Schopnost logicky provázat několik na sobě závislých informací rozptýlených napříč různými soubory; s rostoucí délkou kontextu tato schopnost prudce klesá.

Při komplexním křížovém refaktoringu ve velkém kontextu proto model často přehlédne klíčové souvislosti, které by v menším a čistším okně zpracoval bez potíží.
]

#unconfirmed[
=== Promptové inženýrství a negativní instrukce

#diff[Základní chování agenta vymezuje *systémový prompt* @anthropic-prompt, který definuje jeho identitu, sadu dostupných nástrojů a provozní mantinely.][Disciplína #term("Prompt Engineering", explanation: "Inženýrská metodika systematického návrhu, strukturování a optimalizace instrukcí a systémových promptů pro řízení chování a mantinelů jazykového modelu.") představuje klíčový předpoklad deterministického chování: základní chování agenta vymezuje systémový prompt @anthropic-prompt, který definuje jeho identitu, sadu dostupných nástrojů a provozní mantinely.]
 Při formulaci těchto pravidel však vývojáři narážejí na specifickou vlastnost autoregresivních modelů — problematické zpracování zákazů a negativních instrukcí.

Příčiny a inženýrská řešení tohoto jevu:
- *Úskalí negativních instrukcí*: Zákazy formulované negací (např. „nemazat existující testy“) modely často porušují, protože matice pozornosti ($Q K^T$) asociativně aktivuje zakázaný pojem dříve, než autoregresní proces uplatní logický operátor negace.
- *Afirmativní formulace*: Pravidla je nutné formulovat pozitivně — namísto výčtu zákazů vymezit přesný postup a povolené mantinely chování.
- *Deterministická ochrana v harnessu*: Kde nestačí prompt, musí zasáhnout kód řídicího harnessu — například zpřístupněním testovacích souborů pouze pro čtení nebo zablokováním destruktivních operací na úrovni systémového volání.
]

== #confirmed[Harness a agentní inženýrství (prompt, kontext, smyčka, graf...)]

=== #confirmed[Úvod]

#confirmed[
#diff[V terminologii agentního inženýrství označuje pojem *harness* (řídicí postroj) aplikační vrstvu, která obklopuje samotné inferenční jádro jazykového modelu.][V terminologii agentního inženýrství označuje pojem #term("Harness", explanation: "Řídicí postroj — aplikační a orchestrační vrstva obklopující inferenční jádro modelu, která zajišťuje běhové prostředí nástrojů, dynamickou správu kontextového okna, bezpečnostní mantinely a deterministické řízení životního cyklu požadavku.") aplikační vrstvu, která obklopuje samotné inferenční jádro jazykového modelu.] Samotné inferenční jádro provádí výhradně matematické maticové operace nad zadanými váhami a vektory tokenů; veškerou orchestraci, práci se soubory a řízení bezpečnosti zajišťuje harness.

#diff[Ústřední komponentou a hlavní prováděcí funkcí, která v architektuře harnessu řídí samotný běh a iterativní koordinaci agenta v reálném vývojovém prostředí, je takzvaná *agentní smyčka* (_Agent Loop_).][Ústřední komponentou a hlavní prováděcí funkcí, která v architektuře harnessu řídí samotný běh a iterativní koordinaci agenta v reálném vývojovém prostředí, je takzvaná #term("Agent Loop", explanation: "Iterativní prováděcí cyklus autonomního agenta (založený na vzoru ReAct: Reasoning + Acting), v němž model střídavě uvažuje, volá nástroje a vyhodnocuje pozorování z běhového prostředí.") (agentní smyčka).]
]

=== #confirmed[Agent vs. Chatbot]

#confirmed[
#diff[Rozdíl mezi konverzačním chatbotem a autonomním agentem nespočívá v odlišném jazykovém modelu, ale v architektuře jeho zapojení do pracovního prostředí. Zatímco chatbot funguje pasivně jako textový rádce, agent vystupuje jako aktivní vykonavatel úkolů.][Rozdíl mezi konverzačním #term("Chatbot", explanation: "Systém založený na jazykovém modelu určený k pasivní textové interakci s uživatelem; odpovídá na jednotlivé dotazy v chatu, avšak nedisponuje nástroji pro samostatnou modifikaci okolního prostředí.")em a autonomním #term("Agent", explanation: "Softwarový systém řízený jazykovým modelem a vybavený nástroji, který samostatně plánuje, vnímá stav prostředí a provádí vícekrokové akce směřující k dosažení zadaného inženýrského cíle.")em nespočívá v odlišném jazykovém modelu, ale v architektuře jeho zapojení do pracovního prostředí. Zatímco chatbot funguje pasivně jako textový rádce, agent vystupuje jako aktivní vykonavatel úkolů.]

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
=== Agentní smyčka a prováděcí cyklus ReAct

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

#figure(
  image("../img/react-loop.svg", width: 100%),
  caption: [Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.],
) <fig-react-loop>
]

#unconfirmed[
=== Běhové prostředí nástrojů a pískoviště (Sandbox)

Aby mohl agent provádět reálné inženýrské operace, musí mu řídicí harness zpřístupnit systémové nástroje. Způsob, jakým jsou nástroje modelům předkládány, zásadně ovlivňuje ergonomii vývoje i bezpečnost celého systému.

V praxi se uplatňují dva základní modely:
- *Strukturované volání nástrojů (_Tool / Function Calling_)*: Vstupy a výstupy jsou striktně validovány vůči formálním JSON schématům. Zajišťuje vysokou typovou bezpečnost, avšak přináší režii tokenů spotřebovaných na definice schémat.
- *Přímé spouštění kódu (_Code Execution_)*: Agent generuje přímo skripty (bash, Python), které harness spouští v izolovaném terminálu. Poskytuje maximální flexibilitu pro softwarový vývoj, avšak vyžaduje nekompromisní bezpečnostní izolaci.
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

#unconfirmed[
=== Dovednosti (Skills)

#diff[Se vzrůstající komplexitou úloh nelze veškeré instrukce, skripty a doménové znalosti vkládat do základního systémového promptu. K modulárnímu rozšíření schopností agenta slouží koncept *dovedností* (_Skills_).][Se vzrůstající komplexitou úloh nelze veškeré instrukce, skripty a doménové znalosti vkládat do základního systémového promptu. K modulárnímu rozšíření schopností agenta slouží koncept *dovedností* (#term("Skills", explanation: "Znovupoužitelné modulární balíčky instrukcí (SKILL.md), procedurálních pravidel a pomocných skriptů, které harness dynamicky načítá do kontextu agenta podle povahy řešeného úkolu.")).]

Architektura dovedností staví na následujících principech:
- *Definiční soubor `SKILL.md`*: Dovednost tvoří adresář obsahující definiční soubor se strukturovanou hlavičkou (YAML frontmatter vymezující název a popis role) a detailním návodem k použití.
- *Dynamické načítání pro úsporu kontextu*: Do výchozího promptu se vloží pouze stručný přehled dostupných dovedností. Kompletní instrukce a skripty se do kontextu načtou až v okamžiku, kdy agent danou dovednost explicitně vyvolá.
- *Skripty a záchytné body (_Scripts & Hooks_)*: Dovednosti mohou obsahovat deterministické skripty pro rutinní transformace kódu a událostní háčky vyvolávané při stavových přechodech harnessu.

#diff[][Kromě kontextových dovedností využívají pokročilé řídicí architektury také programové #term("Plugins", explanation: "Zásuvné moduly běžící přímo v běhovém prostředí harnessu, které rozšiřují jeho exekuční jádro o specializované systémové adaptéry, ovladače nástrojů a deterministické záchytné body.") (zásuvné moduly). Zatímco _Skills_ fungují jako kontextové procedury a instrukce interpretované modelem, pluginy rozšiřují samotný harness na nativní systémové úrovni.]
]

#unconfirmed[
=== Model Context Protocol (MCP servery)

#diff[Pro sjednocení rozhraní mezi jazykovými modely a externími nástroji či datovými zdroji vznikl otevřený standard *Model Context Protocol (MCP)* @anthropic-mcp. Namísto vytváření proprietárních rozhraní pro každou službu definuje MCP univerzální protokol.][Pro sjednocení rozhraní mezi jazykovými modely a externími nástroji či datovými zdroji vznikl otevřený standard #term("MCP", explanation: "Model Context Protocol — otevřený standard navržený společností Anthropic pro standardizovanou komunikaci mezi jazykovými modely a externími nástroji či datovými zdroji přes protokol JSON-RPC.") @anthropic-mcp. Namísto vytváření proprietárních rozhraní pro každou službu definuje MCP univerzální protokol.]

Základní vlastnosti protokolu MCP:
- *Protokolové rozhraní*: Komunikace probíhá prostřednictvím standardu JSON-RPC (přes standardní vstup/výstup `stdio` nebo proud událostí `Server-Sent Events / SSE`).
- *Architektonické oddělení*: Implementace nástrojů běží jako samostatný proces mimo jádro harnessu. MCP servery fungují jako znovupoužitelné komponenty, které lze snadno sdílet napříč různými agenty a projekty.
]

#unconfirmed[
=== Škálování: hierarchičtí subagenti a DAG workflow

Monolitická agentní smyčka selhává při řešení komplexních, vícefázových úloh. Pro spolehlivé škálování se v moderních systémech uplatňuje hierarchická dělba práce a formalizace procesu do podoby grafu.

Klíčové přístupy ke škálování zahrnují:
- *Subagenti (_Subagents_)*: Hlavní orchestrátor dekomponuje rozsáhlou úlohu a deleguje dílčí kroky na specializované agenty (např. průzkumník repozitáře, plánovač, kódovací dělník). Po dokončení je kontext subagenta zahozen a orchestrátor obdrží pouze čistý výsledek, což chrání primární kontext před znečištěním (_context pollution_).
- *Pracovní postupy jako grafy (DAG / Graph Engineering)*: Životní cyklus požadavku je modelován jako orientovaný acyklický graf (příjem $arrow$ plán $arrow$ kód $arrow$ testy $arrow$ schválení). Hrany definují striktní závislosti (`needs`); selhání v libovolném uzlu okamžitě zastaví navazující kroky.
]

#unconfirmed[
=== Zapojení člověka do smyčky (Human-in-the-loop)

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
