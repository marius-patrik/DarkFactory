#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Teoretická část

== Deterministická vývojová infrastruktura

=== Úvod do deterministické infrastruktury

#unconfirmed[
- *Potřeba determinismu v agentním vývoji*: Jazykové modely generují stochastické výstupy s proměnlivou mírou spolehlivosti. Aby bylo možné začlenit autonomního agenta do produkčního repozitáře, musí být obklopen nekompromisní deterministickou infrastrukturou.
- *Repozitář jako stavový prostor*: Vývojový proces formalizujeme jako přechody mezi diskrétními stavy souborového systému.
- *Orientovaný acyklický graf (Git DAG)* @chacon2014:
  - *Uzly grafu*: Neměnné objekty revizí (_commits_) provázané kryptografickými hashy (SHA-1 či SHA-256) na své předchůdce.
  - *Hrany grafu*: Jednosměrné reference definující kauzální historii změn.
  - *Úplná lokální kopie*: Každý přispěvatel i agent disponuje celou historií projektu, což umožňuje nezávislé provádění i audit operací.
]

=== Větve a větvová izolace

#unconfirmed[
- *Větve jako pohyblivé ukazatele (_Refs_)*: Odlehčené ukazatele na konkrétní uzly v grafu revizí.
- *Izolace pracovní větve*: Agent operuje výhradně ve vyhrazené větvi (`feature/...` či `agent/...`) odbočené z hlavní linie (`main`).
  - *Ochrana produkčního kódu*: Pokusné mutace, dočasné mezistavy a syntaktické chyby modelu zůstávají striktně odděleny od stabilního kódu.
  - *Vyloučení interferencí*: Zamezení kolizím s rozpracovanou prací lidských vývojářů v repozitáři.
- *Deterministický audit trail*: Záznam každého kroku agenta jako atomického commitu se strojovými metadaty (identifikátor agenta, časový otisk, odkaz na issue).
]

=== Model pull requestu

#unconfirmed[
- *Model pull requestu (PR / Merge Request)*: Formalizovaný procesní uzel předkládající navržený diff kódu k posouzení před jeho integrací.
- *Komponenty rozhraní PR*:
  - Řádkový diff (přehledné zobrazení přidaných a odebraných řádků).
  - Výsledky automatických kontrol z integračního serveru.
  - Strukturovaný popis záměru a realizovaných změn vygenerovaný agentem.
- *Role v agentickém vývoji (Human Gate)*: Hlavní schvalovací brána, v níž člověk provádí finální sémantickou revizi podle principu _Human-in-the-loop_.
]

=== Strategie slučování (Squash and Merge)

#unconfirmed[
- *Slučovací strategie*: Topologický způsob začlenění pracovní větve do chráněné hlavní linie (`main`).
- *Rebase a Fast-Forward*: Přeskládání commitů do lineární historie; u agentních běhů však zanechává v historii množství drobných, neúspěšných pokusů.
- *Squash and Merge*: Sloučení celé sekvence dílčích mezikroků a ladicích pokusů modelu do jediného čistého uzlu.
  - *Eliminace šumu*: V hlavní větvi repozitáře zůstává pouze finální, ověřený přírůstek s kompletním souhrnem.
  - *Čistá historie*: Zjednodušení budoucího auditu a deterministického návratu změn (`git revert`).
]

#note[
  *Řešení divergencí dlouho běžících větví:*
  Doporučujeme doplnit princip deterministického rebase: pokud se hlavní větev (`main`) během autonomního běhu agenta posune, harness musí před spuštěním finální validační pipeline provést automatický rebase a ověřit, zda nedošlo k syntaktickým či logickým merge konfliktům.
]

=== Kontinuální integrace (CI)

