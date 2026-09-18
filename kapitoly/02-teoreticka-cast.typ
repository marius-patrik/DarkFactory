#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Teoretická část

== Řízení verzí a kontinuální integrace

#unconfirmed[
Základním stavebním kamenem deterministické infrastruktury pro autonomní vývoj softwaru je systém správy verzí (VCS) úzce provázaný s mechanismy kontinuální integrace. Distribuovaný model správy verzí, jehož nejrozšířenějším zástupcem je Git @chacon2014, formálně reprezentuje repozitář jako orientovaný acyklický graf (_Directed Acyclic Graph_, DAG). V tomto grafu tvoří uzly neměnné objekty revizí (_commits_) provázané kryptografickými hashy (SHA-1 či SHA-256) na své předchůdce, zatímco větve představují odlehčené, pohyblivé ukazatele (_refs_) na konkrétní uzly grafu. Každý přispěvatel má k dispozici úplnou lokální kopii historie, což umožňuje provádět i zkoumat změny nezávisle a slučovat je až ve chvíli jejich ověření.

Tato architektura poskytuje klíčové operační mechanismy pro zapojení autonomních agentů:
- *Izolace stavu ve větvích*: Agent operuje ve vyhrazené pracovní větvi (např. `feature/...` nebo `agent/...`) odbočující z hlavní linie (`main`). Veškeré pokusné mutace souborového systému, mezistavy a ladicí iterace zůstávají striktně izolované, aniž by ohrozily stabilitu produkčního kódu nebo práci lidských spolupracovníků.
- *Deterministický audit*: Každý krok agenta lze zachytit jako atomický commit s přesným časovým otiskem, autorskými metadaty a odkazem na kontextové zadání, což vytváří neměnnou a zpětně reprodukovatelnou historii změn.
- *Strategie slučování*: Při integraci pracovní větve se uplatňují různé topologické strategie (přímý posun ukazatele či explicitní slučovací uzel). V agentických pipeline je preferováno sloučení celé sekvence dílčích mezikroků do jediného čistého uzlu (_squash and merge_), které eliminuje šum v podobě neúspěšných pokusů modelu a v hlavní větvi zanechává pouze finální, ověřený přírůstek.
- *Model pull requestu*: Sloučení větve do chráněné hlavní linie se v moderním inženýrství odehrává prostřednictvím modelu *pull requestu* (PR, na platformě GitLab též _Merge Request_). Jde o formalizovaný procesní uzel předkládající navržený diff kódu k revizi. V agentickém vývoji plní PR nezastupitelnou roli lidské schvalovací brány (_Human Gate_): poskytuje přehledné rozhraní zobrazující řádkový diff, výsledky automatických testů a strukturovaný popis úprav, v němž člověk provádí finální sémantickou kontrolu dle principu _Human-in-the-loop_.
- *Kontinuální integrace*: Na otevření či aktualizaci pull requestu bezprostředně reaguje integrační server. Kontinuální integrace (angl. _continuous integration_) představuje praxi, při níž se každá změna v malých dávkách automaticky sestaví a otestuje v izolovaném prostředí @humble2010, takže odchylky jsou zachyceny bezprostředně u svého vzniku. Vzhledem ke stochastické povaze jazykových modelů plní CI roli deterministického arbitra správnosti — stochastický generátor nekompromisně podrobuje exekutivní verifikaci.
- *Požadované kontroly*: Ke kontinuální integraci patří pojem *požadovaných kontrol* (_required checks_) — množina automatických úloh (linting, statická typová analýza, jednotkové a integrační testy), které musí skončit úspěchem, jinak řídicí systém sloučení změny zablokuje. Z kvality se tak stává strojově vynucovaná vlastnost. Zásadním úskalím návrhu těchto kontrol je ošetření podmínečných běhů: úloha, která se za určitých okolností přeskočí a neohlásí žádný výsledek, může chráněnou větev trvale zablokovat. Každá kontrola proto musí deterministicky skončit explicitním výstupem (např. konstatováním, že pro daný typ souborů není definována žádná akce).
- *Sestavení a artefakty*: Výsledkem úspěšného průchodu integrační pipeline bývá reprodukovatelný *artefakt* (spustitelný binární balíček, knihovna nebo vysázený dokument). Automatizace vydávání verzí propojuje vygenerovaný artefakt s konkrétní značkou (_tagem_) v historii gitu, čímž ke každé publikované verzi garantuje doložitelný a dohledatelný výstup.
]

