#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "goal_and_question_evaluation_body",
  title: [Vyhodnocení cílů a výzkumných otázek],
  definition: terms => [
Hlavní cíl je v této fázi doložen na úrovni návrhu, implementovaných mechanismů a automatických testů; úplné uzavření vyžaduje ještě živý df-only Request lifecycle.
  ],
  description: terms => [
Dílčí cíle zaměřené na teoretické vymezení, architekturu DarkFactory, explicitní stav, capability rozhraní, GitHub control plane, identity boundaries a automatické technické ověření mají přímé implementační nebo CI důkazy. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304)

Cíl prokázat celý řízený životní cyklus od Requestu přes schválení Planningu až po merge a následnou rekonciliaci zůstává otevřený ze stejného důvodu jako end-to-end část evaluace: jednotlivé mechanismy jsou testované, ale jeden živý produkční důkaz zatím není uložen jako uzavřený artefakt.
  ],
)
