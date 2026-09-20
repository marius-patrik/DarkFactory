#import "/DarkFactory/templates/common.typ": translation, term, bib
#import "/DarkFactory/schema.typ": concept
#import "examples/gpt-5-6.typ" as gpt_5_6
#import "examples/claude-opus-5.typ" as claude_opus_5
#import "examples/deepseek-v4-1-flash.typ" as deepseek_v4_1_flash


#let item = concept(
  key: "language_model",
    industry: "LLM",
  czech: "Velký jazykový model",
  english: "Large Language Model",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
definition: terms => [
Velký jazykový model je neuronový model pro zpracování a generování posloupností tokenů; současné modely tohoto typu typicky používají #term(terms.transformer).
  ],
  description: terms => [
Při generování model opakovaně odhaduje další token na základě dosavadního kontextu. Samostatné koncepty dále popisují #term(terms.autoregression), tokenizaci, reprezentaci dat a omezení kontextu. Funkce jako práce se soubory, spouštění příkazů nebo správa úloh nejsou vlastnostmi jazykového modelu; poskytuje je nadřazený aplikační nebo agentní systém.
  ],
  summary: terms => [
Jazykový model je inferenční komponenta. V této práci je důležité především jeho rozhraní a omezení, protože provozní chování agenta vzniká až propojením modelu s harness-em.
  ],
  examples: (gpt_5_6.item, claude_opus_5.item, deepseek_v4_1_flash.item),
  relations: ((type: "dependency", target: "transformer"), (type: "related", target: "autoregression")),
)
