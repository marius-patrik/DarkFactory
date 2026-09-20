#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "git",
    czech: "Git",
  english: "Git",
  citation: bib.chacon2014,
  source: bib.chacon2014,
definition: terms => [
Git je distribuovaný systém správy verzí, který uchovává historii projektu, podporuje větvení a slučování změn a umožňuje deterministický návrat k předchozím stavům repozitáře.
  ],
  description: terms => [
#accepted[
Pro autonomní vývoj softwaru je spolehlivá správa verzí naprosto nezbytným základem. Jazykové modely generují kód na základě statistické pravděpodobnosti, a proto se nevyhnutelně dopouštějí chyb, logických přehmatů či regresí. Verzovací systém vytváří bezpečné a deterministické prostředí, v němž lze každou úpravu zaznamenat, otestovat a v případě selhání kdykoliv vrátit zpět k funkčnímu stavu. Namísto teoretických abstrakcí práce přímo využívá distribuovaný systém #term(terms.git) v kombinaci s platformou #term(terms.github).

Samotný #term(terms.git) zde zůstává vymezen jako distribuovaný systém správy verzí. Hosting a koordinaci repozitáře popisuje #term(terms.github), zadání práce #term(terms.github_issue), revizní integraci #term(terms.pull_request) a automatizaci #term(terms.github_actions).

]
  ],
  summary: terms => [
Git poskytuje agentnímu vývoji auditovatelnou historii a možnost bezpečně izolovat, porovnávat, slučovat nebo vracet změny bez závislosti na paměti modelu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "github"),),
)