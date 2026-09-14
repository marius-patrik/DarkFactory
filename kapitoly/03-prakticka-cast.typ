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

#draft[
Systém DarkFactory je navržen jako modulární stavebnice složená z řídicích skriptů v jazyce Python, šablon pracovních postupů pro GitHub Actions a hermetického#footnote(numbering: "*")[Pojem *hermetické prostředí* (angl. _hermetic environment_) označuje v softwarovém inženýrství takové výpočetní a běhové prostředí, které je zcela izolované od nekontrolovaných stavů hostitelského operačního systému a okolní sítě. Veškeré nástroje, knihovny a systémové závislosti jsou v něm explicitně deklarovány a uzamčeny na konkrétních verzích, což zaručuje absolutní determinismus a reprodukovatelnost: proces spuštěný v hermetickém kontejneru skončí vždy identickým výsledkem bez ohledu na to, kde a kdy byl vyvolán.] kontejnerového prostředí. Architektura striktně odděluje deklarativní konfiguraci konkrétního repozitáře od samotné logiky orchestrace.
]

#figure(
  image("../img/components-darkfactory.svg", width: 100%),
  caption: [Dekompozice komponent systému DarkFactory: třívrstvá architektura propojující platformu GitHub, výkonné skriptové jádro a izolované běhové prostředí s modely.],
) <fig-komponenty>

#draft[
Celý systém je dekomponován do tří funkčních vrstev znázorněných na @fig-komponenty:

1. *Vrstva deklarace a platformy GitHub*: Zahrnuje centrální konfigurační manifest `.github/darkfactory.json` jako jediný zdroj pravdy pro daný repozitář, rozhraní GitHub Issues pro zadávání požadavků v doslovném znění a projektovou nástěnku GitHub Projects v2, která vizualizuje stav pipeline napříč všemi zapojenými repozitáři v sedmi striktních stavech (od _Backlog_ po _Done_).
2. *Výkonné jádro pipeline (`.github/scripts/`)*: Tvoří jej sada úzce spolupracujících skriptů v jazyce Python. Klíčovým prvkem je `agent_runner.py` jako hlavní stavový automat řídící životní cyklus požadavku a checkpointing. Doplňuje jej `harnesses.py` pro sjednocení rozhraní různých modelů (Antigravity, Claude Code, Codex, Kimi, Grok, Cursor, Opencode) a víceúčtovou rotaci kvót, `project_automation.py` pro inkrementální synchronizaci stavů přes GraphQL, `repo_settings.py` pro deklarativní správu GitHub metadat a pravidel, `docs_hooks.py` pro virtualizaci dokumentace a skripty `open_pr.py` spolu s `handle_pr_approval.py` zajišťující automatické vystavení pull requestu botem a bezpečný squash-merge po lidském schválení.
3. *Izolované běhové prostředí a nástroje*: Zahrnuje hermetický kontejnerový sandbox (`docker/Dockerfile.agent`), který izoluje běh agenta od hostitelského CI runneru. Z bezpečnostních důvodů agent běží pod neprivilegovaným uživatelem `USER agent` s UID 1001, což přesně odpovídá uživatelskému ID v hostitelském běhovém prostředí GitHub Actions; připojený pracovní adresář (bind mount) tak zůstává plně zapisovatelný bez nutnosti nebezpečného uvolňování souborových oprávnění či spouštění agenta s právy uživatele `root`.
]

=== Sdílení místo kopírování

#draft[
Pracovní postupy jsou v systému DarkFactory striktně _volané_ (`workflow_call`), nikoli kopírované. Klientský repozitář, který systém využívá (např. `OdbornaPrace-paper` či `ChessWithQuests`), obsahuje pouze tenký deklarativní soubor workflow odkazující na centrální sdílený postup v mateřském repozitáři DarkFactory, jak ukazuje @kod-volane-workflow.
]

#figure(
  ```yaml
  name: CI

  on:
    push:
      branches: [main]
    pull_request:
    workflow_dispatch:

  permissions:
    contents: read

  jobs:
    ci:
      uses: marius-patrik/DarkFactory/.github/workflows/ci.yml@7ecba1617f553e6a34ceb31177e1ac84d08c350f
      with:
        pipeline-repo: marius-patrik/DarkFactory
        pipeline-ref: "7ecba1617f553e6a34ceb31177e1ac84d08c350f"
      secrets: inherit
  ```,
  caption: [Ukázka volajícího workflow v klientském repozitáři odkazujícího na centrální sdílený postup v DarkFactory s připnutým kryptografickým SHA commitem.],
) <kod-volane-workflow>

