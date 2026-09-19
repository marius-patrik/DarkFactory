#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Praktická část

== Cíl a rozsah systému DarkFactory

#unconfirmed[
- *Systém DarkFactory* @darkfactory: Agentní harness instalovatelný jako aplikace pro platformu GitHub (GitHub App).
- *Cíl systému*: Maximalizace automatizace rutinních fází softwarového inženýrství:
  - Sémantická analýza požadavků v GitHub Issues.
  - Technické plánování a dekompozice úlohy.
  - Generování a úprava zdrojového kódu.
  - Běh validačních testů a automatické opravy chyb.
  - Otevření strukturovaného pull requestu.
- *Míra autonomie*: Kooperativní model se zapojením člověka (_Human-in-the-loop_). Vzhledem ke stochastické povaze LLM nelze systém označit za plně autonomní; modely nemohou nést konečnou architektonickou odpovědnost.
- *Dělba rolí*:
  - *Autonomní agent*: Kognitivně rutinní a mechanické operace (průzkum souborů, syntéza kódu, řešení syntaktických regresí, běh testů).
  - *Lidský inženýr*: Vymezení záměru (co a proč stavět), schvalování technických plánů a finální sémantická kontrola kódu v PR.
]

== Architektura a životní cyklus požadavku

#struct-alert[
  *Architektura a životní cyklus v rekonstrukci*: Vzhledem k probíhající zásadní přestavbě systému DarkFactory byla dosavadní implementační dekompozice modulů, stavový automat životního cyklu a konfigurační model dočasně nahrazeny zástupnými strukturálními bloky. Nová architektura, komponentní diagram a specifikace rozhraní budou doplněny po stabilizaci nové verze.
]

#unconfirmed[
- *Architektonická modularita*: Striktní oddělení deklarativního konfiguračního manifestu klientského repozitáře od sdílené orchestrační logiky.
- *Hermetické běhové prostředí*#footnote(numbering: "*")[Pojem *hermetické prostředí* označuje výpočetní prostředí zcela izolované od nekontrolovaných stavů hostitelského systému a sítě. Veškeré nástroje, knihovny a závislosti jsou explicitně uzamčeny na konkrétních verzích, což zaručuje determinismus a reprodukovatelnost.]: Izolovaný běh úloh v kontejnerech se zamčenými verzemi závislostí a nástrojů.
- *Životní cyklus požadavku (Stavový automat / DAG)*:
  - *1. Příjem*: Detekce nového zadání v GitHub Issues.
  - *2. Plánování*: Analýza kódu a návrh kroků implementace.
  - *3. Lidská brána 1*: Schválení plánu vývojářem.
  - *4. Implementace*: Autonomní editace souborů v izolované větvi.
  - *5. Validace*: Běh testů a kontrol v CI s automatickou samoopravou chyb.
  - *6. Vystavení PR*: Otevření pull requestu s popisem a diffem.
  - *7. Lidská brána 2*: Finální kontrola a schválení člověkem.
  - *8. Integrace*: Automatické sloučení do hlavní větve (_squash and merge_).
- *Dvouúrovňová detekce projektů*:
  - *Prostředí (_Environment_)*: Určuje vyžadované binární nástroje a balíčkovací manažery podle detekovaných souborů (viz @tab-prostredi).
  - *Doména (_Domain_)*: Určuje způsob řízení výstupů (doména programového kódu vs. textová sazba a dokumentace).
]

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

#unconfirmed[
- *Deklarativní manifest*: Umožňuje automaticky detekované parametry deklarativně přepsat či rozšířit (např. o explicitní cesty k písmům nebo dodatečné integrační kontroly).
]

#note[Placeholder: Zde bude doplněna nová vrstevnatá dekompozice přestavěného systému DarkFactory, stavový diagram životního cyklu požadavku a deklarativní schéma konfiguračního manifestu.]

== Orchestrační jádro a validační infrastruktura

