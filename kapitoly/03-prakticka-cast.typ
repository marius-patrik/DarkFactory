#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= #confirmed[Praktická část]

#unconfirmed[
== Cíl a rozsah systému DarkFactory

Praktickým ztělesněním teoretických principů zkoumaných v této práci je systém *DarkFactory* @darkfactory. Jedná se o agentní řídicí harness navržený jako aplikace pro platformu GitHub (GitHub App), který rozšiřuje standardní vývojářské prostředí o schopnost autonomního odbavování softwarových úkolů.

Hlavním cílem systému je maximalizace automatizace rutinních a mechanických fází vývojového cyklu:
- *Sémantická analýza zadání*: Interpretace textového popisu problému z GitHub Issues a extrakce omezujících podmínek.
- *Technické plánování*: Průzkum dotčených souborů repozitáře a návrh postupu implementace.
- *Generování a úprava kódu*: Provádění konkrétních změn v souborovém systému v izolované větvi.
- *Běh testů a samooprava*: Spouštění validačních kontrol a iterativní náprava detekovaných syntaktických regresí.
- *Vystavení pull requestu*: Otevření strukturovaného návrhu změn s vygenerovaným diffem a souhrnem.

Systém záměrně neusiluje o nekritickou plnou autonomii. Vzhledem ke stochastické povaze jazykových modelů DarkFactory staví na kooperativním modelu se zapojením člověka (_Human-in-the-loop_). Role jsou striktně rozděleny: autonomní agent obstarává kognitivně rutinní činnosti (navigaci v kódu, tvorbu dílčích funkcí a opravy chyb z testů), zatímco lidský inženýr si ponechává výhradní kontrolu nad architektonickým záměrem, schvalováním plánů a finální sémantickou revizí v pull requestu.
]

#critique[
  *Bezpečnostní perimetr aplikace GitHub App:*
  Architektura DarkFactory staví na instalaci jako GitHub App s právy zápisu do repozitáře a správy pull requestů. Pro podnikové nasazení to představuje zásadní vektor útoku: pokud model podlehne nepřímému prompt injection útoku (např. ze zlomyslného komentáře v issue či neznámého balíčku), získává přístup k interním tokenům repozitáře. Při obhajobě je nutné explicitně vymezit, jak harness izoluje tajnosti repozitáře, omezuje síťový provoz sandboxu a vynucuje princip nejmenších oprávnění (_least privilege_).
]

#unconfirmed[
== Architektura a životní cyklus požadavku

#struct-alert[
  *Architektura a životní cyklus v rekonstrukci*: Vzhledem k probíhající zásadní přestavbě systému DarkFactory byla dosavadní implementační dekompozice modulů, stavový automat životního cyklu a konfigurační model dočasně nahrazeny zástupnými strukturálními bloky. Nová architektura, komponentní diagram a specifikace rozhraní budou doplněny po stabilizaci nové verze.
]

Architektura systému DarkFactory vychází ze striktního oddělení sdílené orchestrační logiky od specifické konfigurace jednotlivých klientských repozitářů. Veškeré výpočetní operace probíhají v hermetickém běhovém prostředí#footnote(numbering: "*")[Pojem *hermetické prostředí* označuje výpočetní prostředí zcela izolované od nekontrolovaných stavů hostitelského systému a sítě. Veškeré nástroje, knihovny a závislosti jsou explicitně uzamčeny na konkrétních verzích, což zaručuje determinismus a reprodukovatelnost.], což zaručuje reprodukovatelnost výsledků nezávisle na okolním stavu.

