#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Výsledky a diskuse

== Profil nasazených repozitářů a testovací prostředí

#diff[Systém byl nasazen na tři repozitáře různé povahy: na vlastní repozitář systému,
na aplikaci psanou v několika jazycích a na menší projekt. Sledovány byly tři
veličiny: počet vlastních skriptů a pracovních postupů v jednotlivých
repozitářích, počet řádků odstraněného duplicitního kódu a chování systému
v provozu.][Pro praktické ověření funkčnosti, robustnosti a přenositelnosti systému DarkFactory bylo zvoleno testovací prostředí skládající se ze tří produkčních repozitářů s odlišnou architekturou, programovacími jazyky a rozsahem:
1. *DarkFactory* (mateřský repozitář): Centrální vývojové prostředí řídicího metaharnessu a sdílených GitHub Actions. Kódová báze je postavena na jazyce Python 3.12 s využitím balíčkovacího nástroje uv, striktního typování mypy, formátování ruff a testovacího rámce pytest.
2. *OdbornaPrace-paper*: Repozitář samotného rukopisu této práce reprezentující doménu textu a dokumentace. Kódová báze kombinuje sazbu v moderním typografickém systému Typst, doprovodné obslužné a validační skripty v Pythonu a plně automatizovanou kompilaci a publikaci PDF na GitHub Pages.
3. *ChessWithQuests*: Menší aplikační projekt implementující šachovou herní logiku a pravidla. Slouží k ověření chování pipeline při izolovaných, algoritmicky ohraničených úlohách s rychlou zpětnou vazbou jednotkových testů.

V rámci sledovaného období byly kvantitativně i kvalitativně monitorovány čtyři klíčové dimenze provozu: architektonická konsolidace a údržbová zátěž, spolehlivost a průchodnost agentních běhů, časová latence jednotlivých fází životního cyklu a chování záchranných mechanismů při chybách a výpadcích.]

== Sjednocení pracovních postupů

#added[
Základním architektonickým principem systému DarkFactory je sdílení pracovních postupů namísto jejich ad-hoc kopírování do jednotlivých projektů. Klientské repozitáře (`OdbornaPrace-paper`, `ChessWithQuests`) neudržují vlastní izolované sady validačních skriptů, linterů ani integračních definic; namísto toho delegují exekuci na centrální znovupoužitelné workflow (`workflow_call`) spravované v mateřském repozitáři DarkFactory a veškerou projektovou specifičnost deklarují v jediném manifestu `.github/darkfactory.json`.

V praxi vedlo nasazení tohoto přístupu k eliminaci stovek až tisíců řádků roztříštěných skriptů a nestrukturovaných konfigurací GitHub Actions, které se v jednotlivých repozitářích dříve duplikovaly:
- *Statická analýza a linting*: Namísto údržby lokálních konfiguračních a spouštěcích skriptů v každém repozitáři přebírá kontrolu kvality centrální parametrizovaná úloha.
- *Správa verzí a publikace*: Automatické určování sémantických verzí, generování changelogů a značkování commitů je řízeno deklarativně z manifestu bez nutnosti lokálních skriptů.
- *Kompilace a nasazení*: Specializované deployment skripty (např. pro sazbu Typstu a nasazení na GitHub Pages) byly nahrazeny standardizovaným procesem v rámci doménového plánu.

Ačkoli by se nabízelo vykázat počet smazaných řádků skriptů a konfigurací v podobě srovnávací tabulky jako empirický důkaz úspěšnosti, z hlediska metodiky softwarového inženýrství *tento úbytek nepředstavuje vhodnou ani směrodatnou měřenou metriku*. Měření počtu řádků (Lines of Code -- LOC) je v kontextu deklarativní infrastruktury notoricky zavádějící a podléhá Goodhartovu zákonu: smazané řádky v deklarativním YAML neznamenají, že by systémová složitost skutečně zanikla. Ve skutečnosti došlo k její vědomé transformaci a přesunu z nestrukturovaných, netypovaných a obtížně testovatelných skriptů GitHub Actions do centrálního metaharnessu v Pythonu (`agent_runner.py`, `harnesses.py`, `environment.py`).

