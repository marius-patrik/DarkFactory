#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "github-issue",
  proper: translation(cs: "Úloha GitHubu", en: "GitHub Issue"),
  industry: translation(cs: "Issue", en: "Issue"),
  citation: bib.dabbish2012github,
  source: bib.dabbish2012github,
)

#let item = concept(
  key: "github_issue",
  term: terminology,
  definition: terms => [
GitHub Issue je strukturovaný záznam požadavku, úkolu nebo chyby v repozitáři, který může nést popis, diskusi, štítky, přiřazení a vazby na změny kódu.
  ],
  description: terms => [
#unconfirmed[
V agentním vývojovém procesu může Issue fungovat jako explicitní vstupní specifikace úlohy. Odděluje zadání od samotné implementace a poskytuje stabilní referenční bod pro plán, pull request i následnou revizi.
]
  ],
  summary: terms => [
Issue funguje jako stabilní zdroj zadání oddělený od implementace a umožňuje pozdější plán, změny i revizi vztáhnout ke stejnému původnímu požadavku.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "github"), (type: "related", target: "pull_request")),
)
