#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Praktická část

== Cíl a rozsah systému DarkFactory

#unconfirmed[
Praktickou částí práce je systém *DarkFactory* — agentní harness instalovatelný jako aplikace pro platformu GitHub (GitHub App). Cílem systému je v maximální možné míře automatizovat rutinní fáze softwarového vývoje: od příjmu a sémantické analýzy požadavku v GitHub Issues, přes technické plánování a generování zdrojového kódu, až po spuštění validačních testů a vystavení pull requestu.

Ačkoliv systém usiluje o co nejvyšší míru automatizace, v reálném inženýrském provozu jej nelze označit za plně autonomní. Jazykové modely jsou stochastické systémy, které nemohou nést konečnou architektonickou odpovědnost ani garantovat stoprocentní bezchybnost výstupu. DarkFactory proto funguje v kooperativním režimu s člověkem (_Human-in-the-loop_), kde je volnost agenta striktně ohraničena bezpečnostními mantinely řídicího harnessu a klíčové přechody podléhají explicitnímu schválení člověkem. Zdrojový kód systému je veřejně dostupný @darkfactory.

Systém má převzít kognitivně rutinní a mechanické kroky vývojového procesu: strukturovanou interpretaci zadání, návrh technické dekompozice, implementaci v kódu a opravu regresí detekovaných testy. Nemá nahradit lidské rozhodování o tom, co a proč se má stavět; tato role zůstává člověku a harness je záměrně koncipován tak, aby si lidskou autorizaci vyžádal dříve, než provede zásadní či nevratné změny v repozitáři.
]

== Architektura a životní cyklus požadavku

#struct-alert[
  *Architektura a životní cyklus v rekonstrukci*: Vzhledem k probíhající zásadní přestavbě systému DarkFactory byla dosavadní implementační dekompozice modulů, stavový automat životního cyklu a konfigurační model dočasně nahrazeny zástupnými strukturálními bloky. Nová architektura, komponentní diagram a specifikace rozhraní budou doplněny po stabilizaci nové verze.
]

#unconfirmed[
Systém DarkFactory je navržen jako modulární stavebnice složená z řídicích orchestračních modulů, sdílených šablon pracovních postupů pro kontinuální integraci a hermetického#footnote(numbering: "*")[Pojem *hermetické prostředí* (angl. _hermetic environment_) označuje v softwarovém inženýrství takové výpočetní a běhové prostředí, které je zcela izolované od nekontrolovaných stavů hostitelského operačního systému a okolní sítě. Veškeré nástroje, knihovny a systémové závislosti jsou v něm explicitně deklarovány a uzamčeny na konkrétních verzích, což zaručuje absolutní determinismus a reprodukovatelnost: proces spuštěný v hermetickém kontejneru skončí vždy identickým výsledkem bez ohledu na to, kde a kdy byl vyvolán.] běhového prostředí. Architektura striktně odděluje deklarativní konfiguraci konkrétního repozitáře od samotné logiky orchestrace.

Životní cyklus požadavku formalizuje přechody mezi stavy v orientovaném acyklickém grafu (DAG) od zadání úkolu v GitHub Issues přes plánování, implementaci, automatické testování až po vystavení pull requestu a sloučení do hlavní větve.

Aby systém věděl, které validační a orchestrační úlohy má v repozitáři spustit, provádí automatickou detekci technologie na základě přítomnosti konfiguračních souborů balíčků:
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
Rozlišení dvou úrovní se ukázalo jako nutné v průběhu vývoje: _prostředí_ určuje, jaké konkrétní binární nástroje jsou vyžadovány (např. Python vs. Rust), zatímco _doména_ specifikuje způsob řízení výstupu (např. kompilace a testy v doméně kódu oproti sazbě a generování PDF v doméně textu). Toto rozlišení umožňuje obsloužit repozitář kombinující programový kód se sazební dokumentací. Konfigurační manifest navíc umožňuje automaticky detekované parametry deklarativně přepsat či doplnit (např. o specifické cesty k písmům).
]

#note[Placeholder: Zde bude doplněna nová vrstevnatá dekompozice přestavěného systému DarkFactory, stavový diagram životního cyklu požadavku a deklarativní schéma konfiguračního manifestu.]

== Orchestrační jádro a validační infrastruktura

