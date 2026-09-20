#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../../schema.typ": concept

#let terminology = define-term(id: "required-checks", proper: translation(cs: "Požadované kontroly", en: "Required Checks"), explanation_cs: "Automatizované kontroly, jejichž úspěšné dokončení je povinnou podmínkou pro přijetí nebo sloučení změny.", explanation_en: "Automated checks whose successful completion is a mandatory condition for accepting or merging a change.", keyword: false)

#let item = concept(
  key: "required_checks",
  term: terminology,
  heading: terms => [#finalized[Požadované kontroly (Required Checks)]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#unconfirmed[
K tomu, aby byla kontinuální integrace efektivní, nestačí testy pouze spouštět — jejich úspěšné dokončení musí být systémově vynuceno.

- Požadované kontroly (_Required Checks_): Seznam úloh v GitHub Actions, které musí skončit explicitním úspěchem (zelený stav), aby bylo technicky možné pull request sloučit:
  - Statická analýza a linter: Kontrola dodržení kódového stylu, odhalování mrtvého kódu a základních syntaktických prohřešků.
  - Typová kontrola a build: Jistota, že kód lze bez chyb zkompilovat a že typový systém nezaznamenal nekonzistence.
  - Automatizované testy: Úspěšný průchod jednotkových i integračních testů ověřujících požadované chování.
- Pravidlo deterministického výsledku: Každá kontrola musí skončit jednoznačným výsledkem; tiché přeskočení testu nebo nejednoznačný stav sloučení zablokuje.
]
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "pull_request"), (type: "dependency", target: "continuous_integration"),)
)
