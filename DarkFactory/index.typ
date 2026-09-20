#import "/DarkFactory/schema.typ": folder, build-vocabulary, collect-concepts, render-folders
#import "/DarkFactory/templates/common.typ": translation
#import "/DarkFactory/manuscript/introduction/index.typ" as introduction
#import "/DarkFactory/manuscript/results/index.typ" as results
#import "/DarkFactory/manuscript/conclusion/index.typ" as conclusion
#import "/DarkFactory/manuscript/appendices/index.typ" as appendices
#import "/DarkFactory/development-environment/index.typ" as development_environment
#import "/DarkFactory/language-models/index.typ" as language_models
#import "/DarkFactory/agentic-engineering/index.typ" as agentic_engineering

#let manuscript-folders = (
  introduction.node,
  development_environment.node,
  language_models.node,
  agentic_engineering.node,
  results.node,
  conclusion.node,
)

#let appendix-folders = (appendices.node,)

#let root = folder(
  key: "DarkFactory",
  title: translation(cs: "DarkFactory", en: "DarkFactory"),
  children: manuscript-folders + appendix-folders,
)

#let folders = root.children
#let book-title = root.title
#let vocabulary = build-vocabulary(folders)
#let concepts = collect-concepts(folders)

#let render-manuscript() = render-folders(manuscript-folders, vocabulary, level: 1)
#let render-appendices() = render-folders(appendix-folders, vocabulary, level: 1)
