#import "schema.typ": build-vocabulary, render-theory-chapter, render-practical-chapter
#import "01-development-environment/index.typ" as development_environment
#import "02-language-models/index.typ" as language_models
#import "03-agentic-engineering/index.typ" as agentic_engineering

#let concepts = (
  ..development_environment.concepts,
  ..language_models.concepts,
  ..agentic_engineering.concepts,
)

#let vocabulary = build-vocabulary(concepts)

#let render-theory() = render-theory-chapter(concepts, vocabulary)
#let render-practical() = render-practical-chapter(concepts, vocabulary)
