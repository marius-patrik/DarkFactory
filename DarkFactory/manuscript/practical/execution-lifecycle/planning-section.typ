#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_request_plan_body",
  title: [Zadání a plán],
  definition: terms => [
Řízená změna začíná trvalým Requestem a jeho převodem na konkrétní Planning artefakt před zahájením implementace.
  ],
  description: terms => [
Request zachovává původní zadání a stav doručení. Planning jej spojuje s aktuálním stavem repozitáře, acceptance criteria, rozsahem, závislostmi, pořadím práce a očekávaným ověřením. Tato fáze vlastní pouze vznik schváleného rámce změny; review/fix implementace patří až do následného ověřování. #cite(bib.darkfactory)
  ],
)