#added[
Kryptografické připnutí k SHA hashi commitu (např. `@7ecba161...`) má zásadní stabilitní význam: bez něj by se jakákoli neotestovaná úprava v centrálním repozitáři okamžitě promítla do všech spotřebitelských projektů současně. Díky připnutí je spotřeba workflow plně pod kontrolou správce klientského repozitáře a aktualizace probíhá bezpečným posunem commitu přes standardní pull request. Direktiva `secrets: inherit` současně zajišťuje bezpečné předání potřebných autentizačních tokenů bez nutnosti jejich explicitního vypisování.
]

=== Jediný konfigurační soubor

#confirmed[
Vše, co se mezi repozitáři liší, je soustředěno do jediného konfiguračního manifestu
`.github/darkfactory.json`. Ten deklarativně popisuje totožnost repozitáře, jeho doménové oblasti, nástěnky,
na které patří jeho úkoly, a případné odchylky od výchozího chování. Sdílený
postup je díky tomu ve všech repozitářích shodný bajt po bajtu.
]

#figure(
  ```json
  {
    "identity": {
      "owner": "marius-patrik",
      "repo": "DarkFactory",
      "default_branch": "darkfactory"
    },
    "upstream": {
      "repo": null,
      "ref": null
    },
    "versioning": {
      "mode": "semver",
      "tag_prefix": "v",
      "initial": "0.1.0"
    },
    "areas": {
      "$default": "ci",
      "agents": {
        "description": "Orchestration, personas, adapters",
        "keywords": ["agent", "harness", "persona", "prompt"]
      },
      "governance": {
        "description": "Branch protection, required checks",
        "keywords": ["governance", "rule", "protection", "board"]
      },
      "ci": {
        "description": "GitHub Actions workflows, runner scripts",
        "keywords": ["ci", "action", "workflow", "docker"]
      }
    },
    "board": {
      "global_title": "Global",
      "link_boards": ["Global", "DarkFactory", "OdbornaPrace", "ChessWithQuests"]
    }
  }
  ```,
  caption: [Ukázka konfigurace v manifestu `.github/darkfactory.json` vymezující identitu repozitáře, doménové oblasti (`areas`) a propojení s projektovými nástěnkami.],
) <kod-darkfactory-json>

#draft[
Jak je patrné z @kod-darkfactory-json, sekce `areas` slouží jako jednotný zdroj pravdy pro štítkování úkolů i směrování agentů podle shody klíčových slov. Sekce `board` pak zajišťuje agregaci do globální i repozitářové GitHub Projects nástěnky bez nutnosti manuální konfigurace v samotných workflow. V klientských projektech sekce `upstream` navíc explicitně deklaruje vazbu na mateřský repozitář a připnutou revizi.
]

== Životní cyklus požadavku

#draft[
Životní cyklus požadavku v systému DarkFactory je formalizován do sedmi exekučních fází oddělených striktními schvalovacími branami pro udržení deterministického lidského dohledu nad rozsahem i kvalitou implementace.
]

#figure(
  image("../img/lifecycle-darkfactory.svg", width: 100%),
  caption: [Stavový diagram životního cyklu požadavku v systému DarkFactory: přechody mezi stavy od založení issue přes schvalovací brány (Human Gates), tvorbu větve a PR až po automatické sloučení a uzavření úkolu.],
) <fig-zivotni-cyklus>

#added[
Procesní topologie sestává z těchto na sebe navazujících kroků:

