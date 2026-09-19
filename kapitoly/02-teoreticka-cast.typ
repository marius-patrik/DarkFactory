#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Teoretická část

== Deterministická vývojová infrastruktura

=== Topologie repozitáře a větvová izolace

#unconfirmed[
- *Distribuovaná správa verzí (Git DAG)* @chacon2014: Repozitář je formálně orientovaný acyklický graf (_Directed Acyclic Graph_).
  - *Uzly grafu*: Neměnné objekty revizí (_commits_) provázané kryptografickými hashy (SHA-1 či SHA-256) na své předchůdce.
  - *Větve grafu*: Pohyblivé ukazatele (_refs_) na konkrétní uzly v historii. Každý přispěvatel i agent disponuje úplnou lokální kopií historie.
- *Izolace stavu ve větvích*: Agent operuje výhradně ve vyhrazené pracovní větvi (`feature/...` či `agent/...`) odbočené z hlavní linie (`main`). Zabraňuje poškození produkčního kódu a kolizím s lidskými vývojáři během experimentování a ladění.
- *Deterministický audit trail*: Záznam každého kroku agenta jako atomického commitu se strojovými metadaty, časovým otiskem a referencí na zadání. Zaručuje úplnou reprodukovatelnost změn.
]

=== Integrační model pull requestu a strategie slučování

#unconfirmed[
- *Model pull requestu (PR / Human Gate)*: Formalizovaný uzel pro předložení navrženého diffu kódu k revizi. V agentickém vývoji slouží jako hlavní lidská schvalovací brána (_Human Gate_) zobrazující diff, výsledky automatických testů a strukturovaný souhrn změn.
- *Strategie slučování (Squash and Merge)*: Sloučení celé sekvence pokusných commitů pracovní větve do jediného čistého uzlu. Odstraňuje šum a slepé uličky modelu z hlavní linie projektu.
]

#note[
  *Řešení divergencí dlouho běžících větví:*
  Doporučujeme doplnit princip deterministického rebase: pokud se hlavní větev (`main`) během autonomního běhu agenta posune, harness musí před spuštěním finální validační pipeline provést automatický rebase a ověřit, zda nedošlo k syntaktickým či logickým merge konfliktům.
]

=== Kontinuální integrace a požadované kontroly

#unconfirmed[
- *Kontinuální integrace (CI)* @humble2010: Automatické sestavení a otestování každé změny v izolovaném prostředí. Plní roli deterministického arbitra správnosti ověřujícího stochastické výstupy jazykového modelu.
- *Požadované kontroly (_Required Checks_)*: Množina automatických úloh (linting, statická typová kontrola, jednotkové a integrační testy), které musí projít úspěšně před povolením sloučení.
  - *Pravidlo deterministického zakončení*: Každá kontrola musí skončit explicitním úspěchem či neúspěchem. Úloha, která se tiše přeskočí bez nahlášení výsledku, může chráněnou větev trvale zablokovat.
- *Reprodukovatelné artefakty*: Výstupy úspěšného průchodu integrační pipeline (spustitelné binární balíčky, knihovny, vysázená PDF dokumentace) svázané s konkrétní verzovací značkou (_tagem_) v historii gitu.
]

#critique[
  *Nestálost testů (Flaky Tests) jako systémová slepá skvrna:*
  Text prezentuje kontinuální integraci jako nekompromisního deterministického arbitra správnosti. V praxi však integrační a end-to-end testy běžně trpí stochastickou nestálostí (časování asynchronních operací, síťové prodlevy, race conditions). Pokud model narazí na náhodně selhávající test, ReAct smyčka začne horečně upravovat funkční kód ve snaze vyřešit neexistující defekt, čímž vnese do repozitáře skryté regrese. Pro spolehlivý provoz musí harness obsahovat mechanismy detekce nestálosti (automatický opakovaný běh v čistém prostředí, izolace stavu) a striktně rozlišovat selhání infrastruktury od regresí modelu.
]

== Kognitivní jádro a správa kontextového okna

#blue-note[
  *Metodické vymezení a rozsah práce:*
  Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je *agentní inženýrství* (_agentic engineering_) a *architektura řídicího harnessu* pro autonomní vývoj softwaru. Následující text je proto záměrně zredukován na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů, degradace pozornosti a rozhraní nástrojů.
]

=== Autoregresivní modely a dynamika tokenů

