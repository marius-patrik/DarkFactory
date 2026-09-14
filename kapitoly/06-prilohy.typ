#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Obsah přiloženého média

#draft[
Odevzdaný archiv obsahuje kompletní zdrojové soubory práce, sazební šablonu, řídicí skripty a zdrojový kód autonomního systému DarkFactory.
]

#figure(
  ```text
  mono-OdbornaPrace/
  ├── prace/                          # Rukopis a sazba odborné práce
  │   ├── kapitoly/                   # Texty jednotlivých kapitol (01-uvod až 06-prilohy)
  │   ├── lib/odborna-prace.typ       # Sazební šablona, recenzní značky a formátování GJKT
  │   ├── img/                        # Vektorová procesní schémata (SVG) a grafické podklady
  │   ├── fonts/                      # Metricky shodná patková písma (Caladea)
  │   ├── bib/references.bib          # Bibliografická databáze citovaných zdrojů
  │   ├── scripts/preview_server.py   # Lokální server pro živý náhled v Google Chrome
  │   ├── main.typ                    # Hlavní řídicí dokument sazby
  │   ├── metadata.typ                # Údaje o autorovi, vedoucím a anotace
  │   └── Makefile                    # Příkazy pro automatizovanou kompilaci a kontrolu
  ├── darkfactory/                    # Zdrojový kód systému DarkFactory (submodul)
  │   ├── .github/workflows/          # Znovupoužitelné sdílené šablony GitHub Actions
  │   ├── .github/scripts/            # Výkonné skriptové jádro v jazyce Python
  │   ├── docker/Dockerfile.agent     # Hermetický kontejnerový sandbox pro modely
  │   └── tests/                      # Automatizovaná testovací sada ověřující orchestraci
  ├── out/main.pdf                    # Výsledný vysázený tiskový dokument v PDF
  └── README.md                       # Dokumentace a návod na reprodukci prostředí
  ```,
  caption: [Stromová adresářová struktura odevzdaného elektronického archivu a doprovodných repozitářů.],
) <kod-strom-prilohy>

= Schéma konfiguračního manifestu darkfactory.json

#draft[
Konfigurace každého klientského repozitáře zapojeného do pipeline je centralizována v souboru `.github/darkfactory.json`. Níže uvedené schéma specifikuje formální syntaxi podle standardu JSON Schema (Draft-07).
]

#figure(
  ```json
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "DarkFactoryRepositoryManifest",
    "description": "Konfigurační schéma manifestu darkfactory.json pro autonomní vývojové pipeline.",
    "type": "object",
    "required": ["identity"],
    "properties": {
      "$schema": { "type": "string" },
      "identity": {
        "type": "object",
        "required": ["owner", "repo"],
        "properties": {
          "owner": { "type": "string", "description": "Uživatelské jméno nebo organizace na GitHubu." },
          "repo": { "type": "string", "description": "Název repozitáře." },
          "display_name": { "type": "string", "description": "Čitelný název projektu." },
          "default_branch": { "type": "string", "default": "main", "description": "Cílová hlavní vývojová větev." },
          "agent_slug": { "type": "string", "description": "Identifikátor komentářů generovaných botem." },
          "description": { "type": "string", "description": "Stručný popis účelu repozitáře." }
        }
      },
      "versioning": {
        "type": "object",
        "properties": {
          "mode": { "type": "string", "enum": ["semver", "calver", "none"], "default": "semver" },
          "tag_prefix": { "type": "string", "default": "v" },
          "initial": { "type": "string", "default": "0.1.0" },
          "changelog_path": { "type": "string", "default": "CHANGELOG.md" }
        }
      },
      "areas": {
        "type": "object",
        "description": "Taxonomie doménových oblastí pro automatické štítkování a směrování agentů.",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "description": { "type": "string" },
            "keywords": { "type": "array", "items": { "type": "string" } },
            "color": { "type": "string", "pattern": "^[0-9a-fA-F]{6}$" }
          }
        }
      },
      "board": {
        "type": "object",
        "properties": {
          "global_title": { "type": "string", "description": "Název nadřazené koordinační nástěnky." },
          "link_boards": { "type": "array", "items": { "type": "string" } }
        }
      },
      "required_checks": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Seznam povinných integračních kontrol podmiňujících sloučení pull requestu."
      },
      "upstream": {
        "type": "object",
        "required": ["repo", "ref"],
        "properties": {
          "repo": { "type": "string", "description": "Zdrojový repozitář sdíleného pipeline." },
          "ref": { "type": "string", "description": "Připnutý commit SHA nebo verze upstreamu." }
        }
      }
    }
  }
  ```,
  caption: [Formální JSON schéma vymezující validní datové typy a strukturu souboru `darkfactory.json`.],
) <kod-schema-manifestu>

