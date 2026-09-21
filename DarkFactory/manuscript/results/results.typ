#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "results_discussion",
  czech: "Výsledky a diskuse",
  english: "Results and Discussion",
  definition: terms => [
Výsledky a diskuse vyhodnocují, jak návrh DarkFactory odpovídá stanoveným cílům a výzkumným otázkám.
  ],
  description: terms => [
Výsledky odpovídají na O1–O3 a odděleně vymezují hranice toho, co lze z provedeného ověření tvrdit.
  ],
  relations: ((type: "dependency", target: "darkfactory_architecture"),),
)