#unconfirmed[
- *Velké jazykové modely (LLM)* @vaswani2017: Dekodérové transformery (_Decoder-only_, např. řady Claude, GPT, LLaMA, DeepSeek). Vystupují jako stochastické autoregresivní generátory: na základě textové historie opakovaně predikují nejpravděpodobnější následující symboly (kód, text, volání nástroje).
- *Tokeny a tokenizace*: Diskrétní celočíselné jednotky textu zpracovávané deterministickým tokenizérem (např. algoritmem BPE).
- *Embedding*: Převod identifikátorů tokenů do vícerozměrného vektorového prostoru vyjadřujícího sémantickou příbuznost pojmů.
- *Tahy (_Turns_)*: Diskrétní kroky výměny informací v agentní smyčce:
  - *Tah uživatele / prostředí (_User/Environment Turn_)*: Zadání úkolu nebo vnější událost.
  - *Tah modelu (_Model Turn_)*: Odpověď modelu nebo emitování požadavku na nástroj.
  - *Tah vykonání nástroje (_Tool Execution Turn_)*: Výsledek operace vrácený harnessu.
  - *KV cache*: Ukládání mezivýpočtů pozornosti klíčů a hodnot pro neměnnou historii tahů; šetří výpočetní čas inference.
- *Kontextové okno (_Context Window_)*: Pevně limitovaná kapacita paměti modelu. Omezeno kvadratickou složitostí mechanismu pozornosti ($O(N^2)$ vzhledem k délce sekvence $N$) a velikostí paměti grafických akcelerátorů.
- *Jazyková asymetrie tokenizace*: Text v češtině spotřebovává kvůli bohaté flexi a diakritice 2× až 3× více tokenů než angličtina. Doporučení: systémové prompty, technické plány i interní logy harnessu vést v angličtině.
]

=== Destruktivní ztrátová komprese a sémantický posun

#unconfirmed[
- *Kompakce historie (_Compaction_)*: Vyzvání modelu k vytvoření syntetického souhrnu dosavadního průběhu sezení pro uvolnění kapacity kontextového okna.
- *Patologie destruktivní ztrátové komprese*:
  - *Vymazání deterministických detailů*: Nevratný zánik čísel řádků, signatur privátních funkcí, přesných cest v souborech a doslovných chybových hlášení kompilátoru.
  - *Ztráta negativních omezení*: Zákazy (neměnit veřejné API, nepřidávat externí knihovny) bývají v souhrnu zevšeobecněny nebo zcela vypuštěny.
  - *Sémantický posun (_Semantic Drift_)*: Kaskádová kumulace drobných zkreslení a halucinací při rekurzivním shrnování ($S_(k+1) = f(S_k, Delta_k)$), vedoucí k rozchodu modelu se skutečným stavem repozitáře.
]

=== Alternativní architektury dlouhodobé paměti

#unconfirmed[
- *Hierarchická epizodická paměť (RAG)*: Ukládání doslovné historie tahů do externí databáze a selektivní injekce pouze bezprostředně relevantních fragmentů.
- *Persistentní graf stavu projektu (_Project State Graph_)*: Udržování explicitního strukturovaného stavu repozitáře (změněné soubory, otevřené úkoly, výsledky testů, invarianty) mimo kontextové okno.
- *Selektivní prořezávání KV cache*: Tenzorové uvolňování paměti s udržením klíčových kotev pozornosti (_attention sinks_) na úrovni inference (StreamingLLM @xiao2023, $H_2 O$ @zhang2023).
]

#note[
  *Doporučení schématu správy kontextu:*
  Doporučujeme zařadit srovnávací diagram znázorňující rozdíl mezi destruktivní rekurzivní textovou kompresí (Compaction) a tenzorovým prořezáváním KV cache (StreamingLLM / $H_2 O$) či externím grafem stavu projektu. Schéma pomůže vizualizovat zachování klíčových kotev pozornosti.
]

=== Degradace pozornosti a promptové inženýrství

#unconfirmed[
- *Context Rot*: Degradace schopnosti modelu rovnoměrně využívat informace v dlouhém kontextovém okně (jev _Lost in the Middle_ @liu2024).
- *Multi-Needle Reasoning*: Schopnost současně nalézt a logicky propojit několik na sobě závislých faktů napříč soubory; s rostoucí délkou kontextu prudce klesá.
- *Systémový prompt*: Základní direktiva definující identitu agenta, dostupné nástroje a mantinely (formát commitů, zákaz destruktivních příkazů) @anthropic-prompt.
- *Few-shot a Chain-of-Thought*: Vzorové ukázky řešení a vedení modelu k explicitní formulaci mezikroků uvažování před samotným zápisem kódu.
- *Úskalí negativních instrukcí*: Modely často porušují zákazy formulované negací (např. „nemazať existující testy“), protože matice pozornosti ($Q K^T$) asociativně aktivuje zakázané pojmy dříve, než autoregresní proces uplatní logický operátor negace.
  - *Inženýrské řešení*: Afirmativní formulace pravidel (pozitivní vymezení povolených mantinelů) kombinovaná s deterministickou ochranou v harnessu (připojení chráněných souborů pouze pro čtení, blokace v CI).
]

== Architektura řídicího harnessu a orchestrace

=== Nástrojové smyčky a prováděcí cyklus ReAct

