#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Výsledky a diskuse

#blue-note[
  *Metodické vymezení výsledků a diskuse:*
  V souladu se zaměřením práce na principy agentního inženýrství a architekturu řídicího harnessu se tato kapitola soustředí na systémové a architektonické vlastnosti navrženého řešení: modularitu, determinismus, bezpečnostní izolaci a srovnání s existujícími přístupy (monolitické agentní smyčky vs. řízené DAG workflow).
]

== Sjednocení pracovních postupů a přenositelnost napříč doménami

#unconfirmed[
Základním architektonickým principem navrženého harnessu je centralizované sdílení pracovních postupů namísto jejich ad-hoc kopírování do jednotlivých projektů. Klientské repozitáře neudržují vlastní izolované sady validačních skriptů, linterů ani integračních definic; namísto toho delegují exekuci na centrální znovupoužitelné šablony a veškerou projektovou specifičnost deklarují v jediném manifestu.

Skutečný inženýrský přínos sjednocení spočívá v kvalitativních a architektonických vlastnostech:
- *Údržbová složitost $O(1)$*: Před sjednocením vyžadovala jakákoli oprava či bezpečnostní aktualizace v CI procesu samostatnou manuální úpravu a pull request v každém projektu zvlášť ($O(N)$). V centralizovaném modelu je úprava provedena pouze jednou v řídicím harnessu a spotřebitelské projekty ji přebírají posunem připnuté verze v manifestu.
- *Statická kontrola a testovatelnost*: Centralizované jádro harnessu podléhá striktní typové kontrole a je pokryto sadou jednotkových testů.
- *Omezení jediného bodu selhání (SPOF)*: Riziko nechtěných či nekompatibilních změn je deterministicky eliminováno verzováním: projekty odkazují na neměnný kryptografický SHA hash commitu či sémantický tag.
- *Konzistentní agentní prostředí*: Zajištění, že životní cyklus požadavku, správa kontextu, rotace poskytovatelů i vyhodnocování validačních bran probíhají ve všech projektech exaktně stejným způsobem.

Klíčovou vlastností modulární architektury je striktní oddělení domény od prostředí. Zatímco prostředí specifikuje konkrétní sadu exekučních binárek (např. Python, Rust, Typst), doména vymezuje způsob řízení a verifikace výstupu:
- *Doména programového kódu*: Výstup podléhá kompilaci, statické analýze a exekuci jednotkových testů s měřením pokrytí.
- *Doména textu a dokumentace*: Výstup podléhá sazební kompilaci, kontrole terminologie a generování statických auditovatelných artefaktů (např. PDF dokumentace).

Díky deklarativnímu konfiguračnímu modelu dokáže řídicí harness obsluhovat obě domény identickým orchestračním automatem, aniž by bylo nutné duplikovat integrační infrastrukturu či větvit agentní smyčky.
]

== Provozní metriky a spolehlivost agentních běhů

#struct-alert[
  *Metriky čekají na novou evaluaci*: Původní ad-hoc měření byla vyřazena. Po dokončení a stabilizaci nové verze harnessu proběhne série strukturovaných měření nad reálnými vývojovými požadavky.
]

#note[Placeholder: Zde bude zařazena nová tabulka empirických metrik (počet zpracovaných požadavků, úspěšnost PR na první pokus, úspěšnost po automatické samoopravě, průměrná spotřeba tokenů na tah, časová latence a spolehlivost rotace modelů).]

== Poznatky a systémová úskalí z provozu

#unconfirmed[
Praktické zkušenosti s během autonomních agentů v CI odhalily, že nejkritičtější úskalí neleží v neschopnosti modelů generovat syntakticky správný kód, nýbrž v distribuovaném řízení a systémové orchestraci:
- *Řízení souběžnosti a zámky*: Koordinace volajících a volaných úloh vyžaduje striktní hierarchizaci a zámky na úrovni větví, aby nedocházelo k uváznutí workflow nebo kolizím při souběžných integračních bězích.
- *Transparentnost hlášení selhání*: Systém nesmí tlumit výjimky a maskovat chyby; každé selhání API nebo nástroje musí být transparentně zaznamenáno v kontextu a eskalováno. Tiché maskování chyb vytváří iluzi stability a vede k rozsáhlým halucinacím modelu.
- *Dynamická detekce prostředí*: Systém nesmí spoléhat na implicitní předpoklady o technologiích v repozitáři, ale odvozovat exekuční plán z deklarativních manifestů.
]

== Diskuse: Porovnání architektur

#unconfirmed[
Zásadní otázkou je, jak si navržená architektura řídicího harnessu stojí ve srovnání se současnými agentními vývojovými platformami (např. SWE-agent @yao2022, Devin či GitHub Copilot Workspace):
- *Deterministický DAG vs. nekonečná agentní smyčka*: Systémy jako SWE-agent spouštějí jediný monolitický model v interaktivní terminálové smyčce, kde model sám rozhoduje o ukončení práce. Pokud model uvízne v bludném kruhu nebo halucinuje, snadno vyčerpá celý rozpočet tokenů. Navržený harness naproti tomu uzavírá model do deterministického orientovaného acyklického grafu (DAG): každý krok (plánování, implementace, verifikace) má striktně alokovaný rozpočet tahů a samostatnou kontextovou izolaci.
- *Granularita lidského dohledu*: Většina komerčních nástrojů staví na paradigmatu „jedno zadání $arrow$ finální pull request“. Pokud agent na začátku špatně pochopí záměr, vygeneruje stovky řádků nepoužitelného kódu, jehož následná revize vývojáře vyčerpává (_review fatigue_). Harness toto riziko eliminuje vícefázovým schvalováním (Human Gate): člověk autorizuje záměr a technický plán dříve, než je spuštěn samotný kódovací agent.
- *Bezpečnost a hermetičnost*: Běh autonomního agenta přímo na nechráněném vývojovém stroji přináší riziko poškození konfigurace nebo úniku tajemství. Navržený harness prosazuje exekuci v efemérních kontejnerech CI platformy s oddělenými oprávněními tokenů a auditovatelným protokolem každého provedeného příkazu.
]

== Systémová a metodická omezení

#unconfirmed[
Dosažená zjištění je třeba interpretovat s ohledem na tři fundamentální omezení:
1. *Hranice deterministické verifikovatelnosti*: Systém vyžaduje, aby bylo správnost navržené změny možné objektivně ověřit automatizovanými testy, lintery či kompilátorem. U úloh subjektivní či kreativní povahy — jako je ergonomie uživatelského rozhraní, ladění vizuálních stylů nebo stylistická formulace odborného textu — zůstává autonomní přínos omezen na vygenerování prvotního návrhu, jehož validaci musí provést člověk.
2. *Propustnost a dostupnost inferenčních API*: Ačkoli rotační žebříček poskytovatelů minimalizuje dopad výpadku jedné služby, celková průchodnost pipeline je limitována globálními kvótami a latencí cloudových API. Při souběžném zpracování většího množství požadavků může dojít k vyčerpání všech dostupných účtů, což pipeline dočasně pozastaví.
3. *Absence vícevláknového řešení konfliktů*: Architektura se soustředí na deterministické řešení izolovaných požadavků. Řízení komplexních merge konfliktů a vzájemných interferencí při souběžné práci velkého množství lidských vývojářů a autonomních agentů nad stejnými větvemi zůstává otevřenou výzvou pro navazující výzkum.
]
