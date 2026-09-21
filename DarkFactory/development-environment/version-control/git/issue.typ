#import "/DarkFactory/templates/common.typ": translation, finalized, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "github_issue",
    industry: "Issue",
  czech: "Úloha GitHubu",
  english: "GitHub Issue",
  citation: bib.dabbish2012github,
  source: bib.dabbish2012github,
definition: terms => [
GitHub Issue je strukturovaný záznam požadavku, úkolu nebo chyby v repozitáři, který může nést popis, diskusi, štítky, přiřazení a vazby na změny kódu.
  ],
  description: terms => [
#finalized[
V agentním vývojovém procesu může Issue fungovat jako explicitní vstupní specifikace úlohy. Odděluje zadání od samotné implementace a poskytuje stabilní referenční bod pro plán, pull request i následnou revizi.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "github"), (type: "related", target: "pull_request")),
)
