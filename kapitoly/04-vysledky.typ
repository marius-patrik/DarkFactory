#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Výsledky a diskuse

#struct-alert[
  *Výsledky a empirická data v rekonstrukci*: Vzhledem k probíhající zásadní přestavbě systému DarkFactory byla detailní provozní data předchozí verze (původní statistika 61 zpracovaných úkolů, měření spotřeby tokenů a rozbor konkrétních chyb ve starých skriptech) dočasně nahrazena zástupnými strukturálními bloky. Po dokončení a stabilizaci nové verze proběhne nová série měření a testování.
]

== Profil nasazených repozitářů a testovací prostředí

#draft[
Pro praktické ověření funkčnosti, robustnosti a přenositelnosti systému DarkFactory bylo zvoleno testovací prostředí skládající se ze tří produkčních repozitářů s odlišnou architekturou, programovacími jazyky a rozsahem:
1. *DarkFactory* (mateřský repozitář): Centrální vývojové prostředí řídicí pipeline a sdílených orchestračních nástrojů.
2. *OdbornaPrace-paper*: Repozitář samotného rukopisu této práce reprezentující doménu akademických a odborných textů. Kódová báze kombinuje sazbu v moderním typografickém systému Typst, doprovodné obslužné skripty a plně automatizovanou kompilaci a publikaci na GitHub Pages.
3. *ChessWithQuests*: Aplikační projekt implementující šachovou herní logiku a pravidla. Slouží k ověření chování pipeline při izolovaných, algoritmicky ohraničených úlohách s rychlou zpětnou vazbou jednotkových testů.

#note[Placeholder: Zde bude po přestavbě specifikováno aktualizované běhové prostředí nové verze systému DarkFactory.]
]

== Sjednocení pracovních postupů

#draft[
Základním architektonickým principem systému DarkFactory je sdílení pracovních postupů namísto jejich ad-hoc kopírování do jednotlivých projektů. Klientské repozitáře neudržují vlastní izolované sady validačních skriptů, linterů ani integračních definic; namísto toho delegují exekuci na centrální znovupoužitelné šablony a veškerou projektovou specifičnost deklarují v jediném manifestu.

Skutečný inženýrský přínos sjednocení nespočívá v pouhé kvantitativní redukci řádků kódu (LOC), nýbrž v kvalitativních a architektonických vlastnostech:
- *Údržbová složitost $O(1)$*: Před sjednocením vyžadovala jakákoli změna v CI procesu samostatnou manuální úpravu a pull request v každém repozitáři ($O(N)$). Po sjednocení je oprava provedena pouze jednou v upstreamovém repozitáři DarkFactory a spotřebitelské projekty ji přebírají posunem připnuté verze v manifestu.
- *Statická kontrola a testovatelnost*: Centralizované jádro metaharnessu podléhá striktní typové kontrole a je pokryto sadou testů spouštěných lokálně.
- *Omezení jediného bodu selhání (SPOF)*: Riziko nechtěných změn je deterministicky eliminováno verzováním: klientské repozitáře odkazují na neměnný kryptografický SHA hash commitu či sémantický tag.
- *Konzistentní agentní prostředí*: Zajištění, že životní cyklus požadavku, správa kontextu, rotace poskytovatelů i vyhodnocování validačních bran probíhají ve všech repozitářích exaktně stejným způsobem.
]

== Doménové ověření na sazbě textu

#draft[
Praktickým ověřením obecnosti systému byla sazba samotného rukopisu této práce: repozitář je detektorem automaticky klasifikován do domény textu, v rámci integračního běhu v GitHub Actions se provede kompilace přes nativní binárku Typst, vygenerované PDF je uloženo jako auditovatelný artefakt běhu a současně automaticky publikováno na dokumentační portál GitHub Pages. Empirické měření v CI runneru prokázalo vysokou efektivitu moderního sazebního systému: kompletní kompilace celého dokumentu včetně načtení písem, vektorových schémat a bibliografie trvá v průměru pouhé 1–2 sekundy.
]

== Provozní metriky a spolehlivost agentních běhů

#struct-alert[
  *Metriky čekají na novou evaluaci*: Původní empirická data ze staré verze systému byla vyřazena. Po dokončení přestavby systému DarkFactory proběhne nová série benchmarků a provozních měření nad reálnými vývojovými požadavky.
]

#note[Placeholder: Zde bude po dokončení přestavby zařazena nová tabulka empirických metrik (počet zpracovaných issues, úspěšnost PR na první pokus, úspěšnost po automatické samoopravě, průměrná spotřeba tokenů, časová latence a četnost rotace modelů).]

== Poznatky a analýza chyb z provozu

#struct-alert[
  *Provozní poznatky v revizi*: Konkrétní chyby dřívějšího skriptového jádra budou nahrazeny poznatky a incidenty z provozu přestavěného systému.
]

