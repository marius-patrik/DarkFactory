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

// Sdílený autorský/review kontrakt. Při přidání nové šablony musí registry
// namapovat stejné semantické helpery; kapitoly proto nikdy neimportují
// implementaci konkrétní šablony.
#let body-paragraph = gjkt.body-paragraph
#let bullet-list = gjkt.bullet-list
#let numbered-list = gjkt.numbered-list
#let paragraph = gjkt.paragraph
#let bullets = gjkt.bullets
#let numbered = gjkt.numbered
#let bilingual = gjkt.bilingual
#let localized = gjkt.localized
#let note = gjkt.note
#let issue = gjkt.issue
#let alert = gjkt.alert
#let struct-alert = gjkt.struct-alert
#let critique = gjkt.critique
#let scope-note = gjkt.scope-note
#let blue-note = gjkt.blue-note
#let added = gjkt.added
#let ai = gjkt.ai
#let draft = gjkt.draft
#let unconfirmed = gjkt.unconfirmed
#let confirmed = gjkt.confirmed
#let removed = gjkt.removed
#let diff = gjkt.diff
#let term = gjkt.term
#let kw = gjkt.kw