1. *Zadání úkolu*: Uživatel založí požadavek v GitHub Issues s doslovným zněním zadání. Doslovné znění je zachováno záměrně, aby nedocházelo k informačním ztrátám způsobeným unáhlenou parafrází.
2. *Fáze 1: Interpretace (`interpreted`)*: Agent analyzuje zadání, extrahuje sémantické cíle, identifikuje dotčené komponenty a publikuje své porozumění požadavku v komentáři.
3. *Human Gate 1 (Schválení záměru)*: Správce repozitáře ověří rozsah interpretace a schválí jej vložením komentáře `approve`. Bez tohoto potvrzení se plánování nespustí.
4. *Fáze 2: Plánování (`planned`)*: Po schválení záměru agent vygeneruje podřízený úkol s detailním technickým plánem kroků, architektonickými dopady a seznamem souborů.
5. *Human Gate 2 (Schválení plánu)*: Správce schválí technický plán (`approve`). Tím je garantováno, že agent nezasáhne do kódu s chybnou architektonickou představou.
6. *Fáze 3: Implementace*: Runner vytvoří izolovanou větev (`branch created`), připraví hermetický kontejner a agent provede úpravy kódu a doplnění testů.
7. *Fáze 4: Smyčka samooprav (Self-Review Loop)*: Agent autonomně spustí lokální testy, lintery a statické kontroly; při detekci chyb provede korekční iterace v rámci přiděleného rozpočtu kroků.
8. *Fáze 5: Ověření shody s plánem (Plan Alignment)*: Systém automaticky porovná vygenerovaný `git diff` vůči schválenému plánu z Fáze 2 a ověří, zda nedošlo k nežádoucímu posunu rozsahu.
9. *Fáze 6: Vystavení Pull Requestu (`PR open`)*: Bot `github-actions[bot]` vystaví pull request s klíčovým slovem `Closes #...` a spustí kompletní sadu integračních CI kontrol.
10. *Human Review Gate*: Správce zkontroluje finální pull request a odešle nativní GitHub PR Review se stavem `Approve`.
11. *Fáze 7: Auto-Merge a smíření stavu*: Po splnění povinných kontrol systém provede squash-merge do hlavní větve, smaže pracovní větev, posune stav položky na GitHub Projects na `Done` a uzavře původní issue.
]

#critique[Pochybná autonomie a paralýza lidským faktorem: Název „DarkFactory“ evokuje bezobslužnou továrnu (angl. _lights-out manufacturing_), která běží plně autonomně bez lidského zásahu. Zavedení tří synchronních schvalovacích bran (Human Gate 1: záměr, Human Gate 2: plán, Human Gate 3: PR) však z procesu činí silně blokující workflow. Pokud musí člověk manuálně schválit každou fázi drobného úkolu, tráví agent 95 % životního cyklu čekáním na lidskou reakci. Skutečná průchodnost systému je pak determinována latencí člověka, nikoli rychlostí modelů. Práce navíc ignoruje fenomén únavy ze schvalování (_review fatigue_), kdy člověk po desítkách syntetických notifikací rezignuje na důkladnou kontrolu a začne plány i diffy schvalovat mechanicky bez čtení.]

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

#added[
V případě matematické domény a prostředí Lean (reprezentovaného manifestem `lakefile.toml` v @tab-prostredi) se v aktuální implementaci jedná o deklarativní přípravu a taxonomické vymezení v subsystému `environment.py`. Plná integrace interaktivního dokazovače Lean 4 do CI kontejneru je plánována jako další směr rozvoje, neboť vyžaduje specifický toolchain `elan` a vysoké výpočetní nároky na strojovou verifikaci důkazů.
]

=== Deklarace jako doplněk rozpoznávání

#diff[Rozpoznávání nemůže vidět všechno. Repozitář této práce například přibaluje
vlastní písma, takže příkaz pro sazbu není výchozí. Konfigurační soubor proto
umožňuje výchozí chování přepsat, aniž by bylo nutné vypnout rozpoznávání jako
celek.][Rozpoznávání prostředí nemůže předvídat veškeré specifické požadavky projektu. Repozitář této práce například přibaluje vlastní sadu písem v podadresáři `fonts/`, takže příkaz pro sazbu vyžaduje dodatečný přepínač `--font-path fonts`. Konfigurační soubor `darkfactory.json` proto umožňuje výchozí parametry transparentně rozšířit nebo přepsat, aniž by bylo nutné vypnout automatické rozpoznávání prostředí jako celek:

#figure(
  ```json
  {
    "identity": { "name": "odborna-prace", "domain": "text" },
    "build": {
      "typst": {
        "entrypoint": "main.typ",
        "output": "out/main.pdf",
        "extra_args": ["--font-path", "fonts"]
      }
    }
  }
  ```,
  caption: [Ukázka deklarativního přepsání parametrů sestavení v manifestu `.github/darkfactory.json`.],
) <kod-extra-args>

