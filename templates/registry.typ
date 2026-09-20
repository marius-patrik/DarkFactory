#import "common.typ" as common
#import "terms.typ": vocabulary
#import "gjkt-odborna-prace/template.typ" as gjkt

// Centrální registry šablon. Manuskript importuje pouze tento soubor;
// jednotlivé šablony jsou zaměnitelné implementace stejného dokumentového kontraktu.
#let default-template = "gjkt-odborna-prace"
#let available-templates = ("gjkt-odborna-prace",)

#let assert-template(name) = {
  assert(
    name in available-templates,
    message: "Unknown template " + repr(name) + ". Available templates: " + repr(available-templates),
  )
  name
}

#let template-for(name) = {
  let name = assert-template(name)
  if name == "gjkt-odborna-prace" {
    gjkt.template
  }
}

#let appendices-for(name) = {
  let name = assert-template(name)
  if name == "gjkt-odborna-prace" {
    gjkt.prilohy
  }
}

// Sdílený autorský/review kontrakt je mimo konkrétní šablony.
#let body-paragraph = common.body-paragraph
#let bullet-list = common.bullet-list
#let numbered-list = common.numbered-list
#let paragraph = common.paragraph
#let bullets = common.bullets
#let numbered = common.numbered
#let bilingual = common.bilingual
#let localized = common.localized
#let translation = common.translation
#let render-translation = common.render-translation
#let translation-heading = common.translation-heading
#let note = common.note
#let issue = common.issue
#let alert = common.alert
#let struct-alert = common.struct-alert
#let critique = common.critique
#let scope-note = common.scope-note
#let blue-note = common.blue-note
#let added = common.added
#let ai = common.ai
#let draft = common.draft
#let unconfirmed = common.unconfirmed
#let accepted = common.accepted
#let finalized = common.finalized
#let removed = common.removed
#let diff = common.diff
#let define-term = common.define-term
#let term = common.term
#let render-term = common.render-term
#let kw = common.kw
#let terms = vocabulary
#let bib = common.bib
#let term-source = common.term-source
#let term-citation = common.term-citation

#let render-keywords = common.render-keywords
