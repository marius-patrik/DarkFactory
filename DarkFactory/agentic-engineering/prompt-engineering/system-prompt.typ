#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "system_prompt",
  industry: "System Prompt",
  czech: "Systémový prompt",
  english: "System Prompt",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
  definition: terms => [
Systémová instrukční vrstva, která vymezuje roli, pravidla a výchozí způsob chování modelu nebo agenta.
  ],
  description: terms => [
Systémový prompt poskytuje stabilní instrukční kontext, ale sám o sobě není technickou izolační ani autorizační hranicí. #cite(bib.anthropic_prompt)
  ],
  relations: ((type: "dependency", target: "prompt_engineering"),),
)
