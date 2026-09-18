#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Praktická část

#confirmed[
Praktickou částí práce je systém *DarkFactory* — sada pravidel, skriptů
a pracovních postupů, které z repozitáře udělají samostatně pracující vývojový
provoz. Zdrojový kód je veřejně dostupný @darkfactory.
]

== Cíl a rozsah systému

#confirmed[
Systém má převzít rutinní kroky vývojového procesu: přijetí požadavku, jeho
interpretaci, naplánování, provedení změny a její ověření. Nemá nahradit
rozhodování o tom, co se má stavět; to zůstává člověku, a systém je navržen tak,
aby si toto rozhodnutí vyžádal dříve, než začne pracovat.
]

== Architektura

#struct-alert[
  *Architektura v rekonstrukci*: Vzhledem k probíhající zásadní přestavbě systému DarkFactory byla dosavadní implementační dekompozice modulů a skriptů dočasně nahrazena zástupnými strukturálními bloky. Nová architektura, komponentní diagram a specifikace rozhraní budou doplněny po stabilizaci nové verze.
]

#draft[
Systém DarkFactory je navržen jako modulární stavebnice složená z řídicích orchestračních modulů, šablon pracovních postupů pro kontinuální integraci a hermetického#footnote(numbering: "*")[Pojem *hermetické prostředí* (angl. _hermetic environment_) označuje v softwarovém inženýrství takové výpočetní a běhové prostředí, které je zcela izolované od nekontrolovaných stavů hostitelského operačního systému a okolní sítě. Veškeré nástroje, knihovny a systémové závislosti jsou v něm explicitně deklarovány a uzamčeny na konkrétních verzích, což zaručuje absolutní determinismus a reprodukovatelnost: proces spuštěný v hermetickém kontejneru skončí vždy identickým výsledkem bez ohledu na to, kde a kdy byl vyvolán.] běhového prostředí. Architektura striktně odděluje deklarativní konfiguraci konkrétního repozitáře od samotné logiky orchestrace.

=== Koncepce a systémové vrstvy

#note[Placeholder: Zde bude doplněna nová vrstevnatá dekompozice přestavěného systému DarkFactory včetně nového komponentního schématu nahrazujícího původní skriptové jádro.]

=== Sdílení pracovních postupů

#note[Placeholder: Zde bude popsán nový distribuční a konzumační model workflow napříč spravovanými repozitáři po dokončení přestavby.]

=== Konfigurační model repozitáře

#note[Placeholder: Zde bude specifikováno nové deklarativní schéma konfiguračního manifestu vymezujícího identitu repozitáře, doménové oblasti a projektová pravidla.]
]

== Životní cyklus požadavku

#struct-alert[
  *Životní cyklus v rekonstrukci*: Stavový automat řízení požadavků, definice exekučních fází a systém validačních bran procházejí revizí v návaznosti na celkovou přestavbu DarkFactory.
]

#draft[
Životní cyklus požadavku formalizuje přechody mezi stavy od zadání úkolu v GitHub Issues přes plánování, implementaci, automatické testování až po vystavení pull requestu a sloučení do hlavní větve.

#note[Placeholder: Zde bude doplněn nový stavový diagram životního cyklu a detailní popis jednotlivých fází nového běhového automatu.]
]

== Popis prostředí repozitáře

#draft[
Aby systém věděl, které úlohy má spustit, musí rozpoznat, z čeho se repozitář
skládá. Rozpoznávání vychází z názvů souborů popisujících balíček; jejich
přítomnost je spolehlivější než jakýkoli ruční záznam, protože se nemůže rozejít
se skutečností.

#figure(
  table(
    columns: (auto, auto, auto),
    align: (left, left, left),
    table.header([*Soubor*], [*Prostředí*], [*Doména*]),
    [`pyproject.toml`], [Python], [kód],
    [`Cargo.toml`],     [Rust],   [kód],
    [`package.json`],   [Node],   [kód],
    [`go.mod`],         [Go],     [kód],
    [`typst.toml`],     [Typst],  [text],
    [`.latexmkrc`],     [LaTeX],  [text],
    [`lakefile.toml`],  [Lean],   [matematika],
  ),
  caption: [Rozpoznávání prostředí podle souboru popisujícího balíček.],
) <tab-prostredi>
]

=== Domény a prostředí

#draft[
Rozlišení dvou úrovní se ukázalo jako nutné až v průběhu práce. _Prostředí_ říká,
jaký nástroj je potřeba; _doména_ říká, jakému způsobu řízení výsledek podléhá.
Python a Rust jsou dvě prostředí téže domény — kód se testuje a balí. Typst
a LaTeX jsou dvě prostředí jiné domény — text se sází a publikuje.

Toto rozlišení dovoluje popsat i repozitář, který obsahuje zároveň program
a text — jako právě tato práce, jejíž praktickou částí je software popisovaný
v @tab-prostredi. Bez něj by bylo nutné buď považovat sazbu za zvláštní případ
kódu, nebo pro texty vytvořit samostatný systém.
]

=== Deklarace jako doplněk rozpoznávání

#draft[
Rozpoznávání prostředí nemůže předvídat veškeré specifické požadavky projektu. Repozitář této práce například přibaluje vlastní sadu písem v podadresáři `fonts/`, takže příkaz pro sazbu vyžaduje dodatečné parametry. Konfigurační manifest proto umožňuje výchozí parametry transparentně rozšířit nebo přepsat, aniž by bylo nutné vypnout automatické rozpoznávání prostředí jako celek.

#note[Placeholder: Zde bude uvedena ukázka deklarativního přepsání parametrů sestavení v novém schématu konfigurace přestavěného systému DarkFactory.]
]