#draft[
Dosavadní provoz odhalil, že nejkritičtější úskalí autonomních vývojových provozů neleží v neschopnosti modelů generovat syntakticky správný kód, nýbrž v distribuovaném řízení a systémové orchestraci:
- *Řízení souběžnosti a zámky*: Koordinace volajících a volaných úloh vyžaduje striktní hierarchizaci, aby nedocházelo k uváznutí workflow.
- *Mapování názvů kontrol a branch protection*: Pravidla ochrany větví musí přesně odpovídat složeným názvům úloh emitovaným CI platformou.
- *Transparentnost hlášení selhání*: Systém nesmí tlumit výjimky a maskovat chyby; každé selhání API musí být transparentně zachyceno a eskalováno.
- *Dynamická detekce prostředí*: Systém nesmí spoléhat na implicitní předpoklady o technologiích v repozitáři, ale odvozovat exekuční plán z deklarativních manifestů.

#note[Placeholder: Zde bude po přestavbě doplněn podrobný rozbor konkrétních chyb a jejich deterministických technických řešení v nové architektuře DarkFactory.]
]

== Diskuse

#draft[
Nejpoučnějším z provozních zkušeností je zjištění, že u autonomního vývojového systému je mechanismus detekce a transparentního hlášení selhání stejně kritický jako samotná schopnost generovat kód. Tiché ignorování chyb vytváří iluzi fungujícího provozu a eroduje důvěru člověka v autonomní proces. Druhým klíčovým poznatkem je nutnost eliminace implicitních předpokladů o repozitáři: prostředí musí být detekováno z deklarativních manifestů za běhu, nikoli pevně zadrátováno v šablonách.

Zásadní otázkou je, jak si koncepce systému DarkFactory stojí ve srovnání se současnými agentními vývojovými platformami (např. SWE-agent @yao2022, Devin či GitHub Copilot Workspace):
- *Deterministický DAG vs. nekonečná agentní smyčka*: Systémy jako SWE-agent spouštějí jediný monolitický model v interaktivní terminálové smyčce, kde model sám rozhoduje o ukončení práce. Pokud model uvízne v bludném kruhu nebo halucinuje, snadno vyčerpá celý rozpočet tokenů. DarkFactory naproti tomu uzavírá model do deterministického grafu v GitHub Actions: každý krok (plánování, implementace, verifikace) má striktně alokovaný rozpočet tahů a samostatnou časovou i kontextovou izolaci.
- *Granularita lidského dohledu*: Většina komerčních nástrojů staví na paradigmatu „jedno zadání $arrow$ finální pull request“. Pokud agent na začátku špatně pochopí záměr, stráví minuty generováním stovek řádků nepoužitelného kódu, jehož následná revize vývojáře vyčerpává (_review fatigue_). DarkFactory toto riziko eliminuje vícefázovým schvalováním: člověk schvaluje záměr, konkrétní technický plán a teprve následně je spuštěn kódovací agent.
- *Bezpečnost a hermetičnost*: Zatímco běh autonomního agenta přímo na lokálním vývojovém stroji přináší riziko nechtěného poškození konfigurace nebo úniku citlivých environmentálních proměnných, DarkFactory běží v efemérních kontejnerech CI platformy s oddělenými právy tokenů a auditovatelným logem každého provedeného příkazu.
]

== Omezení

#draft[
Výsledky a dosažená zjištění je třeba interpretovat s ohledem na tři fundamentální omezení navrženého řešení:
1. *Hranice deterministické verifikovatelnosti*: Systém vyžaduje, aby bylo správnost navržené změny možné objektivně ověřit automatizovanými testy, lintery či kompilátorem. U úloh subjektivní či kreativní povahy — jako je ergonomie uživatelského rozhraní, ladění vizuálních stylů nebo stylistická formulace odborného textu — zůstává autonomní přínos omezen na vygenerování prvotního návrhu, jehož validaci musí provést člověk.
2. *Propustnost a dostupnost inferenčních API*: Ačkoli rotační žebříček poskytovatelů minimalizuje dopad výpadku jedné služby, celková průchodnost pipeline je limitována globálními kvótami a latencí cloudových API. Při souběžném zpracování většího množství požadavků může dojít k vyčerpání všech dostupných účtů, což pipeline dočasně pozastaví.
3. *Rozsah a profil testovacího prostředí*: Ověření probíhalo na repozitářích spravovaných autorem práce. Výsledky tudíž nezachycují specifika rozsáhlých distribuovaných týmů, kde do hry vstupují merge konflikty při souběžné práci desítek vývojářů nad stejnými moduly, komplexní organizační schvalovací procesy a přísné bezpečnostní audity třetích stran.
]
