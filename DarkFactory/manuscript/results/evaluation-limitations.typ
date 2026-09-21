#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "evaluation_limitations",
  term: "Omezení evaluace",
  definition: terms => [
Vymezení tvrzení, která nelze z architektonického, testovacího a integračního ověření spolehlivě odvodit.
  ],
  description: terms => [
Práce nepředstavuje statistický benchmark úspěšnosti agentů, ceny, latence ani četnosti zacyklení na reprezentativním souboru úloh. Taková tvrzení by vyžadovala samostatný kontrolovaný experiment.

Evidence uzavřená 21. září 2026 neobsahuje jeden živý produkční běh celého Request lifecycle ani kompletní acceptance celé původně plánované fleety. Request #359 současně eviduje plný df-only lifecycle a crash/resume idempotenci jako nesplněné acceptance položky. #cite(bib.darkfactory_request_359) Výsledky proto podporují technickou realizaci a testované vlastnosti jednotlivých mechanismů, nikoli tvrzení o obecné autonomii nebo výkonnostní převaze DarkFactory nad jinými agentními systémy.
  ],
  relations: ((type: "dependency", target: "research_question_evaluation"),),
)
