#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "language_model",
  term: "Velký jazykový model",
  keyword: "LLM",
  citation: (bib.brown2020, bib.vaswani2017),
  source: bib.brown2020,
  definition: terms => [
Velký neuronový jazykový model trénovaný na rozsáhlých textových datech pro predikci a generování posloupností tokenů. #cite(bib.brown2020)
  ],
  description: terms => [
Současné LLM typicky používají architekturu #term(terms.transformer), která při autoregresivním generování odhaduje další token z předchozí sekvence. #cite(bib.vaswani2017)
  ],
  relations: ((type: "dependency", target: "transformer"),),
)
