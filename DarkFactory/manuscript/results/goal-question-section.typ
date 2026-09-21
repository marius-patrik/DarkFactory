#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "goal_and_question_evaluation_body",
  title: [Vyhodnocení cílů a výzkumných otázek],
  definition: terms => [
Hlavní cíl byl naplněn návrhem a implementací oddělené harness architektury a technickým ověřením jejích klíčových mechanismů na systému DarkFactory.
  ],
  description: terms => [
Teoretické vymezení, architektura DarkFactory, explicitní stav, capability rozhraní, GitHub control plane, identity boundaries a automatické technické ověření mají přímé implementační nebo CI důkazy. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304)

Evaluace současně ověřila hranici dostupných důkazů: celý živý řízený životní cyklus od schválení Planningu až po merge a rekonciliaci nebyl v uzavřeném evidence setu prokázán. Tento výsledek je uveden jako omezení a nebrání vyhodnocení mechanismů, které byly implementovány a reprodukovatelně testovány.
  ],
)
