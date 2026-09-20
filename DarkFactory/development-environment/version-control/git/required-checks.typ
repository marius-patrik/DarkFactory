#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(id: "required-checks", proper: translation(cs: "Požadované kontroly", en: "Required Checks"), explanation_cs: "Automatizované kontroly, jejichž úspěšné dokončení je povinnou podmínkou pro přijetí nebo sloučení změny.", explanation_en: "Automated checks whose successful completion is a mandatory condition for accepting or merging a change.", keyword: false, citation: bib.humble2010, source: bib.dabbish2012github)

#let item = concept(
  key: "required_checks",
  term: terminology,
  definition: terms => [
Požadované kontroly jsou automatizované kontroly, jejichž úspěšné dokončení je povinnou podmínkou pro přijetí nebo sloučení změny.
  ],
  description: terms => [
#unconfirmed[
K tomu, aby byla kontinuální integrace efektivní, nestačí testy pouze spouštět — jejich úspěšné dokončení musí být systémově vynuceno.

- #diff[Požadované kontroly (_Required Checks_):][Požadované kontroly (_Required Checks_ @humble2010):] Seznam úloh v GitHub Actions, které musí skončit explicitním úspěchem (zelený stav), aby bylo technicky možné pull request sloučit:
  - Statická analýza a linter: Kontrola dodržení kódového stylu, odhalování mrtvého kódu a základních syntaktických prohřešků.
  - Typová kontrola a build: Jistota, že kód lze bez chyb zkompilovat a že typový systém nezaznamenal nekonzistence.
  - Automatizované testy: Úspěšný průchod jednotkových i integračních testů ověřujících požadované chování.
- Pravidlo deterministického výsledku: Každá kontrola musí skončit jednoznačným výsledkem; tiché přeskočení testu nebo nejednoznačný stav sloučení zablokuje.
]
  ],
  summary: terms => [
Required checks mění CI z informativní zpětné vazby na technicky vynucovanou podmínku integrace.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "continuous_integration"),),
)