= Sdílené workflow pro GitHub Actions

#draft[
Architektura DarkFactory striktně odděluje klientský repozitář od těla orchestračních úloh. Klientský repozitář obsahuje pouze tenké volající workflow (@kod-caller-workflow), které deleguje exekuci na centrální sdílené workflow (@kod-reusable-workflow) připnuté ke konkrétnímu otisku commitu.
]

#figure(
  ```yaml
  name: Autonomous Agent

  # Volající workflow v klientském repozitáři: žádný kód se nekopíruje,
  # exekuce je plně delegována na sdílené tělo pipeline v DarkFactory.
  on:
    issues:
      types: [opened]
    issue_comment:
      types: [created]
    pull_request_review_comment:
      types: [created]
    workflow_dispatch:

  permissions:
    contents: write
    issues: write
    pull-requests: write
    repository-projects: write
    actions: write

  jobs:
    agent:
      uses: marius-patrik/DarkFactory/.github/workflows/agent.yml@6d42a0ea793a3e1fc26876ff99662a94f82bb987
      with:
        agent-enabled: ${{ vars.AGENT_ENABLED }}
        pipeline-repo: marius-patrik/DarkFactory
        pipeline-ref: "6d42a0ea793a3e1fc26876ff99662a94f82bb987"
      secrets: inherit
  ```,
  caption: [Deklarace volajícího workflow v klientském repozitáři (`.github/workflows/agent.yml`).],
) <kod-caller-workflow>

#draft[
Centrální sdílené workflow v repozitáři `DarkFactory` definuje rozhraní `workflow_call`, přebírá parametry a spouští orchestrátor v izolovaném kontejneru:
]

#figure(
  ```yaml
  name: Autonomous Agent Runner
  on:
    workflow_call:
      inputs:
        pipeline-ref:
          description: "Commit SHA pipeline repozitáře"
          required: false
          type: string
        pipeline-repo:
          description: "Repozitář obsahující runner a definici kontejneru"
          required: false
          type: string
          default: "marius-patrik/DarkFactory"
        agent-enabled:
          description: "Přepínač běhu agenta"
          required: false
          type: string
      secrets:
        DARKFACTORY_APP_PRIVATE_KEY: { required: false }
        GH_PROJECT_TOKEN: { required: false }
        ANTIGRAVITY_REFRESH_TOKEN: { required: false }
        CLAUDE_API_KEY: { required: false }
        OPENAI_API_KEY: { required: false }

  jobs:
    run:
      if: ${{ inputs.agent-enabled != 'false' }}
      runs-on: ubuntu-latest
      container:
        image: ghcr.io/marius-patrik/darkfactory-agent:latest
      steps:
        - name: Checkout target repository
          uses: actions/checkout@v4
          with:
            fetch-depth: 0
        - name: Execute Autonomous Lifecycle
          run: python3 /opt/darkfactory/scripts/agent_runner.py
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            PIPELINE_REF: ${{ inputs.pipeline-ref }}
  ```,
  caption: [Ukázka rozhraní centrálního znovupoužitelného workflow v repozitáři `DarkFactory`.],
) <kod-reusable-workflow>

= Systémové prompty plánovacího a kódovacího agenta

#draft[
Systémový prompt a přesně vymezené mantinely jsou klíčem k tomu, aby autonomní agent nepůsobil destruktivně a respektoval pravidla repozitáře. V systému DarkFactory jsou prompty dynamicky sestavovány skriptem `agent_runner.py`.
]

#figure(
  ```text
  Draft a detailed, step-by-step Implementation Plan for Request #${request_number}:
  Title: ${req_data.title}
  Details: ${req_data.body}

  Include Scope, Architectural & Code Changes, and Verification Steps.
  The plan must specify exact file paths to create or modify and formulate 
  corresponding unit test requirements.
  Do NOT write the implementation code yet; formulate only the specification.
  ```,
  caption: [Systémový prompt pro plánovací fázi (`handle_plan`) generující strukturovaný návrh řešení.],
) <kod-prompt-plan>

#figure(
  ```text
  You are implementing a plan for a code repository.

  ## Parent Request (#${request_number})
  Title: ${request_title}
  ${request_body}

  ## Implementation Plan (#${plan_number})
  Title: ${plan_title}
  ${plan_body}

  ## Instructions
  Implement ALL changes described in the plan above.
  Write production code and corresponding unit tests.
  Follow the binding rules in AGENTS.md: inline API documentation on every 
  public item, Conventional Commits, and a unit test for every behavior you add.
  Do NOT create or modify files outside the scope of the plan.
  ```,
  caption: [Systémový prompt pro implementační fázi (`implement_prompt`) vymezující striktní pravidla zásahu.],
) <kod-prompt-impl>

