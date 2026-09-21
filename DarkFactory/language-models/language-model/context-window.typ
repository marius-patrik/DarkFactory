#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_window",
  industry: "Context Window",
  czech: "Kontextové okno",
  english: "Context Window",
  citation: bib.liu2024,
  source: bib.liu2024,
  definition: terms => [
Maximální rozsah tokenové sekvence dostupný modelu v jednom inferenčním běhu. #cite(bib.liu2024)
  ],
  description: terms => [
Do aktivního kontextu se společně vkládají instrukce, uživatelské vstupy, historie a výsledky nástrojů. Samotná nominální délka okna nezaručuje, že model všechny vložené informace využije stejně spolehlivě. #cite(bib.liu2024)
  ],
  relations: ((type: "dependency", target: "token"),),
)
