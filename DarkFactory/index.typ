#import "/DarkFactory/schema.typ": folder, build-vocabulary, collect-concepts, render-folders
#import "/DarkFactory/templates/common.typ": translation
#import "/DarkFactory/manuscript/introduction/index.typ" as introduction
#import "/DarkFactory/language-models/index.typ" as language_models
#import "/DarkFactory/agentic-engineering/agent-harness/index.typ" as harness
#import "/DarkFactory/software-engineering/index.typ" as ai_assisted_agentic
#import "/DarkFactory/manuscript/darkfactory/index.typ" as darkfactory
#import "/DarkFactory/manuscript/results/index.typ" as results
#import "/DarkFactory/manuscript/conclusion/index.typ" as conclusion
#import "/DarkFactory/manuscript/appendices/index.typ" as appendices

#let manuscript-folders = (
  introduction.node,
  language_models.node,
  harness.node,
  ai_assisted_agentic.node,
  darkfactory.node,
  results.node,
  conclusion.node,
)

#let appendix-folders = (appendices.node,)

#let root = folder(
  key: "DarkFactory",
  title: translation(
    cs: "AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory",
    en: "AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory",
  ),
  children: manuscript-folders + appendix-folders,
)

#let folders = root.children
#let book-title = root.title
#let vocabulary = build-vocabulary(folders)
#let concepts = collect-concepts(folders)

#let render-manuscript() = render-folders(manuscript-folders, vocabulary, level: 1)
#let render-appendices() = render-folders(appendix-folders, vocabulary, level: 1)
