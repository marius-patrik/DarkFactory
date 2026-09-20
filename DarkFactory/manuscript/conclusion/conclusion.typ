#import "/DarkFactory/templates/common.typ": define-term, translation, blue-note
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "conclusion",
  proper: translation(cs: "Závěr", en: "Conclusion"),
  keyword: false,
)

#let item = concept(
  key: "conclusion",
  term: terminology,
  definition: terms => [
#blue-note[Závěr bude definován jako syntéza ověřených výsledků vůči cílům a výzkumným otázkám.]
  ],
  description: terms => [
#blue-note[Závěr bude sepsán až po dokončení výsledků a nebude předjímat neověřená zjištění.]
  ],
  summary: terms => [
#blue-note[Finální shrnutí vznikne až z ověřených výsledků práce.]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