Jak ukazuje @kod-extra-args, systém zkombinuje detekované prostředí s explicitní specifikací z manifestu. CI úloha tak automaticky zkonstruuje přesný příkaz `typst compile --font-path fonts main.typ out/main.pdf` bez nutnosti manuálního zásahu do sdíleného kódu akce.]

== Orchestrace napříč poskytovateli

#draft[
Systém neváže na jednoho poskytovatele modelu. Úkol je popsán způsobem nezávislým
na rozhraní a předán prvnímu dostupnému poskytovateli; vyčerpá-li tento kvótu,
předá se tentýž úkol dalšímu v pořadí, místo aby se proces zastavil.

Tato vlastnost byla přímou reakcí na provozní zkušenost: zastavení celého procesu
kvůli vyčerpané kvótě jediného poskytovatele bylo nejčastější příčinou prostoje.

Mechanika předávání štafety (_baton handover_) probíhá zcela pod kontrolou nadřazeného procesu (`agent_runner`). Jakmile volající skript zachytí vyčerpání limitů (např. HTTP kód 429 nebo chybový stav `RESOURCE_EXHAUSTED`), okamžitě zmrazí aktuální běh a provede atomickou serializaci stavu:
+ *Pracovní strom v Gitu*: Veškeré rozpracované úpravy v souborovém systému jsou uloženy do pracovní větve a vytvoří se kontrolní otisk (`git diff`).
+ *Serializace kontextu a štafety*: Log konverzace (předchozí kroky, volání nástrojů i vrácená pozorování) je spolu s metadaty úkolu zapsán do strukturovaného kontrolního bodu (_checkpoint_ ve formátu JSON).
+ *Rotace po žebříčku kapacit*: Runner neponižuje model na slabší variantu v témže fondu (což by novou kapacitu nepřineslo), nýbrž rotuje účty, oddělené kvótové fondy (_quota pools_) nebo přepne na záložní CLI harness (např. Antigravity, Claude Code, Codex, Kimi, Grok, Cursor či Opencode).
+ *Rekonstituce a navázání*: Náhradní agent obdrží serializovanou štafetu, jeho adaptér přeloží historii kroků do nativního formátu nového poskytovatele a ověří stav repositáře. Běh plynule naváže v přesném bodě přerušení, aniž by došlo ke ztrátě dosavadní práce či kontextu.
]

#critique[Kritická slepá skvrna v heterogenní štafetě: Představa, že odlišný model (např. Claude po Antigravity či Codexu) plynule naváže na rozpracovanou práci pouhým načtením serializovaného logu a git diff, zamlčuje zásadní problém nekompatibility vnímání kontextu (_prompt sensitivity_). Každá modelová rodina vyžaduje diametrálně odlišný formát nástrojů, odlišně reaguje na systémový prompt a jinak interpretuje mezivýsledky. V reálném provozu vede synteticky přeložená historie často k okamžité dezorientaci nového modelu, opakování již hotových kroků nebo halucinaci neexistujících nástrojů. Práce neobsahuje žádné empirické vyhodnocení úspěšnosti štafety: Kolik úloh po předání štafety skutečně úspěšně doběhlo a v kolika procentech případů vedla rotace k havárii a divergenci kontextu?]

#added[
=== Bezpečnostní model správy tajemství a víceúrovňový kvótový žebříček

Rotace mezi různými účty a poskytovateli klade vysoké nároky na bezpečnostní architekturu. V systému DarkFactory je správa pověření implementována v subsystémech `credentials.py` a `harnesses.py` podle následujících zásad:

