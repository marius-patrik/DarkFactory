#import "/DarkFactory/templates/common.typ": define-term, translation, diff, term, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "language-model",
  proper: translation(cs: "Jazykový model", en: "Large Language Model"),
  industry: translation(cs: "LLM", en: "LLM"),
  explanation_cs: "Velký jazykový model je neuronový model trénovaný nad rozsáhlými textovými daty, který autoregresivně zpracovává a generuje posloupnosti tokenů.",
  explanation_en: "A large language model is a neural model trained on large-scale textual data that autoregressively processes and generates token sequences.",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
)

#let item = concept(
  key: "language_model",
  term: terminology,
  definition: terms => [
#diff[
Velký jazykový model je neuronový model trénovaný nad rozsáhlými textovými daty, který autoregresivně zpracovává a generuje posloupnosti tokenů.
][
Velký jazykový model je neuronový model založený na #term(terms.transformer), trénovaný nad rozsáhlými textovými daty a generující posloupnosti tokenů prostřednictvím #term(terms.autoregression).
]
  ],
  theory_enabled: false,
  practical_enabled: false,
  relations: ((type: "dependency", target: "transformer"), (type: "related", target: "autoregression"))
)
