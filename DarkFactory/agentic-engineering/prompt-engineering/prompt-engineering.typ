#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "prompt_engineering",
  keyword: true,
  industry: "Prompt Engineering",
  czech: "Promptové inženýrství",
  english: "Prompt Engineering",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
  definition: terms => [
Systematický návrh instrukcí, příkladů a jejich struktury s cílem ovlivnit chování jazykového modelu. #cite(bib.anthropic_prompt)
  ],
  description: terms => [
Prompt řídí pravděpodobnostní chování modelu; pravidla, která musí systém technicky vynutit, patří do #term(terms.guardrail) nebo jiné běhové kontroly.
  ],
  relations: (),
)
