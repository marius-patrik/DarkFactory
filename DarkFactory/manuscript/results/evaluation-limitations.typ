#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "evaluation_limitations",
  czech: "Omezení evaluace",
  english: "Evaluation Limitations",
  definition: terms => [
Vymezení tvrzení, která nelze z architektonického, testovacího a integračního ověření spolehlivě odvodit.
  ],
  description: terms => [
Práce nepředstavuje statistický benchmark úspěšnosti agentů, ceny, latence ani četnosti zacyklení na reprezentativním souboru úloh. Taková tvrzení by vyžadovala samostatný kontrolovaný experiment.

Aktuální evidence také ještě neobsahuje jeden živý produkční běh celého Request lifecycle ani uzavřenou fleet-level evaluaci všech cílových repozitářů. Výsledky proto zatím podporují technickou realizaci a testované vlastnosti jednotlivých mechanismů, nikoli tvrzení o obecné autonomii nebo převaze DarkFactory nad jinými agentními systémy.
  ],
  relations: ((type: "dependency", target: "research_question_evaluation"),),
)
