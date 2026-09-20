#import "/DarkFactory/templates/common.typ": define-term, translation, term, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "system-prompt",
  proper: translation(cs: "Systémový prompt", en: "System Prompt"),
  explanation_cs: "Instrukční vrstva s vysokou prioritou, která vymezuje roli, chování, dostupné prostředky a provozní mantinely jazykového modelu nebo agenta.",
  explanation_en: "A high-priority instruction layer that defines the role, behavior, available capabilities, and operating constraints of a language model or agent.",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
)

#let item = concept(
  key: "system_prompt",
  term: terminology,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "prompt_engineering"),),
)