== Jazykové modely a dynamika kontextového okna

#blue-note[
  *Metodické vymezení a rozsah práce:*
  Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je *agentní inženýrství* (_agentic engineering_) a *architektura řídicího harnessu* pro autonomní vývoj softwaru. Následující text je proto záměrně zredukován na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů, degradace pozornosti a rozhraní nástrojů.
]

#unconfirmed[
Základním stavebním kamenem moderních kódovacích systémů jsou velké jazykové modely (_Large Language Models_, LLM) vystavěné na architektuře dekodérového transformeru (_Decoder-only_, např. řady Claude, GPT, LLaMA či DeepSeek) @vaswani2017. V agentním inženýrství model nevystupuje jako vševědoucí orákulum, nýbrž jako *stochastický autoregresivní generátor*: na základě zadané textové historie (kontextu) opakovaně predikuje nejpravděpodobnější následující symboly. Tyto symboly reprezentují přirozený jazyk, programovací kód nebo strukturované instrukce pro vyvolání nástrojů.

Jazykový model neoperuje přímo s textovými znaky, nýbrž s diskrétními jednotkami zvanými *tokeny*. Převod mezi surovým textem a identifikátory tokenů provádí deterministický *tokenizér* (pracující např. s algoritmem Byte-Pair Encoding). Před samotným výpočtem neuronové sítě je každý token převeden do vícerozměrného vektorového prostoru — tzv. *embeddingu*, který přiřazuje slovům geometrické souřadnice podle jejich sémantické příbuznosti. Ačkoliv moderní multimodální modely (_Vision-Language Models_, VLM) dokážou transformovat i obrazové vstupy na vizuální tokeny (např. pro interpretaci wireframů), v agentním inženýrství zůstávají autonomní kódovací systémy primárně textové — staví na práci se zdrojovým kódem, abstraktními syntaktickými stromy (AST), diffy v Gitu a textovými výpisy nástrojů.

Z vlastností tokenizace a architektury transformeru plynou tři zásadní inženýrské aspekty:
- *Kapacitní strop a dynamika tahů (_Turns_)*: Každému diskrétnímu kroku ve výměně informací mezi okolním prostředím a modelem se říká tah (_turn_). Agentní smyčka rozlišuje tah uživatele či prostředí (_User/Environment Turn_), tah modelu (_Model Turn_) emitující odpověď či volání nástroje, a syntetický tah vykonání nástroje (_Tool Execution Turn_) vracející výsledek z harnessu. Striktní serializace těchto tahů do historie umožňuje inferenčnímu enginu cachovat mezivýpočty pozornosti klíčů a hodnot (_KV cache_) a nepočítat historii od začátku.
- *Kvadratická složitost kontextového okna*: Model je schopen pojmout pouze omezený objem vstupu — tzv. kontextové okno (_Context Window_). Velikost okna je limitována hardwarovou náročností mechanismu pozornosti ($O(N^2)$ vzhledem k délce sekvence $N$) a velikostí alokované KV cache v operační či grafické paměti.
- *Jazyková asymetrie a náklady*: Výpočetní náročnost i cena komerčních API se účtují za počet zpracovaných tokenů. Texty v češtině spotřebovávají kvůli bohaté flexi a diakritice 2× až 3× více tokenů než ekvivalentní text v angličtině. V autonomních pipeline je proto vysoce optimální udržovat vnitřní systémové prompty, technické plány a strukturované logy harnessu v angličtině.

Při dlouhotrvajících úlohách naráží agent na vyčerpání kapacity kontextu. K řešení tohoto problému slouží komprese historie (*Compaction*), kdy řídicí harness vyzve model k vytvoření syntetického souhrnu dosavadního průběhu sezení, který v okně nahradí původní detailní historii kroků.

