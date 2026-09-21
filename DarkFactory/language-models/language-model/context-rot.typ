#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_rot",
  czech: "Degradace kontextu",
  english: "Context Rot",
  citation: bib.liu2024,
  source: bib.liu2024,
  definition: terms => [
Pokles spolehlivosti, s níž model využívá relevantní informace v dlouhém nebo zahlceném kontextu.
  ],
  description: terms => [
Experimenty s dlouhým kontextem ukazují, že výkon může záviset na poloze relevantní informace a klesat, když je umístěna uvnitř dlouhého vstupu. #cite(bib.liu2024)
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