Životní cyklus zpracování každého požadavku je formalizován jako stavový automat (orientovaný acyklický graf), který provádí požadavek následujícími fázemi:
- *1. Příjem zadání*: Detekce nového nebo aktualizovaného úkolu v GitHub Issues.
- *2. Technické plánování*: Průzkum repozitáře a sestavení dekompozice změn.
- *3. Lidská schvalovací brána 1*: Pozastavení běhu a autorizace navrženého plánu vývojářem.
- *4. Autonomní implementace*: Editace souborů a úprava kódu v dedikované větvi.
- *5. Validační pipeline*: Běh automatických testů v CI s možností automatické samoopravy chyb.
- *6. Vystavení PR*: Otevření pull requestu s vygenerovaným popisem a řádkovým diffem.
- *7. Lidská schvalovací brána 2*: Finální kontrola a schválení člověkem.
- *8. Integrace*: Automatické sloučení do hlavní větve metodou _Squash and Merge_.

Pro zajištění univerzální použitelnosti systém implementuje dvouúrovňovou detekci projektů:
- *Prostředí (_Environment_)*: Určuje vyžadované binární nástroje a balíčkovací manažery podle detekovaných souborů (viz @tab-prostredi).
- *Doména (_Domain_)*: Určuje způsob řízení výstupů (doména programového kódu vs. textová sazba a dokumentace).

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

Všechny automaticky rozpoznané parametry lze v klientském repozitáři deklarativně přepsat nebo rozšířit pomocí konfiguračního manifestu (např. o explicitní cesty k písmům nebo dodatečné integrační kontroly).
]

#note[Placeholder: Zde bude doplněna nová vrstevnatá dekompozice přestavěného systému DarkFactory, stavový diagram životního cyklu požadavku a deklarativní schéma konfiguračního manifestu.]

#unconfirmed[
== Orchestrační jádro a validační infrastruktura

#struct-alert[
  *Orchestrace a validační subsystém v rekonstrukci*: Mechanismus rotace poskytovatelů LLM, správa tokenů, verifikační pipeline a správa nastavení jako kód procházejí rekonstrukcí podle nového orchestračního enginu DarkFactory.
]

Výkonné jádro orchestrátoru zajišťuje koordinaci mezi klientským repozitářem, jazykovými modely a validační infrastrukturou. Spolehlivost a odolnost systému v nepřetržitém provozu garantují následující operační mechanismy:

- *Rotace poskytovatelů LLM*: Úkoly jsou definovány nezávisle na formátu konkrétního poskytovatele. Při vyčerpání kvóty nebo výpadku API primárního modelu harness automaticky přepne na navazující model v rotačním žebříčku, což eliminuje prostoje pipeline.
- *Deterministické ověřování změn*: Každý zásah do kódu podléhá požadovaným kontrolám v CI. Úlohy končí explicitním stavem, čímž brání zablokování větve v důsledku přeskočených kontrol.
- *Správa nastavení jako kód (_Config as Code_)*: Pravidla ochrany větví, konfigurace linterů i projektové nástěnky (GitHub Projects) jsou definovány deklarativně a podléhají verzování v gitu.
- *Automaticky odvozovaná živá dokumentace (_Living Documentation_)*: Dokumentace a specifikace jsou generovány přímo ze zdrojového kódu a strukturovaných inline komentářů s automatickou validací v CI.
]

#critique[
  *Asymetrie formátů a ztráta kontextu při rotaci poskytovatelů:*
  Rotace modelů různých poskytovatelů (např. přepnutí z Claude na GPT či DeepSeek při vyčerpání kvóty) naráží na zásadní odlišnosti v tokenizérech, syntaxi nástrojů (XML vs. JSON schemas) a vnímání systémového promptu. Při náhlém předání kontextu hrozí ztráta návaznosti v rozpracovaném plánu. Text musí vysvětlit přítomnost normalizační vrstvy (provider adapter), která udržuje historii tahů a výpisy nástrojů v neutrální kanonické reprezentaci.
]

#note[Placeholder: Zde bude doplněn detailní popis nového modelu rotace poskytovatelů, správy tokenových rozpočtů, cachování závislostí a generování živé dokumentace po dokončení přestavby.]