#struct-alert[
  *Orchestrace a validační subsystém v rekonstrukci*: Mechanismus rotace poskytovatelů LLM, správa tokenů, verifikační pipeline a správa nastavení jako kód procházejí rekonstrukcí podle nového orchestračního enginu DarkFactory.
]

#unconfirmed[
Klíčové operační mechanismy orchestračního jádra:

- *Rotace poskytovatelů LLM*: Úkoly jsou definovány nezávisle na formátu konkrétního poskytovatele. Při vyčerpání kvóty nebo výpadku API primárního modelu harness automaticky přepne na navazující model v rotačním žebříčku, což eliminuje prostoje pipeline.
- *Deterministické ověřování změn*: Každý zásah do kódu podléhá požadovaným kontrolám v CI. Úlohy končí explicitním stavem, čímž brání zablokování větve v důsledku přeskočených kontrol.
- *Správa nastavení jako kód (_Config as Code_)*: Pravidla ochrany větví, konfigurace linterů i projektové nástěnky (GitHub Projects) jsou definovány deklarativně a podléhají verzování v gitu.
- *Automaticky odvozovaná živá dokumentace (_Living Documentation_)*: Dokumentace a specifikace jsou generovány přímo ze zdrojového kódu a strukturovaných inline komentářů s automatickou validací v CI.
]

#note[Placeholder: Zde bude doplněn detailní popis nového modelu rotace poskytovatelů, správy tokenových rozpočtů, cachování závislostí a generování živé dokumentace po dokončení přestavby.]

== Systém revizních značek pro lidský dohled nad akademickým textem

#unconfirmed[
Protokol vizuálních revizních značek pro formát Typst formalizuje dohled člověka nad generovaným textem:

*1. Postranní revizní panely (Callouty):*
- `#note[...]` (zelený): Konstruktivní náměty na vylepšení, doplnění diagramů a praktické vazby.
- `#issue[...]` (červený): Věcné nesrovnalosti, logické mezery, překlepy a duplicitní obsah.
- `#alert[...]` / `#struct-alert[...]` (žlutý): Strukturální nevyváženost, chybějící sekce a osnovové neshody.
- `#critique[...]` (oranžový): Hloubková oponentura, slepá místa, zpochybnění neověřených předpokladů k obhajobě.
- `#blue-note[...]` (modrý): Metodické vymezení, rozsah práce a konceptuální mantinely zadání.
]

#note[Konstruktivní doporučení, nápady na rozšíření, doplnění schémat či návrhy na praktické propojení. Po zapracování se panel smaže.]

#issue[Detekované věcné nepřesnosti, logické mezery, překlepy nebo duplicita obsahu. Značka přesně formuluje vadu a zaniká s jejím odstraněním.]

#alert[Upozornění na hloubkovou nevyváženost kapitol, chybějící dekompozice komponent či nesoulad s osnovou práce.]

#critique[Hloubková teoretická a architektonická oponentura bez servítků — odhalování slepých míst, neověřených předpokladů, bezpečnostních rizik a metodologických slabin formulovaných jako břitké otázky k obhajobě.]

#blue-note[Metodické vymezení a rozsah práce — formulace hranic zkoumaného problému, metodická abstrakce (např. oddělení agentního inženýrství od strojového učení) a mantinely zadání.]

#unconfirmed[
*2. Textové revizní funkce v toku textu:*
- *Neověřený koncept (`#draft[...]` / `#unconfirmed[...]`)*: Žluté podbarvení — koncept čekající na posouzení a revizi autorem.
- *Nově přidaný text (`#added[...]`)*: Zelené podbarvení — nově vygenerovaný text začleněný agentem.
- *Potvrzený text (`#confirmed[...]`)*: Modré podbarvení — text potvrzený uživatelem, čekající na finální integraci.
- *Navrženo k odstranění (`#removed[...]`)*: Červené přeškrtnutí — zastaralý text navržený ke smazání.
- *Srovnávací diff (`#diff(old, new)`)*: Červený původní text přeškrtnutý následovaný zeleným novým textem.
- *Čistý neoznačený text*: Finální, autorsky schválený text v hlase autora bez podbarvení.
]
