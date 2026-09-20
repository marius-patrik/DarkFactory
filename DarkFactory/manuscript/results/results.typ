#import "/DarkFactory/templates/common.typ": define-term, translation, blue-note
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "results-discussion",
  proper: translation(cs: "Výsledky a diskuse", en: "Results and Discussion"),
  keyword: false,
)

#let item = concept(
  key: "results_discussion",
  term: terminology,
  definition: terms => [
#blue-note[Definice výsledků bude doplněna pouze z reálné evaluace dokončeného systému.]
  ],
  description: terms => [
#blue-note[Tato sekce nebude ve finální verzi obsahovat hypotetická měření ani předběžné výsledky. Obsah vznikne z pozorovaných výstupů evaluace DarkFactory.]
  ],
  summary: terms => [
#blue-note[Shrnutí výsledků bude formulováno až po dokončení a vyhodnocení evaluace.]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
