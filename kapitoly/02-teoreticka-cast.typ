#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Teoretická část

#confirmed[
Tato kapitola vymezuje teoretické a architektonické principy, na nichž staví
návrh řídicího harnessu pro automatizovaný vývoj softwaru. Architektura stojí na
průniku dvou disciplín: deterministického softwarového inženýrství a stochastického
agentního modelování.

Z oblasti softwarového inženýrství práce čerpá ze správy verzí v distribuovaném
prostředí @chacon2014 a z praxe kontinuální integrace (angl. _continuous integration_)
@humble2010, při níž se každá změna ověřuje průběžně a v malých dávkách, aby se
případné chyby zachytily bezprostředně u svého vzniku. Na tuto deterministickou
kostru navazuje agentní inženýrství — řízení kontextového okna jazykových modelů,
smyčky nástrojového uvažování (ReAct) s bezpečnostními pojistkami a formalizované
zapojení člověka do rozhodovací smyčky (_Human-in-the-loop_). Cílem kapitoly není
vyčerpávající přehled obecného strojového učení, nýbrž zavedení pojmů a principů
v podobě, v jaké s nimi pracuje navržený harness.
]

== Řízení verzí

#confirmed[
Systém pro řízení verzí uchovává historii změn zdrojového kódu. Distribuovaný
model, jehož nejrozšířenějším zástupcem je Git, se od centralizovaného liší tím,
že každý vývojář má úplnou kopii historie @chacon2014. Změny lze proto vytvářet
a zkoumat i bez spojení se serverem a slučovat je až ve chvíli, kdy jsou hotové.
]

=== Větve a jejich role

#confirmed[V moderních distribuovaných systémech správy verzí (zejména v systému Git @chacon2014) je repozitář formálně modelován jako orientovaný acyklický graf (_Directed Acyclic Graph_, DAG), jehož uzly tvoří neměnné objekty revizí (_commits_) provázané kryptografickými hashy (SHA-1 či SHA-256) na své rodičovské stavy. Větev v tomto modelu nepředstavuje fyzickou kopii souborů, nýbrž odlehčený, pohyblivý ukazatel (_ref_) na konkrétní uzel grafu.

Tato grafová architektura má klíčový význam pro bezpečné zapojení autonomních agentů do vývojového procesu:
- *Izolace stavu*: Agent operuje ve vyhrazené větvi (např. `feature/...` nebo `agent/...`), která odbočuje z hlavní vývojové linie (`main`). Veškeré pokusné mutace souborového systému, mezistavy a ladicí kroky zůstávají striktně izolované, aniž by ohrozily stabilitu produkčního kódu nebo práci ostatních členů týmu.
- *Deterministický audit*: Každý krok agenta lze reprezentovat jako atomický commit s přesným časovým otiskem, autorskými metadaty a odkazem na kontextové zadání. Vzniká tak neměnná a zpětně ověřitelná historie změn.
- *Strategie slučování*: Při integraci hotové větve do hlavní linie se uplatňují různé topologické strategie: přímý posun ukazatele (_fast-forward_), vytvoření explicitního slučovacího uzlu (_merge commit_), nebo sloučení celé sekvence dílčích mezikroků agenta do jediného čistého uzlu (_squash and merge_). Právě squashování je v autonomních pipeline preferováno, neboť eliminuje šum v podobě neúspěšných pokusů modelu a v hlavní větvi zanechává pouze finální, ověřený přírůstek.]

=== Model pull requestu

#confirmed[Sloučení větve do hlavní vývojové linie se v moderním kolaborativním softwarovém inženýrství odehrává prostřednictvím modelu *pull requestu* (PR, na platformě GitLab též _Merge Request_). Jde o formalizovaný procesní uzel, v němž autor větve předkládá navržený diff kódu k revizi dříve, než dojde k jeho trvalému začlenění do chráněné hlavní větve.

V kontextu autonomního vývoje plní pull request dvě nezastupitelné funkce:
1. *Strojová validační brána*: Na vytvoření nebo aktualizaci PR reaguje integrační server (CI), který v izolovaném kontejneru spustí sadu automatizovaných testů, typových kontrol a bezpečnostních linterů. Tím je objektivně ověřeno, že syntetický kód generovaný modelem splňuje stanovené standardy a nezpůsobuje regresi stávající funkcionality.
2. *Lidská schvalovací brána (Human Gate)*: Pull request poskytuje přehledné rozhraní zobrazující řádkový diff změn, výsledky automatických testů a strukturovaný popis úprav. Člověk v roli recenzenta (_code reviewera_) tak může provést finální sémantickou kontrolu a rozhodnout o schválení či zamítnutí změny. Pull request tím představuje ideální architektonický styčný bod pro princip člověka ve smyčce (_Human-in-the-loop_).]


== Kontinuální integrace

#confirmed[
V prostředí autonomního a poloautonomního vývoje slouží kontinuální integrace jako
deterministický arbitr správnosti. Zatímco výstupy jazykového modelu jsou ze své
podstaty stochastické a náchylné k halucinacím, integrační pipeline poskytuje
reprodukovatelné testovací prostředí, které syntetické změny nekompromisně podrobuje
exekutivní verifikaci dříve, než mohou ovlivnit stabilní větev.
]

=== Požadované kontroly

