#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "loop_engineering",
  industry: "Loop Engineering",
  czech: "Inženýrství prováděcí smyčky",
  english: "Execution-loop Engineering",
  citation: (bib.yao2022, bib.anthropic_harness_design),
  source: bib.anthropic_harness_design,
  definition: terms => [
V této práci označuje návrh pravidel, která řídí opakování agentní smyčky, její stavové přechody a podmínky ukončení.
  ],
  description: terms => [
Řízení smyčky může zahrnovat rozpočty, opakování selhaných kroků, ukončení neproduktivního běhu nebo předání řízení jiné fázi systému. #cite(bib.anthropic_harness_design)
  ],
  relations: ((type: "dependency", target: "agent_loop"), (type: "related", target: "divergence")),
)
