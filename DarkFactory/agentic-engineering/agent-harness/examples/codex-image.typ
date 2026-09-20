#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "codex_app_image",
    czech: "Rozhraní aplikace Codex",
  english: "Codex App Interface",
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
