#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept
#import "codex-image.typ" as screenshot

#let item = concept(
  key: "codex",
  keyword: "Codex",
  citation: bib.openai_codex_app,
  source: bib.openai_codex_app,
  definition: terms => [
Agentní vývojový systém OpenAI určený pro samostatné plnění softwarově-inženýrských úloh. #cite(bib.openai_codex_app)
  ],
  description: terms => [
Desktopová aplikace umožňuje řídit více agentů paralelně, oddělovat jejich práci do vláken a worktree, kontrolovat diffy a delegovat dlouhotrvající úlohy. #cite(bib.openai_codex_app)
  ],
  attachments: (screenshot.item,),
  relations: ((type: "related", target: "harness"),),
)