#confirmed[
Ke kontinuální integraci patří pojem _požadovaných kontrol_ (angl. required
checks): množina úloh, které musí skončit úspěšně, jinak nelze změnu sloučit.
Tím se z kvality stává vlastnost vynucovaná strojem, nikoli pouze dohodou mezi
vývojáři.

Návrh požadovaných kontrol má jedno nezřejmé úskalí. Úloha, která se za jistých
okolností „přeskočí“, nehlásí žádný výsledek; je-li přitom uvedena mezi
požadovanými, zablokuje slučování napořád. Kontrola proto musí vždy skončit
nějakým závěrem — i kdyby jím bylo konstatování, že v daném repozitáři není
co dělat.
]

=== Sestavení a artefakty

#confirmed[
Výsledkem sestavení bývá _artefakt_: spustitelný soubor, knihovna, nebo — jak
ukazuje praktická část — vysázený dokument. Automatizace vydávání verzí spojuje
artefakt se značkou v historii, takže ke každé vydané verzi existuje doložitelný
výstup.
]

== Jazykové modely a jejich orchestrace

#blue-note[
  *Metodické vymezení a rozsah práce:*
  Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je *agentní inženýrství* (_agentic engineering_) a *architektura řídicího harnessu* pro autonomní vývoj softwaru. Následující sekce věnované transformeru, tokenizeru, embeddingu a pozornosti jsou proto záměrně zredukovány na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů a fungování rozhraní nástrojů.
]

=== Transformer a velké jazykové modely

#draft[
Základním stavebním kamenem moderních kódovacích agentů jsou velké jazykové modely (_Large Language Models_, LLM) vystavěné na architektuře dekodérového transformeru (_Decoder-only_, např. GPT, Claude, LLaMA či DeepSeek) @vaswani2017. Na rozdíl od starších sekvenčních architektur (RNN) zpracovává transformer vstupní data pomocí mechanismu pozornosti (_attention_), který umožňuje modelu paralelně zohledňovat vztahy mezi všemi prvky v zadaném kontextu bez ohledu na jejich vzájemnou vzdálenost.

V agentním inženýrství model nevystupuje jako magický vševědoucí systém, nýbrž jako *stochastický autoregresivní generátor*: na základě zadané textové historie (kontextu) opakovaně predikuje nejpravděpodobnější následující symboly. Tyto symboly mohou reprezentovat jak přirozený jazyk či programovací kód, tak strukturované instrukce pro volání externích nástrojů.
]

=== Tokeny, tokenizér a embedding

#draft[
Jazykový model neoperuje přímo se slovy či znaky, nýbrž s diskrétními jednotkami zvanými *tokeny*. Převod mezi surovým textem a číselnými identifikátory tokenů zajišťuje *tokenizér* — deterministický program pracující s pevným slovníkem dílčích slovních podjednotek (_sub-words_, např. algoritmem Byte-Pair Encoding). Běžná anglická slova odpovídají zpravidla jednomu tokenu (cca 3–4 znaky), zatímco méně časté výrazy, technické identifikátory nebo jazyky s bohatou flexí a diakritikou (včetně češtiny) jsou děleny do vícero tokenů.

Před samotným výpočtem neuronové sítě je každý token převeden do vícerozměrného vektorového prostoru — tzv. *embeddingu*. Vektorové vnoření přiřazuje slovům geometrické souřadnice tak, aby sémanticky příbuzné koncepty (např. volání funkce a její definice) ležely v prostoru blízko sebe.

Z pohledu agentního inženýrství mají vlastnosti tokenizace tři zásadní provozní dopady:
1. *Kapacitní strop kontextového okna*: Každý model má pevně stanovený maximální počet tokenů, které dokáže v jednom běhu pojmout.
2. *Ekonomické náklady a latence*: Výpočetní náročnost i cena komerčních API se účtují za počet zpracovaných a vygenerovaných tokenů.
3. *Jazyková asymetrie*: Texty v češtině spotřebovávají 2× až 3× více tokenů než ekvivalentní sdělení v angličtině. V autonomních pipeline je proto optimální udržovat vnitřní systémové prompty, technické plány a strukturované logy v angličtině.
]

=== Mechanismus pozornosti a KV cache

#draft[
Mechanismus pozornosti (_Attention_) umožňuje transformeru dynamicky propojovat informace napříč celou historií sezení — například spojit chybový výpis kompilátoru z konce kontextu s deklarací proměnné na jeho začátku.

Z výpočetního hlediska vyžaduje pozornost porovnání každého tokenu se všemi ostatními tokeny v sekvenci, což vede ke kvadratické výpočetní a paměťové složitosti $O(N^2)$ vzhledem k délce kontextu $N$. Aby nebylo nutné při každém vygenerovaném slově přepočítávat celou historii od začátku, ukládají inferenční enginy mezivýpočty do mezipaměti — tzv. *KV cache* (_Key-Value Cache_). Velikost a správa KV cache představují primární hardwarový limit pro délku kontextového okna a zásadní faktor pro rychlost odezvy agenta.
]

=== Multimodální modely

#draft[
Ačkoliv byl transformer původně navržen pro text, stejný princip lze aplikovat i na obrazové vstupy (_Vision-Language Models_, VLM). Obraz je rozložen na pravidelnou mřížku dlaždic (_patches_), které jsou lineární projekcí transformovány na vizuální tokeny se stejnou dimenzí vnoření jako tokeny textové. Mechanismus pozornosti pak operuje společně nad textem i obrazem.