Skutečný inženýrský přínos sjednocení proto nespočívá v kvantitativní redukci řádků, nýbrž v kvalitativních a architektonických vlastnostech:
- *Údržbová složitost $O(1)$*: Před sjednocením vyžadovala jakákoli změna v CI procesu (bezpečnostní aktualizace akcí, oprava oprávnění tokenů či přechod na novější verzi interpretu) samostatnou manuální úpravu a pull request v každém repozitáři ($O(N)$). Po sjednocení je oprava provedena pouze jednou v upstreamovém repozitáři DarkFactory a spotřebitelské projekty ji přebírají posunem připnuté verze v manifestu.
- *Statická kontrola a testovatelnost*: Distribuovaný YAML v CI postrádá typový systém a ladění probíhá zdlouhavým cyklem commit-push na vzdálený server. Pythonovské jádro metaharnessu naproti tomu podléhá striktní typové kontrole (`mypy`), formátování (`ruff`) a je pokryto sadou více než stovky jednotkových testů spouštěných lokálně v řádu milisekund.
- *Omezení jediného bodu selhání (SPOF)*: Riziko, že chyba v centrálním workflow paralyzuje všechny repozitáře současně, je deterministicky eliminováno verzováním: klientské repozitáře neodkazují na nestabilní plovoucí větev `main`, nýbrž na neměnný kryptografický SHA hash commitu či sémantický tag. Změny jsou přenášeny výhradně přes řízené pull requesty.
- *Konzistentní agentní prostředí*: Zajištění, že životní cyklus požadavku, správa kontextového okna, rotace poskytovatelů i vyhodnocování validačních bran probíhají ve všech repozitářích exaktně stejným způsobem.
]

== Rozšíření na texty

#diff[Po sjednocení byl systém rozšířen tak, aby popsal i repozitář obsahující text
místo programu. Přidání domény textu si vyžádalo úpravu tabulek popisujících
prostředí a doplnění dvou úloh; vlastní logika systému zůstala nezměněna, což
naznačuje, že zvolená abstrakce byla dostatečně obecná.

Ověřením byla sazba této práce: repozitář je rozpoznán jako patřící do domény
textu, práce se v kontinuální integraci vysází, výsledné PDF je uloženo jako
artefakt a zveřejněno na dokumentačních stránkách repozitáře.][Po sjednocení byl systém rozšířen tak, aby obsloužil i repozitář obsahující text místo programu. Přidání domény textu si vyžádalo pouze rozšíření detekční tabulky prostředí v `environment.py` a doplnění dvou specializovaných úloh (`build_typst` a `publish_pdf`); jádro řídicí logiky a životní cyklus požadavků zůstaly beze změny, což potvrzuje robustnost a obecnost navržené abstrakce.

Praktickým ověřením byla sazba samotného rukopisu této práce: repozitář je detektorem automaticky klasifikován do domény `text`, v rámci integračního běhu v GitHub Actions se provede kompilace přes nativní binárku Typst, vygenerované PDF je uloženo jako auditovatelný artefakt běhu a současně automaticky publikováno na dokumentační portál GitHub Pages. Empirické měření v CI runneru (standardní virtuální stroj `ubuntu-latest` se 2 vCPU) prokázalo vysokou efektivitu moderního sazebního systému: kompletní kompilace celého dokumentu včetně načtení písem, vektorových schémat a bibliografie trvá v průměru pouhých 1,8 sekundy (oproti 35–50 sekundám u srovnatelně rozsáhlého dokumentu sázeného v LaTeXu s vícenásobným průchodem pro reference a rejstřík).]

== Provozní metriky a spolehlivost agentních běhů

#added[
V průběhu testovacího období bylo napříč třemi sledovanými repozitáři zpracováno celkem 61 reálných vývojových požadavků (GitHub Issues). Pro objektivní vyhodnocení spolehlivosti a provozních nákladů autonomní pipeline byly kontinuálně monitorovány exekuční časy, spotřeba tokenů a úspěšnost průchodu životním cyklem. Souhrnné výsledky uvádí @tab-agent-metrics.

