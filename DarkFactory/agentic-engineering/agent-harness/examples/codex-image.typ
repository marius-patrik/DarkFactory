#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "codex-app-image",
  proper: translation(cs: "Rozhraní aplikace Codex", en: "Codex App Interface"),
  keyword: false,
)

#let item = concept(
  key: "codex_app_image",
  term: terminology,
  definition: terms => [Oficiální produktový snímek aplikace Codex.],
  description: terms => [Snímek dokumentuje specializované rozhraní pro práci s agentními úlohami a dovednostmi.],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/codex-app.webp", width: 82%),
  caption: [Aplikace Codex. Zdroj: OpenAI.],
)
  ],
  summary: terms => [Vizuální příklad agentního vývojového prostředí.],
  citations: (bib.openai_codex_app,),
)