Ačkoli multimodální modely nabízejí teoretický potenciál pro doplňkové softwarové úlohy (např. interpretaci grafických wireframů v zadání nebo vizuální kontrolu webového rozvržení), v agentním inženýrství zůstávají autonomní kódovací systémy primárně textové — staví na práci se zdrojovým kódem, abstraktními syntaktickými stromy (AST), unifikovanými diffy v Gitu a textovými protokoly testovacích nástrojů.
]

=== Context

==== Turn

#confirmed[Každému diskrétnímu kroku ve výměně informací mezi okolním prostředím a jazykovým modelem se v agentních architekturách říká tah (_turn_). Na rozdíl od jednoduchého konverzačního rozhraní, kde dochází pouze ke střídání uživatele a asistenta, agentní smyčka (typicky implementující vzor ReAct @yao2022) rozlišuje tři základní typy tahů:
1. *Tah uživatele či prostředí (_User / Environment Turn_)*: Vnáší do kontextu nové zadání, externí událost (např. spuštění GitHub webhooku) nebo doplňující instrukce.
2. *Tah modelu (_Model / Assistant Turn_)*: Reprezentuje jedno spuštění inference neuronové sítě. Model na základě dosavadní historie emituje buď finální textovou odpověď, nebo strukturovaný požadavek na vyvolání nástroje (_tool call_).
3. *Tah vykonání nástroje (_Tool Execution Turn_)*: Běhové prostředí (harness) provede požadovanou operaci — např. spuštění skriptu v terminálu či čtení souboru — a její výsledek vloží do kontextu jako syntetický tah určený pro navazující uvažování modelu.

Striktní oddělení těchto fází a jejich deterministická serializace do historie kontextu mají zásadní dopad na výpočetní efektivitu: umožňují inferenčnímu serveru plně využívat cachování klíčů a hodnot (_KV cache_), neboť neměnná historie předchozích tahů nemusí být při každém kroku znovu přepočítávána.]

==== Context Window

#confirmed[
Model je schopen přijmout pouze omezený objem vstupu; tomuto limitu se říká kontextové okno (_Context Window_) a vyjadřuje se v počtu tokenů. Na rozdíl od slovníku (_vocabulary_), který vymezuje pouze repertoár známých tokenů, je maximální délka kontextového okna určena architekturou pozičního kódování (např. škálováním frekvenčních bází v RoPE) a hardwarovou náročností mechanismu pozornosti — kvadratickou složitostí $O(N^2)$ a velikostí alokované KV cache v operační či grafické paměti.
]

==== Compaction

#confirmed[Představuje proces sumarizace a zkrácení historie, který řídicí harness iniciuje ve chvíli, kdy zaplnění kontextového okna dosáhne stanoveného prahu. #diff[Zpravidla jde o vyvolání modelu se specifickou systémovou instrukcí pro bezeztrátovou syntézu dosavadního průběhu sezení a kompletním protokolem dosavadní komunikace.][Zpravidla jde o vyvolání modelu se specifickou systémovou instrukcí k syntéze dosavadního průběhu sezení a kompletním protokolem dosavadní komunikace.] Výsledný zkrácený kontext následně v kontextovém okně nahradí původní rozsáhlou historii kroků.]

#added[
===== Limity rekurzivní komprese a sémantický posun (Semantic Drift)

Ačkoliv je proces komprese historie v řadě základních implementací prezentován jako přímočaré řešení konečné kapacity kontextového okna, z hlediska teorie informace a systémového inženýrství představuje *destruktivní ztrátovou kompresi*. Při zkracování dosavadní trajektorie model trpí výrazným *konfirmačním zkreslením* (_confirmation bias_): autoregresivní model při generování souhrnu nevybírá fakta nestranně, nýbrž sumarizuje primárně ty aspekty historie, které sám považuje za relevantní vzhledem ke svým vnitřním statistickým asociacím.

Tato ztrátovost má fatální dopad na integritu vývojového kontextu:
1. *Vymazání deterministických detailů*: Zkrácením nevratně zanikají přesná čísla řádků, signatury privátních funkcí, plné cesty souborů a doslovná znění chybových hlášení kompilátoru či testovacího frameworku (_stack traces_).
2. *Ztráta negativních omezujících podmínek*: Zvláště náchylné k vymizení jsou explicitní negativní mantinely stanovené uživatelem v úvodu úlohy (např. „neměň veřejné rozhraní modulu X“ nebo „nepřidávej žádné externí závislosti“). V syntetizovaném souhrnu bývají tyto kritické podmínky zobecněny či zcela opomenuty, což v navazujících tazích vede k jejich okamžitému porušení.
3. *Sémantický posun (_Semantic Drift_)*: Při dlouhotrvajících komplexních úlohách vyžadujících vícenásobnou rekurzivní kompresi dochází ke kaskádovému kumulování chyb (analogii hry na tichou poštu). Pokud je stav $S_(k+1)$ generován jako souhrn předchozího souhrnu $S_k$ a nového přírůstku $Delta_k$, drobné aproximační odchylky či halucinace z kola $k$ jsou v kole $k+1$ přijaty jako nezvratná historická fakta. Po několika cyklech komprese se vnitřní model reality agenta zcela rozejde se skutečným stavem repozitáře a původním zadáním.

