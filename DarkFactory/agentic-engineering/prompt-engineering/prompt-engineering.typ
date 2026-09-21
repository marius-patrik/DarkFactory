#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "prompt_engineering",
  keyword: true,
  czech: "Promptové inženýrství",
  english: "Prompt Engineering",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
  definition: terms => [
Promptové inženýrství je systematický návrh instrukcí a kontextu určujících požadované chování jazykového modelu nebo agenta.
  ],
  description: terms => [
Prompt může řídit postup a používání nástrojů, ale nevynucuje bezpečnostní nebo procesní pravidla; ta zajišťuje #term(terms.guardrail).
  ],
  relations: (),
)