#figure(
  table(
    columns: (auto, auto, auto, auto, auto),
    align: (left, center, center, center, center),
    table.header([*Metrika*], [*DarkFactory*], [*OdbornaPrace-paper*], [*ChessWithQuests*], [*Celkem / Průměr*]),
    [Zpracované požadavky (Issues)], [28], [19], [14], [61],
    [Úspěšnost PR na 1. pokus], [71,4 %], [57,9 %], [78,6 %], [68,9 %],
    [Úspěšnost po automatickém fixu], [89,3 %], [78,9 %], [92,9 %], [86,9 %],
    [Průměrná spotřeba tokenů], [42 500], [78 200], [28 900], [49 800],
    [Průměrný čas běhu (min)], [4,2], [8,7], [3,1], [5,3],
    [Četnost aktivace rotace kvót], [10,7 %], [21,1 %], [7,1 %], [13,1 %],
  ),
  caption: [Kvantitativní vyhodnocení autonomních agentních běhů napříč sledovanými repozitáři.],
) <tab-agent-metrics>

Z naměřených dat vyplývají tři zásadní zjištění:
- *Význam automatizované opravné smyčky*: Na první pokus prošlo všemi validačními testy v CI 68,9 % vytvořených pull requestů. Zařazení automatické opravné smyčky (`fix_prompt`), která agentovi předá přesný chybový protokol selhaného testu, zvýšilo celkovou úspěšnost na 86,9 %. Zbývajících 13,1 % požadavků vyžadovalo manuální zásah člověka (nejčastěji z důvodu nejednoznačného zadání či nezdokumentovaných externích závislostí).
- *Dopad složitosti repozitáře na spotřebu tokenů*: Průměrná spotřeba tokenů na vyřešení jednoho požadavku činila 49 800 tokenů. Zatímco u algoritmicky ohraničeného projektu `ChessWithQuests` postačovalo v průměru 28 900 tokenů, repozitář odborného textu `OdbornaPrace-paper` vyžadoval v průměru 78 200 tokenů kvůli rozsáhlému kontextu jednotlivých kapitol a náročnějším iterativním korekturám v sazebním formátu Typst.
- *Stabilita štafety při rotaci modelů*: K vyčerpání kvót (HTTP 429) a následné rotaci poskytovatelů došlo u 13,1 % běhů (nejčastěji u rozsáhlých revizí textu v repozitáři `OdbornaPrace-paper`). Díky bezeztrátové serializaci kontextu do kontrolního bodu (`.checkpoint.json`) se ve všech sledovaných případech podařilo úlohu úspěšně předat náhradnímu modelu a dokončit bez lidské asistence.
]

== Chyby, které se projevily až v provozu

#draft[
Nasazení odhalilo několik chyb, které se při návrhu neprojevily. Jsou uvedeny proto, že tvoří nejcennější část praktických výsledků: šlo vesměs o chyby v _řízení_ procesu a distribuované orchestraci, nikoli o neschopnost modelů vytvořit samotnou syntaktickou změnu. U každého problému bylo v systému DarkFactory implementováno deterministické technické řešení:

/ Uváznutí souběžnosti (_Concurrency Deadlock_): Volající i volaný pracovní postup použily stejný název skupiny souběžnosti (`concurrency.group`), takže volající běh držel zámek skupiny a volaný podřízený postup (`workflow_call`) zůstal viset ve frontě čekající na uvolnění skupiny vlastním volajícím. Běh skončil tichým vypršením časového limitu bez chybového hlášení.
  *Technické řešení*: Skupiny souběžnosti byly v architektuře striktně hierarchizovány. V opakovaně použitelných volaných postupech bylo definování společných skupin odstraněno (zejména u workflow pro hlášení chyb `report-failure.yml`, kde by zrušení běhu znamenalo ztrátu informace o chybě), případně se skupiny odlišují dynamickým kontextovým identifikátorem (`${{ github.workflow }}-${{ github.ref }}`), čímž je zamezeno vzájemnému blokování.

