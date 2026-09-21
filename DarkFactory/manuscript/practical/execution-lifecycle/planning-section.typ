#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_planning_lifecycle_body",
  title: [Plánování a schválení],
  definition: terms => [
Z Requestu a aktuálního stavu repozitáře vzniká jeden sjednocený Planning artefakt, který před implementací projde nezávislou revizí a jedním explicitním schválením vlastníka.
  ],
  description: terms => [
Planning obsahuje interpretaci požadavku, acceptance criteria, scope, závislosti, pořadí práce a očekávané ověření. Revize a automatická oprava se opakují do čistého výsledku; po materiální změně Requestu, base stavu, závislostí nebo recovery kontextu se předchozí schválení považuje za zastaralé. #cite(bib.darkfactory)
  ],
)
