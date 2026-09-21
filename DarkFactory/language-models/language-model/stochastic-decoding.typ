#import "/DarkFactory/templates/common.typ": translation, finalized, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "stochastic_decoding",
    czech: "Stochastické dekódování",
  english: "Stochastic Decoding",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
definition: terms => [
Stochastické dekódování je výběr výstupních tokenů z pravděpodobnostního rozdělení modelu způsobem, který může při stejném vstupu vést k různým platným pokračováním.
  ],
  description: terms => [
#finalized[
Pravděpodobnostní dekódování znamená, že shodný vstup nemusí vždy vytvořit totožný výstup. V agentním systému proto nelze provozní spolehlivost opřít pouze o model; kritická pravidla a stavové přechody musí vynucovat deterministická vrstva harnessu.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "harness")),
)