K překonání fundamentálních limitů textové rekurzivní komprese se v moderních agentních architekturách uplatňují tři rigorózní alternativy:
- *Hierarchická epizodická paměť a vyhledávání (RAG)*: Kompletní doslovná historie tahů, výpisů nástrojů a diffů se nezkracuje přímo v kontextu, nýbrž persistuje do externí databáze (např. fulltextového či vektorového indexu). Do aktivního kontextu jsou následně deterministicky či sémanticky injektovány pouze ty minulé fragmenty, které jsou bezprostředně relevantní pro řešený podúkol.
- *Persistentní graf stavu projektu (Project State Graph)*: Namísto nestrukturovaného volného textu udržuje harness explicitní strukturovaný stav projektu (např. formou formálního stavového schématu či grafového modelu), který deterministicky eviduje modifikované soubory, seznam nezodpovězených otázek, stav integračních testů a nezměnitelné invarianty. Aktualizace tohoto stavu se řídí přísným schématem a nepodléhá volné narativní degradaci.
- *Selektivní prořezávání KV cache (Selective KV Cache Eviction)*: Místo manipulace s textovými tokeny probíhá řízení paměti přímo na úrovni tenzorů v inferenčním enginu. Algoritmy jako StreamingLLM @xiao2023 či $H_2 O$ (_Heavy Hitter Oracle_) @zhang2023 identifikují a v paměti trvale uchovávají tzv. kotevní tokeny pozornosti (_attention sinks_) a matematicky nejvýznamnější minulé stavy, zatímco redundantní mezilehlé stavy bezpečně uvolňují bez nutnosti destruktivního přepisování promptu.
]

==== Context Rot a evaluace vybavování (Needle In A Haystack)

#confirmed[Označuje empiricky zdokumentovanou degradaci schopnosti modelu věnovat rovnoměrnou pozornost všem částem historie (tzv. jev _Lost in the Middle_ @liu2024). Čím plnější je kontextové okno, tím méně jsou modely schopny spolehlivě vybavovat jemné detaily z úvodu sezení a dodržovat negativní omezující podmínky zadání.]

#added[
Ke standardizovanému testování schopnosti modelu přesně vybavovat informace z rozsáhlého kontextového okna slouží syntetický evaluační test *Needle In A Haystack* (NIAH -- „jehla v kupce sena“). Princip spočívá ve vložení izolovaného, na kontextu nezávislého faktu (např. unikátního klíče či specifického nastavení konfigurace) do různé relativní hloubky (od 0 % do 100 %) dlouhého distraktoru textu (čítajícího desítky tisíc až miliony tokenů). Model je následně vyzván k zodpovězení dotazu, jehož vyřešení závisí výhradně na této vložené informaci.

Zatímco moderní frontier modely dosahují na jednoduchém syntetickém testu NIAH téměř stoprocentní úspěšnosti napříč celou délkou okna, v reálném softwarovém vývoji vyvstává zásadní omezení: práce v repozitáři vyžaduje tzv. *Multi-Needle Reasoning* — schopnost současně nalézt, propojit a logicky syntetizovat několik vzájemně závislých informací (např. signaturu funkce v jednom modulu, její volání v druhém a konfigurační flag ve třetím). V takovém scénáři se naplno projevuje degradace pozornosti: s rostoucím objemem historie v kontextovém okně rapidně klesá spolehlivost křížového uvažování, což v dlouhých agentních sezeních vede k přehlédnutí okrajových podmínek a regresi v kódu.
]

==== KV Caching

#confirmed[
KV caching slouží ke snížení výpočetní náročnosti modelu při generování tokenů. Místo toho, abychom při každém kroku inference znovu od začátku počítali pozornost pro celou dosavadní konverzaci, ponechává inferenční engine v paměti uložené již vypočtené vektory klíčů a hodnot (_Key-Value pairs_) a v každém kroku počítá a přidává pouze nově vygenerovaný token.
]

=== Prompt a kontextové inženýrství

#confirmed[
_Prompt engineering_ (inženýrství promptů) je disciplína zaměřená na systematický návrh, formulaci a optimalizaci textových instrukcí předkládaných modelu @anthropic-prompt. V autonomních agentních systémech nepředstavuje prompt pouhou volnou konverzaci, ale slouží jako závazný kontrakt vymezující chování, práva a bezpečnostní mantinely agenta. Mezi klíčové techniky patří:

- *Systémový prompt (System Prompt)*: Základní direktiva definující identitu agenta, dostupné nástroje a striktní provozní pravidla (např. pravidla pro zachování neměnnosti existujících testů, konvence pro formát commitů či zákaz destruktivních operací v repozitáři).
- *Few-shot prompting*: Technika vložení několika vzorových příkladů (vstup-výstup) přímo do kontextu. Tím model získá konkrétní představu o požadovaném schématu (např. syntaxi konfiguračního souboru `darkfactory.json`) bez nutnosti dodatečného dotrénování parametrů.
- *Chain-of-Thought (myšlenkový řetězec)*: Vedení modelu k explicitní formulaci mezikroků a vnitřní dedukce před vygenerováním konečného kódu či akce. Rozklad komplexního zadání na postupné logické kroky zásadně potlačuje halucinace a tvoří základ fáze rozvahy (_Thought_) v cyklu ReAct.
- *Injekce dynamického kontextu*: Průběžné doplňování promptu o aktuální stav repozitáře, stromovou strukturu souborů, chybové výpisy kompilátoru a výsledky testů, díky čemuž agent operuje nad reálnými fakty namísto odhadů.
]