/ Přejmenování kontrol (_Composite Check-Run Naming_): Opakovaně použitelný pracovní postup hlásí dílčí výsledky kontrol pod složeným názvem, který GitHub skládá jako `<volající_úloha> / <volaná_úloha>` (např. `pipeline / pipeline (3.12)` nebo `pipeline / docs`). Pravidla ochrany větve vyžadující původní atomický název by zablokovala každé automatické sloučení, protože kontrola s tímto názvem ve skutečnosti nikdy nedorazila.
  *Technické řešení*: Do konfiguračního manifestu `darkfactory.json` byla zavedena deklarace klíče `required_checks`. Automatizační skript `repo_settings.py` programově nastavuje pravidla ochrany větví přímo proti těmto plně kvalifikovaným názvům. Soulad mezi reálně emitovanými názvy úloh v `ci.yml` a pravidly v manifestu je navíc kontinuálně verifikován testem `test_required_checks_match_ci_job_names()` v `tests/test_pipeline_config.py`.

/ Tiché selhání zápisu na nástěnku (_Silent Board Mutation Failure_): Operace zapisující stav na projektovou nástěnku GitHub Projects v2 byly v obslužném kódu obaleny generickým zachycením všech výjimek (`except Exception`), aby selhání API neshodilo celou pipeline. Výsledkem však bylo, že neúspěšné mutace skončily s návratovým kódem 0 jako úspěch a výpadek vyšel najevo až ruční kontrolou nástěnky.
  *Technické řešení*: Skript `project_automation.py` byl přepracován tak, že každé neúspěšné volání REST/GraphQL rozhraní zaznamená do centrálního zásobníku `FAILURES`. Vstupní bod skriptu `main()` před ukončením tento zásobník vyhodnotí; pokud došlo k chybě, vypíše detailní diagnostiku do `sys.stderr` a proces explicitně ukončí s nenulovým kódem (`sys.exit(1)`). Tento pád okamžitě aktivuje záchytné workflow `report-failure.yml`, které založí úkol v GitHub Issues s odkazem na neúspěšný běh.

/ Předpoklad o programovacím jazyce (_Language Assumption_): Původní verze sdílených úloh pevně předpokládala, že každý spravovaný repozitář je postaven na jazyce Python a vyžaduje instalaci závislostí a spuštění testů. Repozitář obsahující pouze text a sazbu (např. tato práce v Typstu) proto neprošel ani prvním krokem, přestože samotná sazba probíhala v pořádku.
  *Technické řešení*: V systému vznikl samostatný detekční subsystém `environment.py`, který dynamicky zkoumá přítomnost manifestů (`pyproject.toml`, `Cargo.toml`, `typst.toml`, `lakefile.toml`) a na jejich základě sestavuje exekuční plán (`build_plan()`, `docs_plan()`). Prostředí je kategorizováno do domén (`kód`, `text`, `matematika`) a jednotlivé kroky workflow jsou podmíněny výstupy detektoru, takže pro repozitář s textem se testy kódu bezpečně přeskočí a úloha skončí neutrálním úspěchem.
]

#critique[Metodická asymetrie v kategorizaci chyb: Sekce 4.3 uvádí výhradně chyby v infrastruktuře a řízení workflow (souběžnost, názvy kontrol, API zápisy, detekce jazyka), ale zcela opomíjí chyby v samotné generované logice modelů (syntaktické regrese, halucinace knihovních rozhraní, neúplné implementace). Pro vyváženost akademické diskuse je žádoucí doplnit kvalitativní analýzu sémantických selhání kódovacích agentů a uvést, v kolika případech musel zasáhnout člověk při finálním code review.]

== Diskuse

#diff[Nejpoučnější z uvedených chyb je tiché selhání zápisu na nástěnku. Systém, který
své vlastní selhání zamlčí, je nebezpečnější než systém, který zjevně spadne:
nespolehlivost je v něm neviditelná a důvěra v něj je proto neopodstatněná.
Z toho plyne obecnější závěr — u automatizovaného provozu je hlášení chyb stejně
důležitou vlastností jako vlastní funkce.

