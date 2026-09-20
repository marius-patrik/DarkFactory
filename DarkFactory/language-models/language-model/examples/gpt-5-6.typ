#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept
#import "gpt-5-6-image.typ" as visual
#let terminology = define-term(id: "gpt-5-6", proper: translation(cs: "GPT-5.6", en: "GPT-5.6"), industry: translation(cs: "GPT-5.6", en: "GPT-5.6"), keyword: false)
#let item = concept(
  key: "gpt_5_6", term: terminology,
  definition: terms => [GPT-5.6 je modelová řada OpenAI vydaná v roce 2026 ve variantách Sol, Terra a Luna.],
  description: terms => [Jde o příklad současného jazykového modelu, který je nasazován jako inferenční komponenta v produktech včetně ChatGPT a Codexu; aplikační schopnosti těchto produktů však vznikají až propojením modelu s jejich harnessy.],
  summary: terms => [Příklad odděluje modelovou vrstvu od agentního systému, který model používá.],
  attachments: (visual.item,), citations: (bib.openai_gpt56,), relations: ((type: "related", target: "language_model"),)
)
