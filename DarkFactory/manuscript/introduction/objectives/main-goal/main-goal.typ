#import "/DarkFactory/templates/common.typ": translation, finalized
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "main_goal",
    czech: "Hlavní cíl",
  english: "Main Goal",
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
