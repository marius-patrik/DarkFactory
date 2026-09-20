#import "../../../../templates/common.typ": define-term, translation, unconfirmed, bib
#import "../../../schema.typ": concept

#let terminology = define-term(
  id: "github-issue",
  proper: translation(cs: "Úloha GitHubu", en: "GitHub Issue"),
  industry: translation(cs: "Issue", en: "Issue"),
  explanation_cs: "Strukturovaný záznam požadavku, úkolu nebo chyby v repozitáři, který může nést popis, diskusi, štítky, přiřazení a vazby na změny kódu.",
  explanation_en: "A structured repository record for a request, task, or defect that can carry a description, discussion, labels, assignments, and links to code changes.",
  citation: bib.dabbish2012github,
  source: bib.dabbish2012github,
)

#let item = concept(
  key: "github_issue",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
V agentním vývojovém procesu může Issue fungovat jako explicitní vstupní specifikace úlohy. Odděluje zadání od samotné implementace a poskytuje stabilní referenční bod pro plán, pull request i následnou revizi.
]
  ],
  relations: ((type: "related", target: "github"), (type: "related", target: "pull_request"))
)