1. *Číslované účty a symetrická doprovodná tajemství*: Každý poskytovatel může disponovat více autorizovanými účty konfigurovanými jako GitHub Secrets s číselnou příponou (např. `ANTHROPIC_API_KEY`, `ANTHROPIC_API_KEY_2`, `GEMINI_API_KEY_2`). U nástrojů vyžadujících OAuth autorizaci jsou symetricky spravována i tzv. doprovodná tajemství (Companion Secrets — např. `CLAUDE_CLIENT_ID_2` a `CLAUDE_CLIENT_SECRET_2`). Přidání dalšího účtu tak vyžaduje pouze uložení tajného klíče v nastavení repozitáře bez zásahu do kódu pipeline.
2. *Izolace prostředí a aliasování (`credential_env`)*: Jednotlivé CLI nástroje očekávají výhradně kanonické, nečíslované názvy proměnných prostředí. Runner proto před spuštěním agenta nejprve vyčistí procesní prostředí od všech potenciálních autentizačních proměnných (čímž brání nechtěnému úniku nebo křížové kontaminaci) a následně do prostředí injektuje klíč aktivního účtu pod jeho kanonickým názvem. CLI harness tak operuje zcela transparentně bez vědomí o proběhlé rotaci účtu.
3. *Dynamické obnovování tokenů a persistence (`persist_rotated_token`)*: Poskytovatelé využívající OAuth s rotujícími obnovovacími tokeny při každém refreshnutí zneplatní předchozí token. Aby nedošlo ke zneplatnění přístupu v navazujících bězích, runner provede výměnu tokenu, aktualizuje běžící proces a nový obnovovací token automaticky zapíše zpět do GitHub Secrets repozitáře prostřednictvím GitHub API.
4. *Striktní hygiena kontrolních bodů*: Soubor kontrolního bodu (`.agent_runner_checkpoint.json`) ukládá výhradně stav Gitu, metadata úkolu a historii konverzace; jakékoli autentizační klíče a tokeny jsou ze serializace striktně vyloučeny a veškeré výstupy v CI podléhají nativnímu maskování GitHub Actions.
5. *Víceúrovňový kvótový žebříček*: Při vyčerpání limitů runner postupuje po striktně definovaných stupních:
   - _Rotace účtu_: Přepnutí na další číslovaný účet v rámci téhož harnessu a modelu (nejlevnější čerstvá kapacita).
   - _Rotace kvótového fondu_: Přepnutí na model účtovaný z odděleného fondu (např. v rámci Antigravity přepnutí mezi fondy Gemini a Claude).
   - _Harness fallback_: Přepnutí na další CLI harness v řetězci `AGENT_HARNESS_CHAIN` (Antigravity $arrow$ Claude Code $arrow$ Codex $arrow$ Kimi $arrow$ Grok $arrow$ Cursor $arrow$ Opencode).
   - _Exponenciální backoff s jitterem_: Zpoždění je vyhrazeno výhradně pro poslední pokus na posledním dostupném harnessu; čekání nastává teprve tehdy, když nezbývá žádná volná kapacita k rotaci.
   - _Čistý checkpointing_: Při úplném vyčerpání všech fondů pipeline uloží stav, přesune položku na projektové nástěnce do stavu `Blocked` a skončí s návratovým kódem 0. Po obnovení kvót stačí vložit komentář `resume` a agent plynule naváže v přesném bodě přerušení.
]

== Ověřování změn

#draft[
Každá změna musí projít požadovanými kontrolami. Ty jsou navrženy tak, aby vždy
skončily nějakým výsledkem — úloha, která se může „přeskočit“, by jinak
zablokovala slučování napořád, jak bylo vysvětleno v kapitole 2.

#figure(
  ```yaml
  paper:
    steps:
      - name: Detect the paper domain
        id: detect
      - name: Typeset with Typst
        if: steps.detect.outputs.typst == 'true'
      - name: No paper in this repository
        if: steps.detect.outputs.present != 'true'
        run: echo "nothing to typeset."
  ```,
  caption: [Zjednodušená úloha, která vždy skončí výsledkem.],
) <kod-uloha>

Struktura v @kod-uloha je pro celý systém typická: nejprve se zjistí, zda je
v repozitáři co dělat, a teprve pak se pracuje. Poslední krok zajišťuje, že úloha
skončí úspěchem i tam, kde není co ověřovat.
]

=== Optimalizace běhu a cachování závislostí

#added[
Pro udržení nízké latence vývojového cyklu a rychlou zpětnou vazbu agentovi využívá systém DarkFactory agresivní cachování balíčků a závislostí napříč jednotlivými integračními běhy. V rámci GitHub Actions se využívá mechanismus `actions/cache` provázaný s kryptografickým hashem souborů specifikujících uzamčené verze závislostí (např. `uv.lock`, `Cargo.lock` či `package-lock.json`).

