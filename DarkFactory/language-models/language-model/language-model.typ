#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "language_model",
  industry: "LLM",
  czech: "Jazykový model",
  english: "Large Language Model",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
  definition: terms => [
Jazykový model je neuronový model pro zpracování a generování posloupností tokenů; současné modely tohoto typu typicky používají #term(terms.transformer).
  ],
  description: terms => [
Model při generování odhaduje další token z aktivního kontextu. Práci se soubory, příkazy, nástroji a stavem poskytuje až okolní aplikační nebo agentní vrstva.
  ],
  relations: ((type: "dependency", target: "transformer"),),
)
