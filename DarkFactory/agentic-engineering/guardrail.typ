#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "guardrail",
  keyword: true,
  industry: "Guardrail",
  czech: "Deterministický mantinel",
  english: "Deterministic Guardrail",
  citation: bib.openai_agents_guardrails,
  source: bib.openai_agents_guardrails,
  definition: terms => [
Programově vynucená kontrola, která může před pokračováním běhu validovat nebo zablokovat vstup, výstup či použití nástroje.
  ],
  description: terms => [
Guardrails lze spouštět na hranicích vstupu, výstupu nebo volání nástroje a při nesplnění podmínky běh zastavit či odmítnout konkrétní akci. #cite(bib.openai_agents_guardrails)
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "sandbox"), (type: "related", target: "loop_engineering")),
)
