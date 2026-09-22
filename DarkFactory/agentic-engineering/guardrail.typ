#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "guardrail",
  keyword: "Guardrail",
  citation: bib.openai_agents_guardrails,
  source: bib.openai_agents_guardrails,
  definition: terms => [
V této práci označuje Guardrail programově vynucenou kontrolu, která může před pokračováním běhu validovat nebo zablokovat vstup, výstup či použití nástroje. #cite(bib.openai_agents_guardrails)
  ],
  description: terms => [
Agentní frameworky mohou guardrails implementovat různými způsoby; zde je důležitá deterministicky vyhodnotitelná hranice oddělená od samotného modelového rozhodnutí. Kontrola může běh zastavit nebo odmítnout konkrétní akci před provedením jejího účinku. #cite(bib.openai_agents_guardrails)
  ],
  practical: terms => [
Guardrails umožňují deterministickými kontrolami vynucovat omezení, která nemají záviset pouze na tom, zda je model dodrží.
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "sandbox"), (type: "related", target: "goal_loops")),
)