#unconfirmed[
- *Kontinuální integrace (CI)* @humble2010: Praxe průběžného, automatického sestavování a testování každé navržené změny v izolovaném prostředí.
- *Deterministický arbitr správnosti*: V agentickém inženýrství plní CI nezastupitelnou roli neúprosného verifikátoru. Stochastický výstup LLM nepovažujeme za funkční kód, dokud neprojde exekutivním ověřením testy a kompilátorem.
- *Izolované běhové prostředí*: Každý testovací běh probíhá v čistém, předem definovaném kontejneru, což vylučuje závislost na lokálním stavu vývojářského počítače.
]

#critique[
  *Nestálost testů (Flaky Tests) jako systémová slepá skvrna:*
  Text prezentuje kontinuální integraci jako nekompromisního deterministického arbitra správnosti. V praxi však integrační a end-to-end testy běžně trpí stochastickou nestálostí (časování asynchronních operací, síťové prodlevy, race conditions). Pokud model narazí na náhodně selhávající test, ReAct smyčka začne horečně upravovat funkční kód ve snaze vyřešit neexistující defekt, čímž vnese do repozitáře skryté regrese. Pro spolehlivý provoz musí harness obsahovat mechanismy detekce nestálosti (automatický opakovaný běh v čistém prostředí, izolace stavu) a striktně rozlišovat selhání infrastruktury od regresí modelu.
]

=== Požadované kontroly (Required Checks)

#unconfirmed[
- *Požadované kontroly (_Required Checks_)*: Množina automatických úloh v CI pipeline, jejichž úspěšné dokončení je podmínkou pro povolení sloučení PR:
  - *Statická analýza a linting*: Kontrola formátování, typové správnosti a dodržování architektonických pravidel.
  - *Jednotkové testy (Unit Tests)*: Deterministické ověření izolovaných funkcí a tříd.
  - *Integrační a integrační testy*: Ověření vazeb mezi moduly a externími službami.
- *Pravidlo deterministického zakončení*: Každá kontrola musí skončit explicitním úspěchem či neúspěchem. Úloha, která se tiše přeskočí bez nahlášení výsledku, může chráněnou větev trvale zablokovat.
- *Reprodukovatelné artefakty*: Výstupy úspěšné pipeline (binární balíčky, knihovny, vysázená PDF dokumentace) vázané na neměnné značky (_tagy_) v historii gitu.
]

== Kognitivní jádro a správa kontextového okna

#blue-note[
  *Metodické vymezení a rozsah práce:*
  Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je *agentní inženýrství* (_agentic engineering_) a *architektura řídicího harnessu* pro autonomní vývoj softwaru. Následující text je proto záměrně zredukován na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů, degradace pozornosti a rozhraní nástrojů.
]

=== Úvod do velkých jazykových modelů

#unconfirmed[
- *Velké jazykové modely (LLM)* @vaswani2017: Architektura dekodérového transformeru (_Decoder-only_, např. řady Claude, GPT, LLaMA, DeepSeek).
- *Stochastický autoregresivní generátor*: Model na základě zadané textové historie (kontextu) opakovaně predikuje nejpravděpodobnější následující symboly.
- *Role v agentním inženýrství*: Model nevystupuje jako orákulum se znalostí reálného světa, nýbrž jako generátor hypotéz, kódu a strukturovaných volání nástrojů řízený promptem a kontextem.
]

=== Tokeny, tokenizace a embedding

#unconfirmed[
- *Tokeny*: Základní diskrétní celočíselné jednotky, se kterými neuronová síť počítá (podmnožiny slov, slabiky, znaky).
- *Tokenizér*: Deterministický algoritmus (např. Byte-Pair Encoding, BPE) převádějící vstupní text na posloupnost tokenů a naopak.
- *Embedding*: Projekce tokenů do vícerozměrného vektorového prostoru, v němž geometrická vzdálenost odpovídá sémantické příbuznosti pojmů.
- *Jazyková asymetrie tokenizace*: Text v češtině spotřebovává kvůli bohaté flexi a diakritice 2× až 3× více tokenů než ekvivalent v angličtině.
  - *Inženýrské doporučení*: Vnitřní systémové prompty, technické plány i logy harnessu vést v angličtině pro minimalizaci nákladů a latence.
]

