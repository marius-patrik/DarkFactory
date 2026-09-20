#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "codex-image.typ" as screenshot


#let item = concept(
  key: "codex",
    industry: "Codex",
  czech: "Codex",
  english: "Codex",
definition: terms => [Codex je agentní vývojový systém OpenAI určený pro samostatné plnění softwarově-inženýrských úloh.],
  description: terms => [Desktopová aplikace umožňuje řídit více agentů paralelně, oddělovat jejich práci do vláken a worktree, kontrolovat diffy a delegovat dlouhotrvající úlohy. Tím představuje praktický příklad harnessu, který rozšiřuje model o stav, nástroje, izolaci a pracovní postup.],
  summary: terms => [Codex ukazuje posun od generování fragmentů k řízenému agentnímu vývojovému procesu.],
  attachments: (screenshot.item,),
  citations: (bib.openai_codex_app,),
  relations: ((type: "related", target: "harness"),)
)
