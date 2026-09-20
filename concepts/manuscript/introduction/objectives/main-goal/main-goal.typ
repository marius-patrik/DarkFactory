#import "../../../../templates/common.typ": define-term, translation, finalized
#import "../../../../schema.typ": concept

#let terminology = define-term(
  id: "main-goal",
  proper: translation(cs: "Hlavní cíl", en: "Main Goal"),
  keyword: false,
)

#let item = concept(
  key: "main_goal",
  term: terminology,
  definition: terms => [
#finalized[
Vymezit teoretické principy agentického inženýrství (_agentic engineering_) a navrhnout modulární architekturu agent harnessu pro automatizovaný vývoj softwaru se zachováním lidského dohledu v klíčových rozhodovacích bodech.
]
  ],
  document_enabled: true,
)