#added[
==== Úskalí negativních instrukcí a princip afirmativního vymezení

Zvláštní výzvou při formulaci systémových pravidel a zadání úkolů je definice omezujících podmínek pomocí zákazů a negativních instrukcí (např. „nikdy nemaž existující testy“, „neupravuj soubory mimo složku src“). V praxi je empiricky prokázáno, že jazykové modely negativní příkazy často porušují nebo zcela ignorují.

Tento jev má hluboké opodstatnění v samotném matematickém fungování mechanismu pozornosti transformeru:
1. *Pozornost zaměřená na přítomná slova*: Matice pozornosti ($Q K^T$) vyhodnocuje sémantickou relevanci na základě *přítomných* tokenů. Zmínka zakázané operace (např. `test_suite.py` ve větě „Za žádných okolností nemaž test_suite.py“) aktivuje v embeddingovém prostoru silné vektorové asociace k danému souboru i k operaci smazání.
2. *Asymetrie negace v autoregresivní predikci*: Negace představuje logický operátor vysokého řádu vyžadující složenou kompozici významu. Při autoregresivním generování token po tokenu však model často podlehne silnější statistické asociaci mezi přítomnými sémantickými pojmy dříve, než uplatní logický kontext záporové částice.

V robustním inženýrství agentních systémů se proto uplatňují dva komplementární principy:
- *Afirmativní formulace pravidel*: Pravidla se namísto zákazů formulují pozitivním vymezením požadovaného chování a mantinelů (např. „Upravuj výhradně soubory deklarované v seznamu `target_files`“, „Před jakoukoli změnou ověř běh stávajících testů“).
- *Deterministická exekuční ochrana v harnessu*: Bezpečnostní mantinely a zákazy destruktivních operací nesmí záviset na poslušnosti jazykového modelu vůči promptu. Řídicí harness systému DarkFactory proto prosazuje striktní omezení deterministicky na úrovni běhového prostředí — např. připojením chráněných cest v souborovém systému pouze pro čtení (_read-only mount_), sandboxováním exekuce terminálových příkazů a nezávislou validací změn v pull requestu před sloučením.
]

=== Agent vs Chatbot

#confirmed[Fundamentální rozdíl mezi chatbotem a agentem spočívá v rozsahu interakce s okolním světem: zatímco chatbot operuje výhradně v uzavřeném konverzačním rozhraní a generuje textové odpovědi, agentem se systém stává ve chvíli, kdy je vybaven sadou výkonných nástrojů (_tools_). Prostřednictvím nich dokáže aktivně zkoumat repozitář, vyhledávat informace na webu, modifikovat soubory a autonomně vykonávat příkazy v cílovém výpočetním prostředí.]

=== Harness a System Prompt

#confirmed[
Harness je řídicí program obklopující jazykový model. Odlišuje se od inferenčního jádra (_inference engine_), které provádí samotné maticové výpočty sítě: harness má na starost rozhraní mezi uživatelem a agentem či chatbotem, předávání systémového promptu, bezpečné spouštění nástrojů a řízení iterativní smyčky neboli ReAct smyčky. Mezi typické příklady patří webová aplikace ChatGPT, terminálové rozhraní Claude Code, desktopová aplikace Codex a další agentní prostředí.
]

=== ReAct smyčka

#draft[
Smyčka ReAct (_Reasoning and Acting_) tvoří základní stavební kámen, který z jazykového modelu vytváří autonomního agenta namísto pouhého pasivního generátoru textu @yao2022. Princip nespočívá v jednorázovém vygenerování kódu či odpovědi, nýbrž v soustavné alternaci vnitřní rozvahy (_Reasoning_ neboli _Thought_) a vnějšího jednání (_Acting_ neboli _Tool Call_). Tento princip byl formálně zaveden v práci _ReAct: Synergizing Reasoning and Acting in Language Models_ (@yao2022, #link("https://arxiv.org/abs/2210.03629")[arXiv:2210.03629]).

Jak znázorňuje diagram na @fig-react-loop, po přijetí uživatelského zadání dochází k následujícímu iterativnímu cyklu:
1. *Fáze rozvahy (_Thought_)*: Model v rámci inference analyzuje aktuální stav kontextu a formuluje hypotézu či myšlenkový postup, na jehož základě určí nejbližší nezbytný krok.
2. *Vyvolání akce (_Tool Call_)*: Pokud krok vyžaduje externí operaci, model emituje strukturovaný požadavek na volání nástroje.
3. *Vykonání v harnessu a pozorování (_Observation_)*: Řídicí harness zachytí požadavek, bezpečně jej provede v cílovém prostředí (terminál, souborový systém či MCP server) a vrácený výstup připojí do kontextového okna jako nové pozorování.
4. *Navazující iterace*: Aktualizovaný kontext je předložen modelu v dalším tahu, čímž agent adaptivně reaguje na reálnou odezvu prostředí namísto slepé generace.
]

