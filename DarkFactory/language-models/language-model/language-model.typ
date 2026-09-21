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
Při generování model opakovaně odhaduje další token na základě dosavadního kontextu. Samostatné koncepty dále popisují tokenizaci, reprezentaci dat a omezení kontextu. Funkce jako práce se soubory, spouštění příkazů nebo správa úloh nejsou vlastnostmi jazykového modelu; poskytuje je nadřazený aplikační nebo agentní systém.
  ],
  relations: ((type: "dependency", target: "transformer"),),
)
