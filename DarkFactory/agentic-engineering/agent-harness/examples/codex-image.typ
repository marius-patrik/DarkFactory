#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "codex_app_image",
  term: "Rozhraní aplikace Codex",
  citation: bib.openai_codex_app,
  source: bib.openai_codex_app,
  definition: terms => [
Oficiální produktový snímek aplikace Codex. #cite(bib.openai_codex_app)
  ],
  description: terms => [
Rozhraní pro práci s agentními úlohami a dovednostmi.
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/codex-app.webp", width: 82%),
  caption: [Aplikace Codex. Zdroj: OpenAI #cite(bib.openai_codex_app).],
)
  ],
)
