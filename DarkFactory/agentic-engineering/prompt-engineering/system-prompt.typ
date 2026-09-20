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
  heading: terms => [#term(terms.system_prompt, render: "both", detail-language: "cs", detail-style: "inline", marker: false, linked: false, emphasized: false)],
  theory_enabled: false,
  theory_intro: none,
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "prompt_engineering"),)
)