#struct-alert[
  *Orchestrace a validační subsystém v rekonstrukci*: Mechanismus rotace poskytovatelů LLM, správa tokenů, verifikační pipeline a správa nastavení jako kód procházejí rekonstrukcí podle nového orchestračního enginu DarkFactory.
]

#unconfirmed[
Orchestrační jádro systému řeší čtyři klíčové provozní výzvy autonomního běhu:
- *Orchestrace napříč poskytovateli a rotace modelů*: Systém neváže vývoj na jediné komerční rozhraní. Úkoly jsou popsány nezávisle na formátu konkrétního poskytovatele. Pokud primární model vyčerpá kvótu nebo je nedostupný, harness automaticky předá stav navazujícímu modelu v rotačním žebříčku, což eliminuje prostoje pipeline způsobené limity API.
- *Deterministické ověřování změn*: Každá změna podléhá požadovaným kontrolám v CI pipeline. Úlohy jsou navrženy tak, aby vždy deterministicky skončily explicitním výstupem a zamezily permanentnímu zablokování větve v důsledku přeskočených kontrol.
- *Projektová automatizace a správa nastavení jako kód*: Veškeré nastavení repozitáře, pravidla ochrany větví i projektové nástěnky (GitHub Projects) jsou spravovány deklarativně, což zaručuje plnou auditovatelnost a reprodukovatelnost konfigurace.
- *Automaticky odvozovaná živá dokumentace (_Living Documentation_)*: V moderním softwarovém vývoji představuje manuální údržba dokumentace trvalý zdroj desynchronizace. DarkFactory proto prosazuje odvozování veškeré dokumentace a specifikací přímo ze zdrojového kódu a strukturovaných inline komentářů s automatickou validací v CI.
]

#note[Placeholder: Zde bude doplněn detailní popis nového modelu rotace poskytovatelů, správy tokenových rozpočtů, cachování závislostí a generování živé dokumentace po dokončení přestavby.]

== Systém revizních značek pro lidský dohled nad akademickým textem

#unconfirmed[
Při rozšiřování systému DarkFactory na tvorbu a revizi odborných textů (doména textu) vyvstala potřeba formalizovat spolupráci člověka a agenta přímo v sazebním formátu Typst. Výsledkem je protokol vizuálních revizních značek (*Review Markers*) a textových revizních funkcí, který barevně a sémanticky rozlišuje stav zpracování jednotlivých pasáží:
]

#note[Konstruktivní doporučení, nápady na rozšíření, doplnění schémat či návrhy na praktické propojení. Po zapracování se panel smaže.]

#issue[Detekované věcné nepřesnosti, logické mezery, překlepy nebo duplicita obsahu. Značka přesně formuluje vadu a zaniká s jejím odstraněním.]

#alert[Upozornění na hloubkovou nevyváženost kapitol, chybějící dekompozice komponent či nesoulad s osnovou práce.]

#critique[Hloubková teoretická a architektonická oponentura bez servítků — odhalování slepých míst, neověřených předpokladů, bezpečnostních rizik a metodologických slabin formulovaných jako břitké otázky k obhajobě.]

#blue-note[Metodické vymezení a rozsah práce — formulace hranic zkoumaného problému, metodická abstrakce (např. oddělení agentního inženýrství od strojového učení) a mantinely zadání.]

#unconfirmed[
V toku textu se uplatňují tyto zvýrazňovací a srovnávací funkce:
- *Neověřený koncept (`#draft[...]` / `#unconfirmed[...]`)*: Označuje neověřený text konceptu čekající na autorské posouzení a revizi.
- *Nově přidaný text (`#added[...]`)*: Označuje nově přidaný text vygenerovaný autonomním agentem na základě požadavku či doporučení.
- *Potvrzený text (`#confirmed[...]`)*: Označuje text potvrzený uživatelem, který dosud neprošel finální integrací.
- *Navrženo k odstranění (`#removed[...]`)*: Označuje text navržený k odstranění z rukopisu.
- *Srovnávací diff (`#diff(old, new)`)*: Zobrazuje původní text přeškrtnutý v červené barvě následovaný novým textem v zelené barvě.
- *Čistý neoznačený text*: Představuje finální, autorsky schválený a přijatý text v hlase autora.

Tento protokol umožňuje autonomnímu agentovi navrhovat změny s transparentním vyznačením míry jistoty a člověku poskytuje okamžitou vizuální kontrolu nad tím, které části rukopisu již prošly lidskou redakcí a které ještě čekají na posouzení.
]