#figure(
  image("../img/react-loop.svg", width: 100%),
  caption: [Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.],
) <fig-react-loop>

#added[
==== Řízení divergence, detekce uvíznutí a rozpočet tahů (Step Budget)

Základní teoretický popis smyčky ReAct předpokládá, že proces přirozeně konverguje k vyřešení problému nebo k rozhodnutí modelu o předání finální odpovědi uživateli. V reálné autonomní softwarové praxi je však tento předpoklad zásadně lichý: jazykový model je stochastický systém bez inherentních garancí terminace a při řešení neúplně specifikovaných či složitých chyb v repozitáři často podléhá patologickým stavům divergence:

1. *Perseverace a zacyklení (_Perseveration & Infinite Loops_)*: Model opakovaně emituje identické volání nástroje se zcela shodnými parametry (např. čte tentýž neexistující soubor, provádí tentýž neúspěšný regex match nebo spouští tentýž selhávající test), a to i přesto, že z prostředí obdržel chybovou odezvu (_Observation_). Z hlediska pravděpodobnostní dynamiky dochází ke vzniku tzv. *atraktoru v kontextu*: přítomnost chybujícího pokusu a chybové hlášky v bezprostřední historii paradoxně zvyšuje podmíněnou pravděpodobnost, že model v dalším tahu vygeneruje velmi podobný tokenový sled.
2. *Oscilace a těkání (_Thrashing_)*: Model střídavě přepíná mezi dvěma protichůdnými zásahy (např. úprava funkce A vyvolá regresi v modulu B, model následně zedituje modul B a rozbije modul A, načež změny cyklicky invertuje bez hlubšího pochopení systémové příčiny).
3. *Nekontrolovaná spotřeba zdrojů (_Context Runaway_)*: Bez striktního vnějšího omezení může divergentní smyčka v krátkém čase zcela zaplnit kontextové okno a vyčerpat finanční rozpočet na API volání.

Z těchto důvodů nesmí být rozhodnutí o ukončení cyklu ponecháno výhradně na autonomní vůli modelu. Řídicí harness musí vůči modelu vystupovat jako deterministický dozorčí mechanismus (_watchdog_) a prosazovat následující vrstvy ochrany:

- *Rozpočet tahů a nákladů (_Step & Cost Budget_)*: Každému sezení či dílčímu podúkolu je přiřazen pevný rozpočet maximálního počtu tahů $T_"max"$ (typicky 25–50 kroků) a finanční strop pro spotřebu tokenů. Překročení tohoto rozpočtu vede k okamžitému a bezpodmínečnému zastavení inference.
- *Algoritmická detekce uvíznutí (_Stuck Detection_)*: Běhové prostředí počítá pro každé volání nástroje kanonický hash jeho identifikátoru a normalizovaných argumentů:
  $ h_t = "hash"("nástroj", "canonicalize"("argumenty")) $
  Harness v klouzavém okně posledních $k$ tahů (např. $k=3$) detekuje identické volání $h_t = h_(t-1) = dots = h_(t-k+1)$ nebo periodické vzorce v posloupnosti hashů.
- *Dvoustupňová intervenční strategie*:
  1. _Měkká intervence (Synthetic Warning)_: Při první detekci repetice harness přeruší standardní tok a injektuje do kontextu syntetickou systémovou observaci s vysokou prioritou (např. _„Varování harnessu: Nástroj byl opakovaně vyvolán s identickými argumenty bez pozitivního posunu. Přehodnoťte hypotézu, změňte diagnostický přístup nebo požádejte o doplňující instrukce.“_). Tím se účinně rozbije pravděpodobnostní atraktor v matici pozornosti.
  2. _Tvrdá intervence (Circuit Breaker)_: Pokud perseverace pokračuje i po varování, harness cyklus okamžitě ukončí, provede deterministický návrat (_rollback_) neuložených změn v repozitáři na poslední stabilní gitový commit a eskaluje stav lidskému operátorovi jako neřešitelnou anomálii.
]


=== Vyvolávání nástrojů

#draft[
Abychom z jazykového modelu vytvořili autonomního agenta, musíme jej vybavit rozhraním pro interakci s okolním prostředím — tzv. nástroji (_tools_). V praxi existují dva převažující přístupy k realizaci nástrojů:

1. *Strukturované volání nástrojů (Function / Tool Calling v JSON)*: Model ve svém výstupu zanechá strukturované volání odpovídající schématu zadanému v definici nástroje. Řídicí harness toto volání zachytí, vykoná požadovanou funkci a vrátí výsledek zpět agentovi opět jako strukturovaná data. Tato možnost je spolehlivá pro jednoúčelové operace (např. integraci do podnikových systémů či zákaznické podpory — angl. _customer support_). Pro komplexní softwarový vývoj však představuje nevýhodu vysoká režie formátu JSON: velké množství formátovacích znaků se převádí na tokeny, což zbytečně plní kontextové okno a může vést k degradaci pozornosti (_Context Rot_).

