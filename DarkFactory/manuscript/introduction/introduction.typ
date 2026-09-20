#import "/DarkFactory/templates/common.typ": define-term, translation
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "thesis-introduction",
  proper: translation(cs: "Úvod", en: "Introduction"),
  keyword: false,
)

#let item = concept(
  key: "thesis_introduction",
  term: terminology,
  document_enabled: false,
)
