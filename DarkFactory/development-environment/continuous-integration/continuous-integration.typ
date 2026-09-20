#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "continuous_integration",
    industry: "CI",
  czech: "Průběžná integrace",
  english: "Continuous Integration",
  citation: bib.humble2010,
  source: bib.humble2010,
definition: terms => [
Průběžná integrace (CI) je vývojová praxe, při níž se změny často integrují a automaticky ověřují sestavením, testy a dalšími kontrolami.
  ],
  description: terms => [
#unconfirmed[
Samotný jazykový model kód pouze generuje na základě statistických závislostí v trénovacích datech; nemá schopnost vnitřně ověřit, zda je vytvořený program syntakticky bezchybný a funkčně správný. Nezastupitelnou roli objektivního arbitra správnosti proto plní kontinuální integrace (CI) @humble2010.

Konkrétní automatizační platformu popisuje #term(terms.github_actions), izolaci běhu #term(terms.container) a problematiku nedeterministických selhání #term(terms.flaky_test). Koncept CI zde zůstává zaměřen na integrační kontrakt a strojově ověřitelnou zpětnou vazbu.

Riziko nestálých testů je vyčleněno do samostatného konceptu #term(terms.flaky_test).
]
  ],
  summary: terms => [
V agentním vývoji CI poskytuje strojově ověřitelnou zpětnou vazbu, která odděluje generování změny od jejího objektivního ověření.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "version_control"),),
)