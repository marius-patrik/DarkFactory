#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "language_model",
  keyword: true,
  industry: "LLM",
  czech: "Jazykový model",
  english: "Large Language Model",
  citation: (bib.brown2020, bib.vaswani2017),
  source: bib.brown2020,
  definition: terms => [
Velký neuronový jazykový model trénovaný na rozsáhlých textových datech pro predikci a generování posloupností tokenů. #cite(bib.brown2020)
  ],
  description: terms => [
Současné LLM typicky používají architekturu #term(terms.transformer), která při autoregresivním generování odhaduje další token z předchozí sekvence. #cite(bib.vaswani2017) Práci s nástroji, stavem a prostředím zajišťuje okolní agentní runtime nebo harness, nikoli samotná textová inference. #cite(bib.anthropic2024tooluse)
  ],
  relations: ((type: "dependency", target: "transformer"),),
)