#unconfirmed[
- *Řídicí harness*: Dozorčí a orchestrační program obklopující inferenční jádro. Spravuje stav sezení, sestavuje systémový prompt, zajišťuje bezpečné provádění nástrojů a řídí iterativní smyčku uvažování.
- *ReAct smyčka (_Reasoning + Acting_)* @yao2022: Čtyřfázový prováděcí cyklus znázorněný na @fig-react-loop:
  1. *Rozvaha (_Thought_)*: Analýza aktuálního stavu kontextu modelem a formulace nejbližšího záměru.
  2. *Volání nástroje (_Tool Call_)*: Emitování strukturovaného požadavku na provedení konkrétní akce.
  3. *Vykonání a pozorování (_Observation_)*: Bezpečný běh akce v harnessu a vložení výstupu do kontextu.
  4. *Navazující iterace*: Předložení aktualizovaného kontextu modelu v dalším tahu.
- *Způsoby interakce s výkonným prostředím*:
  - *Strukturované volání nástrojů (_Tool / Function Calling_)*: Validace vstupů a výstupů proti JSON schématům. Spolehlivé pro atomické operace, ale nese tokenovou režii schémat.
  - *Přímé spouštění kódu (_Code Execution_)*: Spouštění generovaných skriptů v sandboxu. Maximální flexibilita, avšak vyžaduje striktní bezpečnostní izolaci.
]

#figure(
  image("../img/react-loop.svg", width: 100%),
  caption: [Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.],
) <fig-react-loop>

#critique[
  *Iluzorní bezpečnost pískoviště*: Přímé spouštění netestovaného syntetického kódu v běžném Docker kontejneru nelze považovat za plnohodnotnou bezpečnostní hranici (_security boundary_). Přístup k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky environmentálních tajností (GitHub tokeny, API klíče k LLM) přes skryté síťové kanály a kompromitaci CI infrastruktury. Pro bezpečný produkční provoz je nezbytná formální izolace na bázi microVM (např. AWS Firecracker, gVisor) a striktní izolace síťových jmenných prostorů.
]

=== Řízení divergence a deterministické bezpečnostní pojistky

#unconfirmed[
*Patologie divergence ReAct smyčky:*
- *Perseverace a zacyklení*: Opakované emitování identického volání nástroje se stejnými argumenty (např. čtení neexistujícího souboru) i po obdržení chybové zprávy. V kontextu vzniká pravděpodobnostní atraktor, který nutí model k opakování chybného vzorce.
- *Oscilace a těkání (_Thrashing_)*: Střídavé přepínání mezi dvěma protichůdnými zásahy (úprava modulu A rozbije modul B a následná oprava B rozbije A).
- *Nekontrolovaná spotřeba zdrojů (_Context Runaway_)*: Rychlé vyčerpání kontextového okna i rozpočtu na volání API.

*Deterministické bezpečnostní pojistky harnessu:*
- *Rozpočet tahů a nákladů (_Step & Cost Budget_)*: Pevný limit maximálního počtu tahů $T_"max"$ (typicky 25–50 kroků) a finanční strop pro tokeny; při překročení dochází k okamžitému zastavení inference.
- *Algoritmická detekce uvíznutí (_Stuck Detection_)*: Výpočet kanonického hashe volání nástroje v čase $t$:
  $ h_t = "hash"("nástroj", "canonicalize"("argumenty")) $
  Harness v klouzavém okně posledních $k$ tahů detekuje shodu $h_t = h_(t-1) = dots = h_(t-k+1)$ nebo cyklické periody.
- *Dvoustupňová intervence*:
  - *1. stupeň*: Injekce syntetického varování rozbíjejícího pravděpodobnostní atraktor v matici pozornosti.
  - *2. stupeň (Circuit Breaker)*: Tvrdé přerušení cyklu, automatický návrat změn v gitu na poslední stabilní commit (`git checkout`) a eskalace člověku.
]

=== Modularita a rozhraní rozšiřitelnosti

#unconfirmed[
- *Dovednosti (_Skills_)*: Adresáře instrukcí a referencí se souborem `SKILL.md` (YAML frontmatter). Do výchozího kontextu se načítají pouze stručná metadata; detailní návod se načítá až při vyvolání nástroje.
- *Skripty a záchytné body (_Scripts & Hooks_)*: Deterministické skripty pro rutinní transformace kódu a událostní háčky vyvolávané při stavových přechodech harnessu.
- *Model Context Protocol (MCP)* @anthropic-mcp: Otevřený standard JSON-RPC (přes `stdio` nebo `SSE`) pro sjednocenou integraci externích nástrojů a oddělení běhového prostředí agenta od implementace nástrojů.
- *Meta Harness* @metaharness2026: Samořízená evoluce a adaptace harnessu samotným agentem. Vhodné pro osobní agenty; pro podnikový vývoj vyžaduje pevně uzamčené bezpečnostní hranice.
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