=== Tahy a správa KV cache

#unconfirmed[
- *Tahy (_Turns_)*: Diskrétní kroky výměny informací v agentní smyčce:
  - *Tah uživatele / prostředí (_User/Environment Turn_)*: Zadání úkolu nebo vnější událost.
  - *Tah modelu (_Model Turn_)*: Odpověď modelu nebo emitování požadavku na nástroj.
  - *Tah vykonání nástroje (_Tool Execution Turn_)*: Výsledek operace vrácený harnessu.
- *KV cache (Key-Value Cache)*: Ukládání mezivýpočtů matic pozornosti klíčů a hodnot pro již zpracovanou historii tahů.
  - *Výpočetní úspora*: Inferenční engine při novém tahu nemusí přepočítávat celou historii od začátku.
- *Kontextové okno (_Context Window_)*: Pevně limitovaná kapacita paměti modelu. Omezeno kvadratickou složitostí mechanismu pozornosti ($O(N^2)$ vzhledem k délce sekvence $N$) a velikostí paměti GPU akcelerátorů.
]

=== Kompakce kontextu a ztrátová komprese

#unconfirmed[
- *Kompakce historie (_Compaction_)*: Vyzvání modelu k vytvoření syntetického souhrnu dosavadního průběhu sezení pro uvolnění kapacity kontextového okna.
- *Destruktivní ztrátová komprese*: Autoregresivní model při rekurzivním zkracování podléhá konfirmačnímu zkreslení (_confirmation bias_) a preferuje fakta odpovídající jeho vnitřním statistickým asociacím:
  - *Vymazání deterministických detailů*: Nevratný zánik čísel řádků, signatur privátních funkcí, přesných cest v souborech a doslovných chybových hlášení kompilátoru.
  - *Ztráta negativních omezení*: Zákazy (neměnit veřejné API, nepřidávat externí knihovny) bývají v souhrnu zevšeobecněny nebo zcela vypuštěny.
]

=== Sémantický posun (Semantic Drift)

#unconfirmed[
- *Mechanismus posunu*: Kaskádové kumulování drobných zkreslení a halucinací při vícenásobné rekurzivní kompresi ($S_(k+1) = f(S_k, Delta_k)$).
- *Efekt tiché pošty*: Drobné nepřesnosti z kola $k$ jsou v kole $k+1$ přijaty jako nezvratná historická fakta.
- *Důsledek pro repozitář*: Po několika cyklech komprese se vnitřní model reality agenta zcela rozejde se skutečným stavem zdrojového kódu v souborovém systému.
]

=== Alternativní paměťové architektury (RAG a stavový graf)

#unconfirmed[
- *Hierarchická epizodická paměť (RAG)*: Ukládání doslovné historie tahů a výpisů nástrojů do externí databáze; selektivní injekce pouze bezprostředně relevantních fragmentů do aktivního okna.
- *Persistentní graf stavu projektu (_Project State Graph_)*: Udržování explicitního strukturovaného stavu repozitáře (změněné soubory, otevřené úkoly, výsledky testů, invarianty) mimo kontextové okno.
- *Selektivní prořezávání KV cache*: Tenzorové uvolňování paměti s udržením klíčových kotev pozornosti (_attention sinks_) na úrovni inference (StreamingLLM @xiao2023, $H_2 O$ @zhang2023).
]

#note[
  *Doporučení schématu správy kontextu:*
  Doporučujeme zařadit srovnávací diagram znázorňující rozdíl mezi destruktivní rekurzivní textovou kompresí (Compaction) a tenzorovým prořezáváním KV cache (StreamingLLM / $H_2 O$) či externím grafem stavu projektu. Schéma pomůže vizualizovat zachování klíčových kotev pozornosti.
]

=== Degradace pozornosti (Context Rot)

