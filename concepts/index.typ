#import "schema.typ": build-vocabulary, render-theory-chapter, render-practical-chapter
#import "development-environment/index.typ" as development_environment
#import "language-models/index.typ" as language_models
#import "agentic-engineering/index.typ" as agentic_engineering

#let folders = (
  development_environment.node,
  language_models.node,
  agentic_engineering.node,
)

#let vocabulary = build-vocabulary(folders)

#let render-theory() = render-theory-chapter(folders, vocabulary)
#let render-practical() = render-practical-chapter(folders, vocabulary)