Při opětovném spuštění CI workflow pro nově vytvořený commit se balíčky nestahují z externích registrů (PyPI, crates.io, npm), nýbrž se obnoví z lokální mezipaměti běžce během 2–4 sekund. U jazyka Python systém navíc standardně využívá maticové sestavení (`matrix.python-version: ["3.11", "3.12"]`), čímž je zaručena kompatibilita napříč podporovanými verzemi interpretu v paralelních úlohách bez lineárního prodloužení celkového času běhu.
]

=== Automatické hlášení a deduplikace selhání

#diff[Selhání kterékoli úlohy zakládá úkol s odkazem na neúspěšný běh. Opakované
selhání téže úlohy nezakládá další úkol, nýbrž doplní komentář ke stávajícímu;
bez toho by úloha selhávající při každé změně zahltila seznam úkolů. Jakmile
úloha znovu uspěje, úkol se sám uzavře.][Pokud kterákoli integrační či verifikační úloha v CI selže, systém automaticky vyvolá záchranné workflow `report-failure.yml`. To v klientském repozitáři založí nový incident ve formě GitHub Issue s detailním označením selhaného kroku a přímým odkazem na protokol neúspěšného běhu.

Zásadním prvkem architektury je inteligentní deduplikace incidentů: opakované selhání téže úlohy (např. při následném nepovedeném commitu) nezakládá nový redundantní úkol, nýbrž identifikuje stávající otevřený incident a pouze k němu připojí nový diagnostický komentář s aktuálním logem. Tím se spolehlivě zamezuje zahlcení projektové nástěnky desítkami duplicitních hlášení. Jakmile je chyba v kódu odstraněna a navazující běh úspěšně projde všemi kontrolami, systém otevřený incident v GitHub Issues automaticky uzavře s odkazem na opravný commit.]

== Projektová automatizace a správa nastavení jako kód

#added[
Pro spolehlivou koordinaci a auditovatelnost úkolů bez manuálního klikání v administračním rozhraní GitHubu obsahuje systém DarkFactory dva specializované subsystémy: `project_automation.py` a `repo_settings.py`.

=== Synchronizace GitHub Projects v2 a řízení GraphQL limitů

Veškerý stav životního cyklu požadavků je v reálném čase vizualizován na projektové nástěnce GitHub Projects v2 v sedmi vzájemně se vylučujících stavech (_Backlog_, _ToDo_, _In Progress_, _Blocked_, _Done_, _Superseded_, _Dropped_). Přímá interakce s rozhraním GitHub GraphQL API však přináší riziko vyčerpání sekundárních kvót a dočasného zablokování repozitáře (tzv. _abuse rate limits_). Subsystém `project_automation.py` tento problém řeší čtyřstupňovým ochranným mechanismem:
- *Izolace tokenů (`GH_PROJECT_TOKEN` vs. `GH_TOKEN`)*: Zápisové mutace na projektové nástěnce vyžadují uživatelský přístupový token s rozsahem `project`, zatímco běžné operace nad repozitářem (čtení issues, tvorba větví, štítkování) běží pod standardním tokenem GitHub App. Toto striktní oddělení brání tomu, aby intenzivní činnost agenta v kódu spotřebovala kvótu pro projektovou koordinaci.
- *Inkrementální rozpočet mutací (`PROJECT_MUTATION_BUDGET`)*: Skript omezuje maximální počet GraphQL mutací provedených během jediného integračního běhu (výchozí hodnota je 25 zápisů). Pokud je ve frontě více položek, zbývající aktualizace jsou bezpečně odloženy do dalšího naplánovaného cyklu.
- *Idempotentní kontrola před zápisem (`load_existing_items`)*: Před odesláním mutace klient dotazem načte a nacachuje aktuální stav položek na nástěnce. Pokud již karta odpovídající stav má, zápisový dotaz se vůbec nevygeneruje.
- *Detekce omezení a elegantní ústup (`RATE_LIMITED`)*: Pokud GitHub API vrátí signaturu throttlingu (např. `"secondary rate limit"` či `"was submitted too quickly"`), subsystém okamžitě pozastaví další mutace a ukončí běh s neutrálním návratovým kódem 0. Tím je zabráněno zbytečnému selhání CI workflow.