#figure(
  ````text
  The following test failures occurred after implementing the plan:

  ```
  ${test_res.stdout}
  ${test_res.stderr}
  ```

  Fix the failures while staying within the plan scope.
  Do not introduce changes unrelated to the reported regressions.
  Re-verify that all unit tests pass before concluding.
  ````,
  caption: [Samoopravný prompt (`fix_prompt`) vyvolaný automaticky při detekci selhání testovací sady v CI.],
) <kod-prompt-fix>

= Protokol revizních značek v sazebním systému Typst

#draft[
Tato příloha uvádí referenční definici a použití vizuálních revizních značek pro řízení a dohled nad generovaným textem v ekosystému DarkFactory.
]

#figure(
  ```typ
  #import "lib/odborna-prace.typ": note, issue, alert, critique, added, draft, confirmed, diff

  // --- 1. Panely na okraji textu (Callouty) ---
  #note[Doplňte porovnání rychlosti kompilace mezi verzemi 0.1 a 0.2.]
  #issue[Chybná signatura funkce: chybí povinný parametr timeout.]
  #alert[Sekce postrádá shrnutí naměřených výsledků před diskusí.]
  #critique[Metodologická absence baseline prokazující přínos nového modulu.]

  // --- 2. Textové revizní funkce (zvýraznění v toku textu) ---
  #draft[Tento odstavec tvoří neověřený koncept čekající na schválení.]
  #added[Nově vygenerovaná sekce automaticky začleněná agentem.]
  #confirmed[Uživatelem zkontrolovaný text, který ještě nebyl finalizován.]
  #removed[Zastaralý text navržený k odstranění.]
  #diff[Původní chybné znění textu.][Nové opravené znění textu po revizi.]
  ```,
  caption: [Ukázka zápisu a použití revizních značek a textových funkcí v jazyce Typst.],
) <kod-znacky-typst>

#draft[
== Vizuální reprezentace jednotlivých prvků v sazbě

Pro přehlednost jsou níže uvedeny reálné ukázky jednotlivých revizních panelů a textových funkcí v jejich finální vizuální podobě:
]

#note[Ukázka zeleného panelu doporučení (`#note`): Konstruktivní návrh na vylepšení, doplnění diagramu nebo námět na architektonickou optimalizaci.]

#issue[Ukázka červeného panelu vady (`#issue`): Zjištěná faktická nesrovnalost, logická mezera, syntaktická chyba či překlep vyžadující opravu.]

#alert[Ukázka žlutého panelu strukturálního upozornění (`#alert` / `#struct-alert`): Hloubková nevyváženost podkapitol, nekonzistence osnovy či absence klíčových náležitostí práce.]

#critique[Ukázka oranžového panelu oponentury (`#critique`): Břitká, nekompromisní oponentura — zpochybnění neověřených předpokladů, analýza slabin metodiky a příprava na otázky zkušební komise.]

Ukázky textových zvýrazňovacích a srovnávacích funkcí v toku odstavce:
- *Neověřený koncept (`#draft` / `#unconfirmed`)*: #draft[Tento text představuje koncept čekající na posouzení autorem.]
- *Nově přidaný text (`#added`)*: #added[Tato pasáž byla nově vygenerována autonomním agentem na základě požadavku.]
- *Potvrzený text (`#confirmed`)*: #confirmed[Text byl předběžně odsouhlasen uživatelem, čeká na finální začištění.]
- *Navrženo k odstranění (`#removed`)*: #removed[Tato neaktuální věta je navržena k úplnému smazání z rukopisu.]
- *Srovnávací diff (`#diff`)*: #diff[Původní chybné nebo nepřesné znění pasáže.][Nové přesné, fakticky a formálně ověřené znění pasáže.]
- *Čistý neoznačený text*: Představuje finální, autorsky schválený text v hlase autora bez jakéhokoliv podbarvení.

#draft[
Každá značka plní přesně vymezenou komunikační roli v procesu lidského schvalování: zatímco finální text zůstává zcela bez zvýraznění, veškeré neověřené pasáže konceptu jsou zřetelně žluté (`#draft`), nově přidané části zelené (`#added`), potvrzené části modré (`#confirmed`) a opravy zviditelněné přes srovnávací diff (`#diff`). Náměty, chyby, strukturální vady i břitká kritika jsou navíc striktně separovány do barevných postranních panelů na okraji textu.
]
