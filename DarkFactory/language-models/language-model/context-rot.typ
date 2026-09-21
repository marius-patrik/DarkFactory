#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_rot",
  czech: "Degradace kontextu",
  english: "Context Rot",
  citation: bib.liu2024,
  source: bib.liu2024,
  definition: terms => [
Pokles schopnosti modelu spolehlivě využívat informace v dlouhém nebo zahlceném kontextu.
  ],
  description: terms => [
Nominální délka kontextového okna nezaručuje rovnoměrné využití všech informací; výkon může klesat zejména u relevantních údajů umístěných uvnitř dlouhého vstupu. #cite(bib.liu2024)
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
