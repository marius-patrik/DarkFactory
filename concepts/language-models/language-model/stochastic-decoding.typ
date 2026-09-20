#import "../../../templates/common.typ": define-term, translation, unconfirmed, bib
#import "../../schema.typ": concept

#let terminology = define-term(
  id: "stochastic-decoding",
  proper: translation(cs: "Stochastické dekódování", en: "Stochastic Decoding"),
  explanation_cs: "Výběr výstupních tokenů z pravděpodobnostního rozdělení modelu způsobem, který může při stejném vstupu vést k různým platným pokračováním.",
  explanation_en: "Selection of output tokens from a model probability distribution in a way that can yield different valid continuations for the same input.",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
)

#let item = concept(
  key: "stochastic_decoding",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
Pravděpodobnostní dekódování znamená, že shodný vstup nemusí vždy vytvořit totožný výstup. V agentním systému proto nelze provozní spolehlivost opřít pouze o model; kritická pravidla a stavové přechody musí vynucovat deterministická vrstva harnessu.
]
  ],
  relations: ((type: "dependency", target: "autoregression"), (type: "related", target: "harness"))
)
