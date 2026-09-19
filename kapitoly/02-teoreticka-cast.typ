#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Teoretická část

== Správa verzí (Git a GitHub)

=== Úvod do správy verzí a GitHubu

#unconfirmed[
- *Proč správa verzí*: Jazykové modely generují kód na základě pravděpodobnosti a dělají chyby. Správa verzí poskytuje bezpečné prostředí, kde lze každou změnu sledovat, testovat a v případě chyby kdykoliv vrátit k funkčnímu stavu.
- *Nástroj Git* @chacon2014: Standardní distribuovaný verzovací nástroj. Kód se ukládá do historie v podobě jednotlivých revizí (_commitů_). Agent i vývojář pracují lokálně s plnou kopií repozitáře a mohou provádět úpravy, větvení i testování nezávisle na síti.
- *Platforma GitHub*: Webová služba postavená nad Gitem, která slouží jako centrální bod pro sdílení kódu a automatizaci:
  - *Zadávání a sledování úkolů (Issues)*: Textové zadání požadavků, hlášení chyb a diskuse, ze kterých agent čerpá zadání.
  - *Přehled a kontrola změn (Pull Requests)*: Rozhraní pro revizi diffu a schvalování kódu před jeho začleněním.
  - *Automatizace (GitHub Actions)*: Běhové prostředí pro automatické spouštění testů, linterů a překladů.
- *Praktická role v práci*: Namísto teoretických abstrakcí práce přímo využívá Git a ekosystém GitHubu jako reálný základ pro řízení autonomního vývoje.
]

=== Větve (Branches) a izolace kódu

#unconfirmed[
- *Větve (Branches)*: Samostatné vývojové linky v Gitu odbočené ze základního kódu. Umožňují pracovat na novém úkolu odděleně od ostatních.
- *Hlavní větev (`main`)*: Reprezentuje stabilní, otestovaný stav projektu připravený k nasazení. Do této větve nikdo (ani člověk, ani agent) nezapisuje přímo.
- *Pracovní větev agenta*: Agent si pro každý úkol vytvoří novou samostatnou větev (např. `task/...` nebo `agent/...`):
  - *Oddělení chyb a pokusů*: Pokusy, mezistavy ani nefunkční kód neovlivňují stabilitu hlavní větve ani práci ostatních vývojářů.
  - *Bezpečné zahození*: Pokud se agent vydá špatným směrem nebo selže, celou větev lze smazat jedním příkazem bez následků pro projekt.
- *Aktualizace větve*: Pokud se hlavní větev během práce posune dopředu, pracovní větev agenta se zaktualizuje (`rebase` nebo `merge`), aby se předešlo konfliktům při slučování.
]

=== Model pull requestu (PR)

#unconfirmed[
- *Pull Request (PR)*: Standardní způsob, jak na GitHubu navrhnout změny z pracovní větve k začlenění do větve hlavní (`main`).
- *Komponenty rozhraní PR*:
  - *Rozdíl kódu (_Diff_)*: Přehledné řádkové srovnání — zeleně přidané řádky, červeně odebrané řádky.
  - *Popis změn*: Agent v popisu PR srozumitelně shrne, jaké změny provedl, proč je zvolil a na jaké issue reagoval.
  - *Výsledky kontrol*: Přehled stavu automatických testů z GitHub Actions (zelená / červená).
  - *Diskusní vlákno*: Prostor pro komentáře, připomínky a požadavky na úpravy ze strany vývojáře.
- *Schvalovací brána člověka (Human Gate)*: PR slouží jako hlavní kontrolní bod podle principu _Human-in-the-loop_. Člověk zkontroluje navržený kód a rozhodne o jeho schválení či zamítnutí.
]

=== Slučování změn (Squash and Merge)

#unconfirmed[
- *Způsoby sloučení na GitHubu*:
  - *Klasický merge commit*: Přenese všechny jednotlivé commity z větve a vytvoří slučovací uzel.
  - *Rebase and Merge*: Přeskládá commity z větve lineárně za sebou.
  - *Squash and Merge*: Vezme všechny commity z pracovní větve, spojí je do jediného nového commitu a ten vloží do `main`.
- *Význam Squash and Merge pro agenty*:
  - *Skrytí interního šumu*: Agent při řešení úlohy často vytvoří desítky drobných commitů (opravy překlepů, dílčí pokusy po selhání testu). Tyto mezikroky nemají pro historii projektu trvalou hodnotu.
  - *Čistá a přehledná historie*: V hlavní větvi repozitáře zůstane za každý vyřešený úkol právě jeden ucelený commit s popisem.
  - *Jednoduchý návrat změn (`git revert`)*: Pokud by změna v budoucnu způsobila problém, lze celý úkol vrátit jediným příkazem bez nutnosti rozplétat dílčí mezikroky.
]

=== Kontinuální integrace (CI a GitHub Actions)

#unconfirmed[
- *Kontinuální integrace (CI)* @humble2010: Automatizované sestavování a testování kódu při každé změně (pushnutí do větve nebo otevření pull requestu).
- *GitHub Actions*: Nástroj přímo integrovaný v GitHubu, který spouští definované pracovní postupy (_workflows_) v izolovaných virtuálních prostředích (např. kontejnerech).
- *Ověření funkčnosti kódu*: Samotný jazykový model kód pouze generuje na základě pravděpodobnosti; neví, zda je kód funkční. Skutečné ověření probíhá až v CI spuštěním překladače a testů.
- *Zpětná vazba pro agenta*: Pokud krok v CI selže, chybový protokol slouží agentovi jako přesný vstup pro další iteraci opravy.
- *Nezávislost na lokálním prostředí*: CI běží na čistém systému se stanovenými verzemi závislostí, což vylučuje chyby způsobené odlišnostmi v lokálním nastavení vývojáře.
]

#critique[
  *Nestálost testů (Flaky Tests) v integračních bězích:*
  Spoléhání se na automatické testy v CI naráží na problém nestálých testů (_flaky tests_), které občas selžou kvůli časování, síťové odezvě či asynchronním stavům, aniž by kód obsahoval chybu. Pokud agent narazí na takto náhodně selhávající test, může začít nesmyslně upravovat správný kód ve snaze chybu odstranit. CI pipeline proto musí nestálé testy minimalizovat nebo umožnit automatické opakování selhaného běhu v čistém prostředí.
]

=== Požadované kontroly (Required Checks) a ochrana větví

#unconfirmed[
- *Pravidla ochrany větví (_Branch Protection Rules_)*: Bezpečnostní nastavení GitHubu chránící větev `main` před nechtěným poškozením:
  - Zákaz přímého pushování do hlavní větve.
  - Zákaz mazání hlavní větve a přepisování její historie (`force push`).
- *Požadované kontroly (_Required Checks_)*: Seznam úloh v GitHub Actions, které musí projít úspěšně (zelený stav), aby bylo technicky možné PR sloučit:
  - *Linter a formátování*: Kontrola dodržení kódového stylu a základních syntaktických pravidel.
  - *Typová kontrola a build*: Ověření, že kód lze bez chyb zkompilovat a typy odpovídají.
  - *Automatické testy*: Běh jednotkových a integračních testů s definovaným očekávaným chováním.
- *Pravidlo deterministického výsledku*: Každá kontrola musí skončit jednoznačným stavem (úspěch / selhání). Tiché přeskočení testu nesmí být považováno za splněnou podmínku.
- *Povinné schválení člověkem*: Požadavek na explicitní schválení kódu lidským vývojářem před sloučením do produkční větve.
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
