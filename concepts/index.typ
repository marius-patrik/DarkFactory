#import "schema.typ": all-concepts, build-vocabulary, render-theory-chapter, render-practical-chapter
#import "01-development-environment/index.typ" as development_environment
#import "02-language-models/index.typ" as language_models
#import "03-agentic-engineering/index.typ" as agentic_engineering

#let sections = (
  development_environment.item,
  language_models.item,
  agentic_engineering.item,
)

#let concepts = all-concepts(sections)
#let vocabulary = build-vocabulary(sections)

#let render-theory() = render-theory-chapter(sections, vocabulary)
#let render-practical() = render-practical-chapter(sections, vocabulary)
