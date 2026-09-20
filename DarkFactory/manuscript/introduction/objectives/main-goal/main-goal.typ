#import "/DarkFactory/templates/common.typ": define-term, translation, finalized
#import "/DarkFactory/schema.typ": concept

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
  description: terms => [
Cíl spojuje konceptové vymezení agentického inženýrství s návrhem konkrétního systému. Požadovaná architektura musí podporovat autonomní provádění vývojových úloh, ale zachovat explicitní lidskou kontrolu nad rozhodnutími s významným dopadem.
  ],
  summary: terms => [
Výsledkem práce má být zdůvodněná a realizovatelná architektura agentního harnessu, nikoli pouze popis schopností jazykových modelů.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
