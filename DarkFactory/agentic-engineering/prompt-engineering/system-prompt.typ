#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "system_prompt",
  term: "Systémový prompt",
  keyword: "System Prompt",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
  definition: terms => [
Systémová instrukční vrstva, která vymezuje roli, pravidla a výchozí způsob chování modelu nebo agenta. #cite(bib.anthropic_prompt)
  ],
  description: terms => [
Systémový prompt poskytuje stabilní instrukční kontext, ale sám o sobě není technickou izolační ani autorizační hranicí. #cite(bib.anthropic_prompt)
  ],
  relations: ((type: "dependency", target: "prompt_engineering"),),
)