== Orchestrace napříč poskytovateli

#struct-alert[
  *Orchestrační jádro v rekonstrukci*: Mechanismus předávání štafety, řízení kontextového okna a integrace klientských harnessů budou aktualizovány podle nového orchestračního enginu.
]

#draft[
Systém neváže na jednoho poskytovatele modelu. Úkol je popsán způsobem nezávislým
na rozhraní a předán prvnímu dostupnému poskytovateli; vyčerpá-li tento kvótu,
předá se tentýž úkol dalšímu v pořadí, místo aby se proces zastavil.

Tato vlastnost byla přímou reakcí na provozní zkušenost: zastavení celého procesu
kvůli vyčerpané kvótě jediného poskytovatele bylo nejčastější příčinou prostoje.

#note[Placeholder: Zde bude doplněn detailní popis nového modelu rotace, správy tokenů, bezpečnostního oddělení tajemství a bezeztrátové serializace kontextu po přestavbě systému.]
]

== Ověřování změn

#struct-alert[
  *Verifikační pipeline v rekonstrukci*: Způsob deterministického vyhodnocování integračních úloh a zpracování chybových stavů bude přizpůsoben nové architektuře.
]

#draft[
Každá změna musí projít požadovanými kontrolami. Ty jsou navrženy tak, aby vždy
skončily nějakým výsledkem — úloha, která se může „přeskočit“, by jinak
zablokovala slučování napořád, jak bylo vysvětleno v kapitole 2.

#note[Placeholder: Zde bude popsána nová podoba verifikačních úloh, cachování závislostí a automatického reportování incidentů po přestavbě systému.]
]

== Projektová automatizace a správa nastavení jako kód

#struct-alert[
  *Projektová automatizace v rekonstrukci*: Nástroje pro synchronizaci GitHub Projects, nastavení repozitáře a ochranu větví procházejí rekonstrukcí.
]

#draft[
Automatizace repozitáře zajišťuje auditovatelnost a konzistentní správu projektových pravidel bez nutnosti manuálních zásahů v rozhraní platformy.

#note[Placeholder: Zde bude popsána nová implementace projektové synchronizace a správy repozitářových pravidel jako kód v přestavěném systému DarkFactory.]
]

== Automaticky generovaná dokumentace

#struct-alert[
  *Dokumentační subsystém v rekonstrukci*: Generování a validace živé dokumentace budou přizpůsobeny novému rozhraní systému DarkFactory.
]

#draft[
V moderním softwarovém vývoji představuje manuální údržba dokumentace permanentní zdroj chyb a desynchronizace: jakmile se kód vyvíjí rychleji než textové popisy, dokumentace se nevyhnutelně stává zastaralou a nespolehlivou. Systém DarkFactory proto prosazuje striktní princip stoprocentního odvozování veškeré projektové a API dokumentace přímo ze zdrojového kódu a strukturovaných inline komentářů (tzv. _living documentation_).

#note[Placeholder: Zde bude doplněno nové procesní schéma a popis generování a striktní validace živé dokumentace v CI pipeline.]
]

== Systém revizních značek pro lidský dohled nad akademickým textem

#draft[
Při rozšiřování systému DarkFactory na tvorbu a revizi akademických a odborných textů (doména textu) vyvstala potřeba formalizovat spolupráci člověka a autonomního agenta přímo v sazebním formátu Typst. Výsledkem je protokol vizuálních revizních značek (*Review Markers*) a textových revizních funkcí, který barevně a sémanticky rozlišuje stav zpracování jednotlivých pasáží:
]

#note[Konstruktivní doporučení, nápady na rozšíření, doplnění schémat či návrhy na praktické propojení. Po zapracování se panel smaže.]

#issue[Detekované věcné nepřesnosti, logické mezery, překlepy nebo duplicita obsahu. Značka přesně formuluje vadu a zaniká s jejím odstraněním.]

#alert[Upozornění na hloubkovou nevyváženost kapitol, chybějící dekompozice komponent či nesoulad s osnovou práce.]

#critique[Hloubková teoretická a architektonická oponentura bez servítků — odhalování slepých míst, neověřených předpokladů, bezpečnostních rizik a metodologických slabin formulovaných jako břitké otázky k obhajobě.]

#draft[
V toku textu se uplatňují tyto zvýrazňovací a srovnávací funkce:
]

- #draft[Žluté zvýraznění (`#draft[...]` / `#unconfirmed[...]`): Označuje neověřený text konceptu čekající na autorské posouzení a revizi.]
- #added[Zelené zvýraznění (`#added[...]`): Označuje nově přidaný text vygenerovaný autonomním agentem na základě požadavku či doporučení.]
- #confirmed[Modré zvýraznění (`#confirmed[...]`): Označuje text potvrzený uživatelem, který dosud neprošel finální integrací.]
- #removed[Červené zvýraznění s přeškrtnutím (`#removed[...]`): Označuje text navržený k odstranění z rukopisu.]
- #diff[Původní nahrazovaný text][Srovnávací diff (`#diff(old, new)`): Zobrazuje původní text přeškrtnutý v červené barvě následovaný novým textem v zelené barvě.]
- Čistý neoznačený text představuje finální, autorsky schválený a přijatý text v hlase autora (v rozpracovaném stavu konceptu jsou veškeré dosud neuzavřené pasáže zviditelněny revizními funkcemi).

#draft[
Tento protokol umožňuje autonomnímu agentovi navrhovat změny s transparentním vyznačením míry jistoty a člověku poskytuje okamžitou vizuální kontrolu nad tím, které části rukopisu již prošly lidskou redakcí a které ještě čekají na posouzení.
]
