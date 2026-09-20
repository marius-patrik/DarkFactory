#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept
#import "codex-image.typ" as screenshot

#let terminology = define-term(
  id: "openai-codex",
  proper: translation(cs: "Codex", en: "Codex"),
  industry: translation(cs: "Codex", en: "Codex"),
  keyword: false,
)

#let item = concept(
  key: "codex",
  term: terminology,
  definition: terms => [Codex je agentní vývojový systém OpenAI určený pro samostatné plnění softwarově-inženýrských úloh.],
  description: terms => [Desktopová aplikace umožňuje řídit více agentů paralelně, oddělovat jejich práci do vláken a worktree, kontrolovat diffy a delegovat dlouhotrvající úlohy. Tím představuje praktický příklad harnessu, který rozšiřuje model o stav, nástroje, izolaci a pracovní postup.],
  summary: terms => [Codex ukazuje posun od generování fragmentů k řízenému agentnímu vývojovému procesu.],
  attachments: (screenshot.item,),
  citations: (bib.openai_codex_app,),
  relations: ((type: "related", target: "harness"),)
)