#unconfirmed[
- *Context Rot*: Degradace schopnosti modelu rovnoměrně využívat informace v dlouhém kontextovém okně (jev _Lost in the Middle_ @liu2024).
- *Multi-Needle Reasoning*: Schopnost současně nalézt a logicky propojit několik na sobě závislých faktů napříč soubory; s rostoucí délkou kontextu prudce klesá.
- *Důsledek pro vývoj*: Ačkoliv model deklaruje podporu stovek tisíc tokenů, při komplexním křížovém refaktoringu ve velkém kontextu často přehlédne klíčové souvislosti.
]

=== Promptové inženýrství a negativní instrukce

#unconfirmed[
- *Systémový prompt*: Základní direktiva definující identitu agenta, dostupné nástroje a mantinely (formát commitů, zákaz destruktivních příkazů) @anthropic-prompt.
- *Few-shot a Chain-of-Thought (CoT)*: Vzorové ukázky řešení a vedení modelu k explicitní formulaci mezikroků uvažování před samotným zápisem kódu.
- *Úskalí negativních instrukcí*: Modely často porušují zákazy formulované negací (např. „nemazať existující testy“), protože matice pozornosti ($Q K^T$) asociativně aktivuje zakázané pojmy dříve, než autoregresní proces uplatní logický operátor negace.
  - *Inženýrské řešení*: Afirmativní formulace pravidel (pozitivní vymezení povolených mantinelů) kombinovaná s deterministickou ochranou v harnessu (připojení chráněných souborů pouze pro čtení, blokace v CI).
]

== Architektura řídicího harnessu a orchestrace

=== Úvod do řídicích harnessů

#unconfirmed[
- *Vymezení pojmu harness*: Řídicí a dozorčí program obklopující inferenční jádro. Samotné inferenční jádro provádí pouze maticové násobení vah sítě; veškerou orchestraci řídí harness.
- *Funkce harnessu*:
  - Inicializace a správa sezení.
  - Konstrukce a dynamická injekce promptu.
  - Zajištění bezpečného běhu a izolace nástrojů.
  - Řízení stavových přechodů a vynucování bezpečnostních pojistek.
]

=== Autonomní agent vs. konverzační chatbot

#unconfirmed[
- *Konverzační chatbot*:
  - Generuje pasivní textové odpovědi v uzavřeném rozhraní.
  - Nemá přímý přístup k souborovému systému ani k operačnímu systému.
  - Uživatel musí navržený kód manuálně zkopírovat, spustit a otestovat.
- *Autonomní agent*:
  - Vybaven sadou výkonných nástrojů (_tools_).
  - Aktivně čte repozitář, modifikuje soubory, spouští testy a interpretuje jejich výstupy.
  - Uzavřen v autonomní prováděcí smyčce, v níž iterativně reaguje na reálnou odezvu prostředí.
]

=== Prováděcí cyklus ReAct

#unconfirmed[
- *ReAct smyčka (_Reasoning + Acting_)* @yao2022: Čtyřfázový prováděcí cyklus znázorněný na @fig-react-loop:
  1. *Rozvaha (_Thought_)*: Analýza aktuálního stavu kontextu modelem a formulace nejbližšího záměru.
  2. *Volání nástroje (_Tool Call_)*: Emitování strukturovaného požadavku na provedení konkrétní akce.
  3. *Vykonání a pozorování (_Observation_)*: Bezpečný běh akce v harnessu a vložení výstupu do kontextu.
  4. *Navazující iterace*: Předložení aktualizovaného kontextu modelu v dalším tahu.
]

#figure(
  image("../img/react-loop.svg", width: 100%),
  caption: [Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.],
) <fig-react-loop>

=== Běhové prostředí nástrojů a pískoviště (Sandbox)

#unconfirmed[
- *Strukturované volání nástrojů (_Tool / Function Calling_)*: Validace vstupů a výstupů proti JSON schématům. Spolehlivé pro atomické operace, ale nese tokenovou režii schémat.
- *Přímé spouštění kódu (_Code Execution_)*: Spouštění generovaných skriptů v sandboxu. Maximální flexibilita, avšak vyžaduje striktní bezpečnostní izolaci.
]

