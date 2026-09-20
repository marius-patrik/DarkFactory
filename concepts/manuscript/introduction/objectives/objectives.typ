#import "../../../../templates/common.typ": define-term, translation
#import "../../../schema.typ": concept

#let terminology = define-term(
  id: "thesis-objectives-research-questions",
  proper: translation(cs: "Cíl práce a výzkumné otázky", en: "Thesis Objective and Research Questions"),
  keyword: false,
)

#let item = concept(
  key: "thesis_objectives_research_questions",
  term: terminology,
  document_enabled: false,
)