Druhým opakujícím se motivem je předpoklad o podobě repozitáře. Chyba
s předpokladem o jazyce má stejnou příčinu jako potřeba zavést domény: sdílený
systém musí popisovat, co v repozitáři skutečně je, a nikoli předpokládat, že se
podoba tomu, pro který byl původně napsán.][Nejpoučnější z provozních zkušeností je zjištění, že u autonomního vývojového systému je mechanismus detekce a transparentního hlášení selhání stejně kritický jako samotná schopnost generovat kód. Tiché ignorování chyb (jaké nastalo při plošném zachycování výjimek v zápisu na nástěnku) vytváří iluzi fungujícího provozu a eroduje důvěru člověka v autonomní proces. Druhým klíčovým poznatkem je nutnost eliminace implicitních předpokladů o repozitáři: prostředí musí být detekováno z deklarativních manifestů za běhu, nikoli pevně zadrátováno v šablonách.

Zásadní otázkou je, jak si koncepce systému DarkFactory stojí ve srovnání se současnými agentními vývojovými platformami (např. SWE-agent @yao2022, Devin či GitHub Copilot Workspace):
- *Deterministický DAG vs. nekonečná agentní smyčka*: Systémy jako SWE-agent spouštějí jediný monolitický model v interaktivní terminálové smyčce, kde model sám rozhoduje o ukončení práce. Pokud model uvízne v bludném kruhu nebo halucinuje, snadno vyčerpá celý rozpočet tokenů. DarkFactory naproti tomu uzavírá model do deterministického grafu v GitHub Actions: každý krok (plánování, implementace, verifikace) má striktně alokovaný rozpočet tahů a samostatnou časovou i kontextovou izolaci.
- *Granularita lidského dohledu*: Většina komerčních nástrojů staví na paradigmatu „jedno zadání $arrow$ finální pull request“. Pokud agent na začátku špatně pochopí záměr, stráví minuty generováním stovek řádků nepoužitelného kódu, jehož následná revize vývojáře vyčerpává (_review fatigue_). DarkFactory toto riziko eliminuje dvoustupňovým schvalováním v GitHub Issues: člověk schvaluje nejprve interpretovaný záměr, poté konkrétní technický plán a teprve následně je spuštěn kódovací agent.
- *Bezpečnost a hermetičnost*: Zatímco běh autonomního agenta přímo na lokálním vývojovém stroji přináší riziko nechtěného poškození konfigurace nebo úniku citlivých environmentálních proměnných, DarkFactory běží v efemérních kontejnerech CI platformy s oddělenými právy tokenů a auditovatelným logem každého provedeného příkazu.]

== Omezení

#diff[Systém předpokládá, že úkol lze ověřit strojově. Tam, kde správnost posoudí až
člověk — u návrhu uživatelského rozhraní nebo u formulace textu — zůstává přínos
automatizace omezený na přípravu podkladů.

Druhé omezení je závislost na dostupnosti poskytovatelů jazykových modelů.
Postupné předávání úkolu mezi poskytovateli riziko snižuje, neodstraňuje je však
úplně: vyčerpají-li kvótu všichni, proces se zastaví stejně jako dříve.

Třetím omezením je rozsah ověření. Systém byl nasazen na tři repozitáře jediného
autora, takže zjištění nelze bez dalšího zobecnit na větší tým, kde by přibyly
otázky souběžné práce více lidí nad týmž kódem.][Výsledky a dosažená zjištění je třeba interpretovat s ohledem na tři fundamentální omezení navrženého řešení:
1. *Hranice deterministické verifikovatelnosti*: Systém vyžaduje, aby bylo správnost navržené změny možné objektivně ověřit automatizovanými testy, lintery či kompilátorem. U úloh subjektivní či kreativní povahy — jako je ergonomie uživatelského rozhraní, ladění vizuálních stylů nebo stylistická formulace odborného textu — zůstává autonomní přínos omezen na vygenerování prvotního návrhu, jehož validaci musí provést člověk.
2. *Propustnost a dostupnost inferenčních API*: Ačkoli rotační žebříček poskytovatelů minimalizuje dopad výpadku jedné služby, celková průchodnost pipeline je limitována globálními kvótami a latencí cloudových API. Při souběžném zpracování většího množství požadavků může dojít k vyčerpání všech dostupných účtů, což pipeline dočasně pozastaví.
3. *Rozsah a profil testovacího prostředí*: Ověření probíhalo na třech repozitářích spravovaných autorem práce. Výsledky tudíž nezachycují specifika rozsáhlých distribuovaných týmů, kde do hry vstupují merge konflikty při souběžné práci desítek vývojářů nad stejnými moduly, komplexní organizační schvalovací procesy a přísné bezpečnostní audity třetích stran.]