=== Nastavení repozitáře a správa pravidel jako kód (`repo_settings.py`)

Zatímco aplikační konfigurace se řídí manifestem `.github/darkfactory.json`, samotné metainformace repozitáře (popis, témata, štítky a jejich barvy, pravidla ochrany větví a konfigurace GitHub Pages) jsou programově synchronizovány skriptem `repo_settings.py` (tzv. _Settings as Code_). Pravidla pro ochranu hlavní větve — striktní zákaz přímého commitování, povinnost schválení pull requestu člověkem a zelený stav integračních kontrol — jsou definována přímo ve verzovaném skriptu. Repozitář je tak odolný vůči nechtěným změnám v grafickém rozhraní GitHubu a libovolný nový projekt zapojený do pipeline převezme identická pravidla řízení okamžitě po spuštění synchronizace.

=== Virtualizace dokumentace (`docs_hooks.py`)

Klíčovým prvkem údržby živé dokumentace v systému DarkFactory je subsystém `docs_hooks.py`. Namísto toho, aby se kanonické normativní soubory z kořene repozitáře (`README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `ROADMAP.md`, `VISION.md`) manuálně kopírovaly do složky dokumentačního webu (což vede k nevyhnutelnému zanedbání a desynchronizaci verzí), jsou při sestavení dokumentačního portálu `properdocs` dynamicky připojeny formou virtuálních stránek přímo z kořenového umístění. Dokumentace na webu tak vždy reflektuje jediný autoritativní zdroj pravdy v repozitáři.
]

== Automaticky generovaná dokumentace

#confirmed[
V moderním softwarovém vývoji představuje manuální údržba dokumentace permanentní zdroj chyb a desynchronizace: jakmile se kód vyvíjí rychleji než textové popisy, dokumentace se nevyhnutelně stává zastaralou a nespolehlivou. Systém DarkFactory proto prosazuje striktní princip stoprocentního odvozování veškeré projektové a API dokumentace přímo ze zdrojového kódu a strukturovaných inline komentářů (tzv. _living documentation_).

Tento přístup využívá přirozené standardy konkrétních programovacích jazyků a prostředí:
- *Python*: Dokumentační komentáře v konvenci Google-style docstrings, z nichž generátor automaticky extrahuje typy parametrů, návratové hodnoty a signatury výjimek.
- *TypeScript / JavaScript*: Standardizované bloky TSDoc (`/** ... */`) anotující rozhraní, typové definice a exportované funkce.
- *Rust*: Integrované dokumentační komentáře `///` kompilované nativním nástrojem `cargo doc`.

Zásadní inovací je zařazení striktní verifikace do každého integračního běhu v CI (např. voláním `properdocs build --strict` či odpovídajících linterů dokumentace). Jakýkoli chybějící docstring nově přidané funkce, syntaktická chyba v parametrech nebo neplatný křížový odkaz na neexistující symbol způsobí okamžité selhání validační úlohy v CI a zablokuje sloučení změny. Když autonomní agent implementuje nový modul, je tímto mechanismem deterministicky nucen vytvořit a aktualizovat i kompletní dokumentační anotace.

Po úspěšném schválení pull requestu člověkem a jeho sloučení do hlavní větve centrální pracovní postup automaticky sestaví statickou podobu dokumentačního portálu a publikuje jej na GitHub Pages. Tím odpadá jakákoli manuální údržba externích zrcadel a dokumentace zůstává v absolutní shodě s reálným stavem kódu.
]

#figure(
  image("../img/docs-pipeline.svg", width: 100%),
  caption: [Procesní schéma generování a striktní validace živé dokumentace v CI pipeline.],
) <fig-docs-pipeline>

== Systém revizních značek pro lidský dohled nad textem

#draft[
Při rozšiřování systému DarkFactory na správu a tvorbu dokumentace (doména textu) vyvstala potřeba formalizovat spolupráci člověka a autonomního agenta přímo v sazebním formátu Typst. Výsledkem je protokol vizuálních revizních značek (*Review Markers*) a textových revizních funkcí, který barevně a sémanticky rozlišuje stav zpracování jednotlivých pasáží:
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