#critique[
  *Iluzorní bezpečnost pískoviště*: Přímé spouštění netestovaného syntetického kódu v běžném Docker kontejneru nelze považovat za plnohodnotnou bezpečnostní hranici (_security boundary_). Přístup k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky environmentálních tajností (GitHub tokeny, API klíče k LLM) přes skryté síťové kanály a kompromitaci CI infrastruktury. Pro bezpečný produkční provoz je nezbytná formální izolace na bázi microVM (např. AWS Firecracker, gVisor) a striktní izolace síťových jmenných prostorů.
]

=== Patologie divergence: perseverace a oscilace

#unconfirmed[
- *Perseverace a zacyklení*: Opakované emitování identického volání nástroje se stejnými argumenty (např. čtení neexistujícího souboru) i po obdržení chybové zprávy. V kontextu vzniká pravděpodobnostní atraktor, který nutí model k opakování chybného vzorce.
- *Oscilace a těkání (_Thrashing_)*: Střídavé přepínání mezi dvěma protichůdnými zásahy (úprava modulu A rozbije modul B a následná oprava B rozbije A).
- *Nekontrolovaná spotřeba zdrojů (_Context Runaway_)*: Rychlé vyčerpání kontextového okna i rozpočtu na volání API.
]

=== Deterministické pojistky a Circuit Breaker

#unconfirmed[
- *Rozpočet tahů a nákladů (_Step & Cost Budget_)*: Pevný limit maximálního počtu tahů $T_"max"$ (typicky 25–50 kroků) a finanční strop pro tokeny; při překročení dochází k okamžitému zastavení inference.
- *Algoritmická detekce uvíznutí (_Stuck Detection_)*: Výpočet kanonického hashe volání nástroje v čase $t$:
  $ h_t = "hash"("nástroj", "canonicalize"("argumenty")) $
  Harness v klouzavém okně posledních $k$ tahů detekuje shodu $h_t = h_(t-1) = dots = h_(t-k+1)$ nebo cyklické periody.
- *Dvoustupňová intervence*:
  - *1. stupeň*: Injekce syntetického varování rozbíjejícího pravděpodobnostní atraktor v matici pozornosti.
  - *2. stupeň (Circuit Breaker)*: Tvrdé přerušení cyklu, automatický návrat změn v gitu na poslední stabilní commit (`git checkout`) a eskalace člověku.
]

=== Dovednosti (Skills)

#unconfirmed[
- *Koncept dovedností (_Skills_)*: Adresáře instrukcí a referencí se souborem `SKILL.md` (YAML frontmatter).
- *Efektivita kontextu*: Do výchozího systémového promptu se načítají pouze stručná metadata (název a popis role); detailní návod a skripty se načítají dynamicky až při explicitním vyvolání nástroje.
- *Skripty a záchytné body (_Scripts & Hooks_)*: Deterministické skripty pro rutinní transformace kódu a událostní háčky vyvolávané při stavových přechodech harnessu.
]

=== Model Context Protocol (MCP servery)

#unconfirmed[
- *Model Context Protocol (MCP)* @anthropic-mcp: Otevřený standard propojující jazykové modely s externími nástroji a datovými zdroji.
- *Protokolové rozhraní*: Komunikace probíhá přes protokol JSON-RPC (prostřednictvím `stdio` nebo `Server-Sent Events / SSE`).
- *Architektonické oddělení*: Striktní oddělení běhového prostředí agenta od implementace nástrojů. MCP servery fungují jako samostatné, znovupoužitelné komponenty běžící mimo jádro harnessu.
]

=== Meta Harness a jeho bezpečnostní hranice

#unconfirmed[
- *Koncept Meta Harness* @metaharness2026: Samořízená evoluce a adaptace harnessu samotným agentem (úprava vlastních pravidel, konfigurací a promptů).
- *Využití*: Vhodné pro osobní agenty maximalizující autonomii při řešení unikátních problémů.
- *Rizika*: V podnikovém nasazení vyžaduje striktní deterministické ohraničení vylučující svévolnou modifikaci systémových pravidel.
]

