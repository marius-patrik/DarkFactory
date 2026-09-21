#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "codex-image.typ" as screenshot


#let item = concept(
  key: "codex",
    industry: "Codex",
  czech: "Codex",
  english: "Codex",
definition: terms => [Codex je agentní vývojový systém OpenAI určený pro samostatné plnění softwarově-inženýrských úloh.],
  description: terms => [Desktopová aplikace umožňuje řídit více agentů paralelně, oddělovat jejich práci do vláken a worktree, kontrolovat diffy a delegovat dlouhotrvající úlohy.],
  attachments: (screenshot.item,),
  citations: (bib.openai_codex_app,),
  relations: ((type: "related", target: "harness"),)
)
