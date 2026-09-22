#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "prompt_engineering",
  term: "Promptové inženýrství",
  keyword: "Prompt Engineering",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
  definition: terms => [
Systematický návrh instrukcí, příkladů a jejich struktury s cílem ovlivnit chování jazykového modelu. #cite(bib.anthropic_prompt)
  ],
  description: terms => [
Prompt ovlivňuje pravděpodobnostní chování modelu, ale sám nevynucuje technickou bezpečnostní nebo autorizační hranici; pravidla, která musí systém garantovat, patří do #term(terms.guardrail) nebo jiné běhové kontroly.
  ],
  practical: terms => [
Promptové inženýrství umožňuje zpřesnit instrukce pro jeden modelový krok; u agentů je však třeba jeho účinek kombinovat se stavem, nástroji a řízením kontextu.
  ],
  relations: ((type: "dependency", target: "language_model"),),
)