2. *Přímé spouštění kódu (Code Execution)*: Druhou možností je poskytnout agentovi plnohodnotné běhové prostředí (např. Bash, Python či TypeScript). Agent vygeneruje kód pro splnění svého záměru a harness jej spustí buď po jednotlivých příkazech, nebo jako ucelený skript. Z bezpečnostních důvodů je nezbytné, aby agent nepracoval přímo na nechráněném hostitelském počítači, nýbrž ve virtuálním prostředí odděleném bezpečnostní vrstvou — tzv. sandboxu (pískovišti). Tento způsob je pro softwarový vývoj nejefektivnější.
]

#critique[Iluzorní bezpečnost pískoviště: Druhý přístup (přímé spouštění kódu v kontejneru) práce nekriticky prezentuje jako „nejefektivnější“, zamlčuje však gigantická bezpečnostní a operační rizika. Běžný Docker kontejner není plnohodnotná bezpečnostní hranice (_security boundary_). Spuštění netestovaného kódu generovaného modelem s přístupem k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky tajných environmentálních proměnných (GitHub tokeny, API klíče k LLM poskytovatelům) přes postranní síťové kanály a nevratné poškození repozitáře. Práce postrádá jakoukoli analýzu formální izolace (např. microVM architektury jako AWS Firecracker, gVisor či striktní network namespaces) a nezodpovídá otázku, co zabrání kompromitovanému modelu zneužít CI runner jako odrazový můstek pro kompromitaci infrastruktury.]

=== Dovednosti, skripty a záchytné body

#confirmed[
Tyto standardy vznikly proto, aby vývojáři mohli modulárně upravovat chování agenta a rozšiřovat jeho schopnosti pro specifické doménové úlohy:

- *Dovednost (_Skill_)*: Samostatný adresář sdružující instrukce, reference a pomocné soubory. Klíčovým prvkem je soubor `SKILL.md`, který využívá hlavičku v metadatovém formátu YAML frontmatter (ohraničenou trojicí pomlček `---`). V hlavičce je definován název a stručný popis dovednosti. Řídicí harness do základního systémového promptu vkládá pouze tato metadata; samotný text podrobného návodu se do kontextu načte až ve chvíli, kdy agent danou dovednost vyvolá. Tím se efektivně šetří kapacita kontextového okna.
- *Skript (_Script_)*: Jednoúčelový spustitelný program (např. v jazyce Python či Bash). Skripty jsou pro efektivitu práce vitální: agent nemusí generovat každý příkaz z paměti, ale spouští deterministické a otestované postupy pro analýzu a transformaci kódu.
- *Záchytný bod (_Hook_)*: Skript, který se v harnessu automaticky vyvolá při určité systémové události či stavovém přechodu (např. při inicializaci sezení, před odesláním promptu modelu nebo při selhání nástroje). Hooky umožňují vynucovat bezpečnostní pravidla a logování nezávisle na vůli samotného modelu.
]

=== MCP Server

#confirmed[
Model Context Protocol vznikl v laboratořích společnosti Anthropic jako standardizovaný způsob pro efektivní interakci agentů s API servery. Ve své podstatě se jedná o nástroje postavené na rozhraní externího API, tudíž protokol sjednocuje různé standardy do jediného otevřeného rozhraní a přidává kontext — metadata pro každou přítomnou metodu, aby agent předem věděl, co od ní očekávat, a nemusel sám odhadovat fungování backendu.

Praktický význam specifikace Model Context Protocol @anthropic-mcp spočívá ve sjednocení dříve fragmentovaného ekosystému proprietárních rozhraní a jednoúčelových integračních skriptů. Řídicí harness se díky standardu stává univerzálním klientem a veškeré externí schopnosti, datové zdroje či nástroje se integrují jako samostatné procesy — tzv. MCP servery. Komunikace probíhá přes standardizovaný protokol JSON-RPC, a to buď lokálně prostřednictvím standardního vstupu a výstupu (`stdio`), nebo vzdáleně pomocí protokolu HTTP se Server-Sent Events (`SSE`). Tento modulární přístup striktně odděluje běhové prostředí agenta od samotné implementace nástrojů: libovolnou schopnost (např. přístup k databázi, vyhledávání v repozitáři nebo správu GitHub úkolů) stačí naimplementovat jednou a lze ji okamžitě zpřístupnit jakémukoli kompatibilnímu agentovi bez nutnosti zásahu do kódu samotného harnessu.
]

=== Meta Harness

#confirmed[V reálném světě se ukázalo, že nejefektivnější harness je takový, který dá samotnému agentovi rozhodovací pravomoc nad vlastní architekturou a umožňuje kontinuální změnu, tedy samořízenou evoluci @metaharness2026. Tento přístup je mimořádně efektivní pro maximalizování pracovní kapacity agenta, v praxi se však hodí především pro osobního agenta. U komerčních nasazení, jako je zákaznická podpora (_customer support_), provozovatel naopak striktně vyžaduje deterministické mantinely a vylučuje, aby model modifikoval své vlastní provozní instrukce.]

=== Subagenti

#confirmed[Když je agent vybaven nástrojem umožňujícím vyvolat další specializovanou instanci jazykového modelu, zadat jí dílčí úlohu, asynchronně s ní komunikovat a sledovat její postup, efektivita řešení rozsáhlých softwarových problémů dramaticky roste. V teorii autonomních systémů se tyto delegované entity označují jako subagenti (_subagents_).