Z hlediska systémového inženýrství však textová rekurzivní komprese představuje *destruktivní ztrátovou kompresi*. Autoregresivní model při rekurzivním zkracování podléhá konfirmačnímu zkreslení (_confirmation bias_) a preferuje fakta odpovídající jeho vnitřním statistickým asociacím. Tato ztrátovost vyvolává tři kritické patologie:
1. *Vymazání deterministických detailů*: Nevratně zanikají přesná čísla řádků, signatury privátních funkcí, přesné cesty v souborovém systému a doslovná znění chybových hlášení kompilátoru či testů.
2. *Ztráta negativních omezujících podmínek*: Zvláště náchylné k vymizení jsou explicitní zákazy stanovené uživatelem v úvodu úlohy (např. zákaz modifikace veřejného API nebo zákaz přidávání externích knihoven). V syntetickém souhrnu bývají tyto podmínky zobecněny či zcela opomenuty, což vede k jejich následnému porušení.
3. *Sémantický posun (_Semantic Drift_)*: Při vícenásobné rekurzivní kompresi dochází ke kaskádovému kumulování chyb (analogii tiché pošty): pokud je stav $S_(k+1)$ generován ze souhrnu $S_k$ a nového přírůstku $Delta_k$, drobné halucinace z kola $k$ jsou v kole $k+1$ přijaty jako nezvratná historická fakta. Po několika cyklech se model reality agenta zcela rozejde se skutečným stavem repozitáře.

K překonání těchto limitů moderní architektury uplatňují tři rigorózní alternativy:
- *Hierarchická epizodická paměť (RAG)*: Kompletní doslovná historie tahů a výpisů nástrojů se ukládá do externí databáze a do aktivního okna se selektivně injektují pouze fragmenty bezprostředně relevantní pro aktuální podúkol.
- *Persistentní graf stavu projektu (Project State Graph)*: Harness udržuje explicitní strukturovaný stav projektu (modifikované soubory, otevřené otázky, výsledky testů, architektonické invarianty), jehož aktualizace se řídí přísným schématem a nepodléhá narativní degradaci.
- *Selektivní prořezávání KV cache (Selective KV Cache Eviction)*: Algoritmy jako StreamingLLM @xiao2023 či $H_2 O$ @zhang2023 uvolňují paměť přímo na úrovni tenzorů v inferenčním enginu se zachováním klíčových kotev pozornosti (_attention sinks_) bez nutnosti přepisovat text promptu.

S délkou kontextu souvisí též jev *Context Rot* — degradace schopnosti modelu věnovat rovnoměrnou pozornost celé historii sezení (jev _Lost in the Middle_ @liu2024). Ačkoliv na syntetickém testu _Needle In A Haystack_ (NIAH — nalezení izolovaného faktu v dlouhém textu) dosahují moderní modely vysoké úspěšnosti, reálný softwarový vývoj vyžaduje tzv. *Multi-Needle Reasoning* — schopnost současně nalézt, propojit a logicky syntetizovat několik vzájemně závislých faktů napříč soubory a testy. V tomto scénáři spolehlivost křížového uvažování s rostoucím zaplněním okna prudce klesá.

Závěrečným pilířem práce s modelem je *inženýrství promptů a kontextu* @anthropic-prompt:
- *Systémový prompt*: Základní direktiva vymezující identitu agenta, dostupné nástroje a mantinely (formát commitů, zákaz destruktivních operací).
- *Few-shot prompting a Chain-of-Thought*: Ukázky vzorových řešení v kontextu a vedení modelu k explicitní formulaci mezikroků rozvahy před generováním kódu.
- *Dynamická injekce kontextu*: Průběžné doplňování reálného stavu repozitáře, stromu souborů a chybových výpisů kompilátoru.
- *Úskalí negativních instrukcí*: Jazykové modely často ignorují zákazy formulované negací (např. „nemazať existující testy“). Matematická podstata pozornosti ($Q K^T$) totiž aktivuje vektorové asociace ke slovům zmíněným v záporu dříve, než autoregresivní proces uplatní logický operátor negace. V agentním inženýrství se proto uplatňuje kombinace *afirmativní formulace pravidel* (pozitivní vymezení povolených mantinelů) a *deterministické exekuční ochrany v harnessu* (např. připojení chráněných souborů pouze pro čtení a blokace v CI).
]

== Architektura řídicího harnessu a orchestrace

#unconfirmed[
Fundamentální rozdíl mezi konverzačním chatbotem a autonomním agentem spočívá v rozsahu interakce s prostředím: zatímco chatbot generuje pouze textové odpovědi v uzavřeném rozhraní, agent je vybaven sadou výkonných nástrojů (_tools_), jimiž dokáže aktivně zkoumat repozitář, modifikovat soubory a spouštět příkazy.

