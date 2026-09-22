#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept, example

#let gpt3_example = example(
  key: "language_model_gpt3",
  title: [GPT-3],
  source: bib.brown2020,
  description: terms => [
Brown et al. popisují GPT-3 jako autoregresivní jazykový model se 175 miliardami parametrů, který při evaluaci provádí zero-shot, one-shot a few-shot úlohy pouze z textového kontextu bez gradientních aktualizací vah. #cite(bib.brown2020)
  ],
)

#let item = concept(
  key: "language_model",
  term: "Velký jazykový model",
  keyword: "LLM",
  citation: (bib.brown2020, bib.vaswani2017),
  source: bib.brown2020,
  definition: terms => [
Velký jazykový model (LLM) je parametrický model pravděpodobnostního rozdělení nad posloupnostmi tokenů; autoregresivní LLM generuje pokračování postupným odhadem dalšího tokenu z již dostupného kontextu. #cite(bib.brown2020)
  ],
  description: terms => [
Při inferenci model převádí aktivní posloupnost tokenů na distribuci možných pokračování a z ní vytváří výstup. Současné generativní LLM jsou často založeny na architektuře #term(terms.transformer), ale modelová inference sama nepředstavuje perzistentní pracovní stav, vykonání nástroje ani změnu externího prostředí. #cite(bib.vaswani2017)
  ],
  examples: (gpt3_example,),
  practical: terms => [
Model dodává inferenční schopnost potřebnou pro generování, klasifikaci nebo volbu dalšího kroku. Perzistentní stav workflow, skutečné vykonání nástrojů, účinky v prostředí a dlouhodobá orchestrace proto musí vzniknout mimo samotný model.
  ],
  relations: ((type: "dependency", target: "transformer"),),
)
