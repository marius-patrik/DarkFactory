#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "results_discussion",
  czech: "Výsledky a diskuse",
  english: "Results and Discussion",
  definition: terms => [
Výsledky a diskuse hodnotí, které části navržené architektury byly ve zvoleném snapshotu DarkFactory skutečně implementovány a ověřeny a které zůstávají pouze součástí dokončovaného návrhu.
  ],
  description: terms => [
Evaluace je rozdělena do samostatných konceptů: reprodukovatelný snapshot, ověřený stav implementace, odpovědi na výzkumné otázky a omezení evaluace. Tím se oddělují pozorované výsledky od tvrzení, která by vyžadovala dosud neprovedenou koncovou akceptaci.
  ],
  summary: terms => [
DarkFactory poskytuje konkrétní implementační důkazy pro podstatnou část navrženého harnessu, ale aktuální evidence neopravňuje tvrdit dokončenou produkční autonomii ani uzavřenou flotilovou akceptaci.
  ],
)