Řídicí program obklopující model se nazývá *harness*. Odlišuje se od samotného inferenčního jádra (_inference engine_), jež zajišťuje maticové výpočty sítě: harness spravuje sezení, sestavuje systémový prompt, zajišťuje bezpečné spouštění nástrojů a řídí iterativní smyčku uvažování.

Základním prováděcím cyklem agenta je smyčka *ReAct* (_Reasoning and Acting_) @yao2022. Jak znázorňuje diagram na @fig-react-loop, po přijetí zadání probíhá iterativní cyklus čtyř fází:
1. *Fáze rozvahy (_Thought_)*: Model v rámci inference analyzuje stav kontextu a formuluje myšlenkový postup pro nejbližší krok.
2. *Vyvolání akce (_Tool Call_)*: Model emituje strukturovaný požadavek na volání nástroje.
3. *Vykonání v harnessu a pozorování (_Observation_)*: Harness požadavek bezpečně provede v cílovém prostředí a výstup vloží do kontextu jako nové pozorování.
4. *Navazující iterace*: Aktualizovaný kontext je předložen modelu v dalším tahu, čímž agent adaptivně reaguje na reálnou odezvu prostředí.
]

#figure(
  image("../img/react-loop.svg", width: 100%),
  caption: [Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.],
) <fig-react-loop>

#unconfirmed[
Předpoklad, že smyčka ReAct přirozeně konverguje k vyřešení problému, v reálném softwarovém inženýrství často selhává. Jazykový model podléhá patologickým stavům divergence:
- *Perseverace a zacyklení*: Model opakovaně emituje identické volání nástroje se shodnými argumenty (např. čte neexistující soubor či spouští tentýž selhávající test), a to i po obdržení chybové odezvy. V kontextu vzniká pravděpodobnostní atraktor, který nutí model k opakování chybného tokenového sledu.
- *Oscilace a těkání (_Thrashing_)*: Model střídavě přepíná mezi dvěma protichůdnými zásahy (úprava modulu A rozbije modul B a následná oprava B rozbije A).
- *Nekontrolovaná spotřeba zdrojů (_Context Runaway_)*: Rychlé vyčerpání kontextového okna i rozpočtu na API volání.

Řídicí harness proto musí působit jako deterministický dozorčí mechanismus (_watchdog_) a vynucovat následující ochrany:
- *Rozpočet tahů a nákladů (_Step & Cost Budget_)*: Stanovení pevného limitu tahů $T_"max"$ (typicky 25–50 kroků) a finančního stropu tokenů, jejichž překročení vede k bezpodmínečnému zastavení inference.
- *Algoritmická detekce uvíznutí (_Stuck Detection_)*: Výpočet kanonického hashe volání nástroje:
  $ h_t = "hash"("nástroj", "canonicalize"("argumenty")) $
  Harness v klouzavém okně posledních $k$ tahů detekuje identické volání $h_t = h_(t-1) = dots = h_(t-k+1)$ nebo cyklické periody.
- *Dvoustupňová intervence*: Při první detekci repetice harness injektuje prioritní syntetické varování rozbíjející pravděpodobnostní atraktor v matici pozornosti. Pokud perseverace pokračuje, zasáhne tvrdý *circuit breaker* — okamžité ukončení cyklu, deterministický návrat (_git rollback_) neuložených změn na poslední stabilní commit a eskalace člověku.

K interakci s prostředím slouží dva přístupy: strukturované volání nástrojů (Function / Tool Calling v JSON) a přímé spouštění kódu (Code Execution) v sandboxu. Zatímco JSON volání je spolehlivé pro atomické operace, pro komplexní vývoj přináší formátovací režii tokenů. Přímé spouštění kódu v kontejneru nabízí maximální flexibilitu, avšak přináší závažná bezpečnostní rizika.
]

#critique[
  *Iluzorní bezpečnost pískoviště*: Přímé spouštění netestovaného syntetického kódu v běžném Docker kontejneru nelze považovat za plnohodnotnou bezpečnostní hranici (_security boundary_). Přístup k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky environmentálních tajností (GitHub tokeny, API klíče k LLM) přes skryté síťové kanály a kompromitaci CI infrastruktury. Pro bezpečný produkční provoz je nezbytná formální izolace na bázi microVM (např. AWS Firecracker, gVisor) a striktní izolace síťových jmenných prostorů.
]

