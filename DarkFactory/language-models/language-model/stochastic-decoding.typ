#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "stochastic-decoding",
  proper: translation(cs: "Stochastické dekódování", en: "Stochastic Decoding"),
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
)

#let item = concept(
  key: "stochastic_decoding",
  term: terminology,
  definition: terms => [
Stochastické dekódování je výběr výstupních tokenů z pravděpodobnostního rozdělení modelu způsobem, který může při stejném vstupu vést k různým platným pokračováním.
  ],
  description: terms => [
#unconfirmed[
Pravděpodobnostní dekódování znamená, že shodný vstup nemusí vždy vytvořit totožný výstup. V agentním systému proto nelze provozní spolehlivost opřít pouze o model; kritická pravidla a stavové přechody musí vynucovat deterministická vrstva harnessu.
]
  ],
  summary: terms => [
Nedeterminismus dekódování je jedním z důvodů, proč kritická provozní pravidla agentního systému musí vynucovat harness mimo model.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "autoregression"), (type: "related", target: "harness")),
)