Tato architektura umožňuje hierarchickou dekompozici problému: hlavní koordinační agent (_orchestrator_) udržuje globální strategii a pověřuje úzce profilované subagenty izolovanými činnostmi — například rešerší dokumentace, prozkoumáním rozsáhlého adresářového stromu repozitáře nebo syntaktickou opravou konkrétního modulu. Zásadní architektonickou výhodou je ochrana a izolace kontextového okna: rozsáhlý a výpočetně náročný průzkumný kontext subagenta se po dokončení úkolu zahodí a rodičovskému orchestrátoru je předán pouze syntetizovaný, čistý výsledek. Tím se zabraňuje zahlcení primárního kontextu (_context pollution_) a degradaci kognitivních schopností hlavního agenta.]

=== Workflows neboli Graph Engineering

#confirmed[Jakmile se snažíme organizovat nebo automatizovat úlohu složitější než několik přímočarých kroků, lineární sekvence promptů přestává stačit. V takovém okamžiku přicházejí na řadu pracovní postupy (_workflows_), v teoretické informatice reprezentované jako grafy. Grafy se v softwarovém vývoji používají v mnoha situacích. Graf se skládá z uzlů (_nodes_) a hran (_edges_) — v kontextu agentních systémů každý uzel představuje izolovaného agenta s připraveným systémovým promptem, dovednostmi a nástroji, zatímco spoje mezi nimi vymezují tok informací a posloupnost práce. Abstrakcí tohoto grafového systému jsme schopni tuto pipeline nasadit na libovolnou úlohu, a to i dynamicky za pomoci orchestrace nadřazeným agentem.]

#draft[
Tento koncept se v informatice označuje jako orientovaný acyklický graf (*DAG* — _Directed Acyclic Graph_). Uzly grafu představují samostatné, specializované výpočetní kroky či izolované agenty, zatímco orientované hrany určují pořadí závislostí a tok kontextových informací. V moderních orchestrátorech a CI/CD platformách (zejména v GitHub Actions) se závislosti mezi úlohami deklarují pomocí direktivy `needs: [...]`.

Jak podrobně rozvádí praktická část této práce na architektuře systému DarkFactory, celý životní cyklus automatizovaného požadavku je strukturován právě jako DAG složený z pěti klíčových fází:
1. *Detekce a kontext*: rozpoznání prostředí projektu, načtení konfiguračního souboru `darkfactory.json` a příslušných systémových pravidel.
2. *Interpretace a plánování*: formulace přesného technického postupu a vytvoření plánovacího úkolu dříve, než dojde k samotnému zásahu do kódu.
3. *Implementace (kódování)*: spuštění agenta s přesně vymezenou sadou nástrojů v izolované větvi repozitáře.
4. *Verifikace a testování*: automatické sestavení projektu, spuštění testovací sady a kontrola kvality změn.
5. *Schvalovací brána (Governance)*: podmíněné zastavení toku grafu a vyžádání lidské kontroly před finálním sloučením pull requestu.

Zásadní předností grafového uspořádání je determinismus a striktní bezpečnost: pokud kterýkoli uzel selže (např. automatizované testy detekují regresi), exekuce se v dané větvi grafu okamžitě přeruší a navazující kroky se nespustí, což zabraňuje poškození hlavní vývojové linie.
]

== Human in the loop neboli člověk ve smyčce

#confirmed[
Čím je systém samostatnější, tím důležitější je otázka, kde do procesu vstupuje
člověk. Úplná autonomie není cílem; cílem je autonomie v rutinních krocích
a lidské rozhodnutí tam, kde je nevratné nebo kde chybí měřítko správnosti.
]

=== Schvalovací body

#confirmed[
Schvalovací bod je místo, kde se proces zastaví a čeká na potvrzení. Jeho
umístění je kompromisem: příliš mnoho schvalování popírá smysl automatizace,
příliš málo znamená ztrátu kontroly. Osvědčeným řešením je schvalovat _záměr_
(co se má udělat) a _plán_ (jak se to má udělat) dříve, než vznikne kód.
]

=== Dohledatelnost

#confirmed[
Aby byla automatizovaná změna přezkoumatelná, musí být zřejmé, z jakého
požadavku vzešla. Uchování doslovného znění původního zadání je proto součástí
návrhu, nikoli formalitou: parafráze ztrácí význam, který do zadání vložil ten,
kdo je formuloval.
]

=== Eskalace a transparence selhání

#confirmed[Systém, který své vlastní selhání zamlčí nebo zamete pod koberec, je nebezpečnější než systém, který zjevně havaruje: nespolehlivost se v něm stává neviditelnou a postupně eroduje důvěru uživatele v celý autonomní provoz. V konceptu člověka ve smyčce proto hlášení chyb a eskalace selhání netvoří pouhý doplňkový technický detail, nýbrž fundamentální bezpečnostní pilíř. Pokud autonomní agent narazí na vyčerpání kontextového okna, syntaktickou chybu neřešitelnou v rámci rozpočtu tahů nebo selhání integračních testů, nesmí skončit tichým uváznutím či nekonečným cyklem. Místo toho musí harness deterministicky zachytit chybový stav, sestavit strukturovaný diagnostický protokol (obsahující chybový stack trace, diff provedených změn a stav kontextu) a srozumitelně jej eskalovat člověku formou notifikace či dedikovaného incidentu. Tím je zajištěna plná observabilita a okamžitá lidská dohledatelnost.]