#unconfirmed[
Modularitu a rozšiřitelnost harnessu zajišťují tři zavedené koncepty:
- *Dovednosti (_Skills_)*: Adresáře instrukcí a referencí se souborem `SKILL.md` využívajícím YAML frontmatter. Do základního systémového promptu se načítají pouze metadata; detailní návod se načte až při explicitním vyvolání, což šetří kontextové okno.
- *Skripty a záchytné body (_Scripts & Hooks_)*: Deterministické spustitelné programy pro opakující se transformace kódu a událostní háčky vyvolávané při stavových přechodech harnessu.
- *Model Context Protocol (MCP @anthropic-mcp)*: Otevřený standard sjednocující integraci externích nástrojů a datových zdrojů přes protokol JSON-RPC (prostřednictvím `stdio` nebo `SSE`), který striktně odděluje běhové prostředí agenta od implementace nástrojů.
- *Meta Harness*: Koncept samořízené evoluce harnessu samotným agentem @metaharness2026. Ačkoliv je vysoce efektivní pro osobní agenty maximalizující vlastní autonomii, pro komerční a podnikové nasazení je vyžadováno deterministické ohraničení vylučující svévolnou modifikaci systémových pravidel.

Při řešení rozsáhlých softwarových problémů lineární smyčka jediného agenta naráží na kapacitní stropy. Systém proto využívá dvě pokročilé orchestrační techniky:
- *Subagenti (_Subagents_)*: Hlavní orchestrátor hierarchicky dekomponuje problém a pověřuje specializované subagenty izolovanými úkoly (např. průzkum repozitáře, rešerše dokumentace). Po dokončení úkolu je kontext subagenta zahozen a orchestrátoru je předán pouze čistý výsledek, což chrání primární kontextové okno před zahlcením (_context pollution_).
- *Pracovní postupy jako grafy (Graph Engineering / DAG)*: Životní cyklus požadavku je formalizován jako orientovaný acyklický graf (DAG), kde uzly tvoří specializované fáze (detekce, plánování, implementace, verifikace, schválení) a hrany definují tok dat a závislostí (`needs`). Selhání v kterémkoli uzlu okamžitě zastaví navazující kroky, což garantuje determinismus a stabilitu repozitáře.
]

== Zapojení člověka do smyčky (Human-in-the-loop)

#unconfirmed[
Čím vyšší míru samostatnosti systém vykazuje, tím kritičtější je přesné vymezení bodů, v nichž do procesu vstupuje člověk. Cílem moderního inženýrství není nekritická plná autonomie, nýbrž automatizace rutinních a mechanických kroků v kombinaci s lidským rozhodnutím tam, kde je změna nevratná nebo kde chybí jednoznačné algoritmické měřítko správnosti.

Architektura zapojení člověka do smyčky (_Human-in-the-loop_) stojí na třech principech:
- *Schvalovací body a lidské brány (Human Gates)*: Schvalovací bod představuje formální procesní uzel, v němž se exekuce zastaví a vyčká na autorizaci operátora. Klíčovým inženýrským rozhodnutím je správná granularita: příliš časté dotazování vede k únavě z revizí (_review fatigue_) a ztrátě efektivity, zatímco absence kontrol znamená ztrátu kontroly. Optimální architekturou je dvoufázové schvalování: člověk autorizuje *záměr* (analýzu zadání) a *technický plán* dříve, než agent začne generovat kód v repozitáři, a následně provede finální sémantickou kontrolu diffu v pull requestu.
- *Dohledatelnost původního zadání*: Aby byla změna auditovatelná, musí systém trvale uchovávat doslovné znění původního požadavku (např. znění GitHub Issue). Jakákoli předčasná parafráze modelem vede ke ztrátě sémantických nuancí a omezujících podmínek vložených autorem zadání.
- *Transparence selhání a eskalace*: Systém, který chyby tlumí či zamlžuje halucinovanými omluvami, postupně eroduje důvěru uživatele. Pokud agent vyčerpá rozpočet tahů, narazí na detekci uvíznutí nebo opakovaně selže při opravě testů, harness nesmí tiše skončit. Místo toho deterministicky vygeneruje strukturovaný diagnostický incident (obsahující stack trace, diff a stav kontextu) a eskaluje jej vývojáři k lidskému zásahu.
]
