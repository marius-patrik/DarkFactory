#import "schema.typ": build-vocabulary, render-document-chapter, render-theory-chapter, render-practical-chapter
#import "manuscript/introduction/index.typ" as introduction
#import "manuscript/results/index.typ" as results
#import "manuscript/conclusion/index.typ" as conclusion
#import "development-environment/index.typ" as development_environment
#import "language-models/index.typ" as language_models
#import "agentic-engineering/index.typ" as agentic_engineering

#let folders = (
  introduction.node,
  development_environment.node,
  language_models.node,
  agentic_engineering.node,
  results.node,
  conclusion.node,
)

#let vocabulary = build-vocabulary(folders)

#let render-introduction() = render-document-chapter(introduction.node, vocabulary)
#let render-theory() = render-theory-chapter(folders, vocabulary)
#let render-practical() = render-practical-chapter(folders, vocabulary)
#let render-results() = render-document-chapter(results.node, vocabulary)
#let render-conclusion() = render-document-chapter(conclusion.node, vocabulary)
