#import "/DarkFactory/schema.typ": build-vocabulary, render-document-chapter, render-folders, render-theory-chapter, render-practical-chapter
#import "/DarkFactory/manuscript/introduction/index.typ" as introduction
#import "/DarkFactory/manuscript/results/index.typ" as results
#import "/DarkFactory/manuscript/conclusion/index.typ" as conclusion
#import "/DarkFactory/manuscript/appendices/index.typ" as appendices
#import "/DarkFactory/development-environment/index.typ" as development_environment
#import "/DarkFactory/language-models/index.typ" as language_models
#import "/DarkFactory/agentic-engineering/index.typ" as agentic_engineering

#let folders = (
  introduction.node,
  development_environment.node,
  language_models.node,
  agentic_engineering.node,
  results.node,
  conclusion.node,
  appendices.node,
)

#let vocabulary = build-vocabulary(folders)

#let render-introduction() = render-document-chapter(introduction.node, vocabulary)
#let render-theory() = render-theory-chapter(folders, vocabulary)
#let render-practical() = render-practical-chapter(folders, vocabulary)
#let render-results() = render-document-chapter(results.node, vocabulary)
#let render-conclusion() = render-document-chapter(conclusion.node, vocabulary)
#let render-appendices() = render-folders((appendices.node,), vocabulary, "document", level: 1)