#critique[
  *Nekontrolovaná mutace v konceptu Meta Harness:*
  Povolení samořízené evoluce harnessu samotným agentem (modifikace vlastních instrukcí, pravidel a nástrojů) představuje obrovské bezpečnostní a stabilitní riziko. Pokud agent v iteraci $k$ v důsledku mírné halucinace uvolní bezpečnostní pravidlo nebo oslabí validační podmínku, v iteraci $k+1$ ji přijme jako normu (uncontained meta-harness mutation). Pro produkční enterprise prostředí je nezbytné, aby řídicí harness obsahoval kryptograficky podepsané, neměnné jádro pravidel (Immutable Policy Core), které agent nesmí za žádných okolností modifikovat.
]

=== Škálování: hierarchičtí subagenti a DAG workflow

#unconfirmed[
- *Subagenti (_Subagents_)*: Hierarchická dekompozice úlohy orchestrátorem na specializované agenty (průzkumník repozitáře, plánovač, kódovací dělník). Kontext subagenta je po dokončení zahozen a orchestrátoru je předán pouze čistý výsledek, což chrání primární kontext před znečištěním (_context pollution_).
- *Pracovní postupy jako grafy (DAG / Graph Engineering)*: Formalizace fází životního cyklu jako orientovaného acyklického grafu (detekce $arrow$ plán $arrow$ kód $arrow$ testy $arrow$ schválení). Hrany definují striktní závislosti (`needs`); selhání v libovolném uzlu okamžitě zastaví navazující kroky.
]

=== Zapojení člověka do smyčky (Human-in-the-loop)

#unconfirmed[
- *Princip Human-in-the-loop*: Cílem není nekritická plná autonomie, nýbrž automatizace rutinních a mechanických kroků v kombinaci s lidským rozhodováním tam, kde je změna nevratná nebo kde chybí jednoznačné algoritmické měřítko správnosti.
- *Lidské schvalovací brány (_Human Gates_)*: Formální procesní uzly, v nichž se automatický běh pozastaví a vyčká na autorizaci operátora.
  - *Dvoufázové schvalování*:
    - *1. brána (Záměr a plán)*: Člověk autorizuje technický plán a rozpad požadavku dříve, než agent začne modifikovat kód.
    - *2. brána (Sémantická revize)*: Člověk provádí finální kontrolu diffu v pull requestu před jeho začleněním do hlavní větve.
  - *Prevence únavy z revizí (_Review Fatigue_)*: Vyvážená frekvence kontrol — zamezení mikromanagementu na úrovni jednotlivých souborů při zachování kontroly nad celkovým architektonickým směrem.
- *Dohledatelnost původního zadání*: Trvalé uchovávání doslovného znění požadavku (GitHub Issue) bez ztrátových parafrází modelem, což brání vymizení okrajových podmínek v průběhu vývoje.
- *Transparentnost selhání a deterministická eskalace*: Zákaz tichého pohlcování chyb či halucinovaných omluv při selhání. Při vyčerpání rozpočtu tahů nebo selhání testů harness vygeneruje strukturovaný diagnostický incident (diff, chybové hlášení, stav kontextu) a předá jej vývojáři k manuálnímu zásahu.
]

#critique[
  *Kognitivní limity lidské schvalovací brány (Review Fatigue):*
  Spoléhání se na finální sémantickou kontrolu diffu v pull requestu naráží na lidské kognitivní limity. Výzkumy prokazují, že u rozsáhlých diffů (nad 300–400 řádků) dramaticky klesá hloubka lidské pozornosti — vývojář kód pouze zběžně prohlédne a spoléhá na zelenou fajfku z CI. Aby byla lidská brána efektivní, harness musí diffy rozkládat do sémanticky sevřených mikrokroků, generovat interaktivní vysvětlení netriviálních rozhodnutí a explicitně zvýrazňovat změny v kritických architektonických komponentách.
]
