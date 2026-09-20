#import "/DarkFactory/templates/common.typ": define-term, translation
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "results-discussion",
  proper: translation(cs: "Výsledky a diskuse", en: "Results and Discussion"),
  keyword: false,
)

#let item = concept(
  key: "results_discussion",
  term: terminology,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)

// Záměrně bez definice a obsahu.
// Kapitola musí vzniknout až z reálné evaluace, měření a pozorování
// dokončeného systému popsaného v praktické části.
