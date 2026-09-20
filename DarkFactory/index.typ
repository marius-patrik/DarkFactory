#import "/DarkFactory/schema.typ": folder, build-vocabulary, render-document-chapter, render-folders, render-theory-chapter, render-practical-chapter
#import "/DarkFactory/templates/common.typ": translation
#import "/DarkFactory/manuscript/introduction/index.typ" as introduction
#import "/DarkFactory/manuscript/results/index.typ" as results
#import "/DarkFactory/manuscript/conclusion/index.typ" as conclusion
#import "/DarkFactory/manuscript/appendices/index.typ" as appendices
#import "/DarkFactory/development-environment/index.typ" as development_environment
#import "/DarkFactory/language-models/index.typ" as language_models
#import "/DarkFactory/agentic-engineering/index.typ" as agentic_engineering

#let content-folders = (
  introduction.node,
  development_environment.node,
  language_models.node,
  agentic_engineering.node,
  results.node,
  conclusion.node,
  appendices.node,
)

// The book itself is the top structural folder. Its key intentionally matches
// the directory name, so the main title is owned by structure rather than metadata.
#let root = folder(
  key: "DarkFactory",
  title: translation(cs: "DarkFactory", en: "DarkFactory"),
  children: content-folders,
)

#let folders = root.children
#let book-title = root.title
#let vocabulary = build-vocabulary(folders)

#let render-introduction() = render-document-chapter(introduction.node, vocabulary)
#let render-theory() = render-theory-chapter(folders, vocabulary)
#let render-practical() = render-practical-chapter(folders, vocabulary)
#let render-results() = render-document-chapter(results.node, vocabulary)
#let render-conclusion() = render-document-chapter(conclusion.node, vocabulary)
#let render-appendices() = render-folders((appendices.node,), vocabulary, "document", level: 1)
