#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_rot",
  term: "Degradace kontextu",
  keyword: "Context Rot",
  citation: bib.liu2024,
  source: bib.liu2024,
  definition: terms => [
Degradace kontextu (Context Rot) označuje pokles spolehlivosti, s níž model využívá relevantní informace při růstu délky nebo informačního zatížení vstupního kontextu. #cite(bib.liu2024)
  ],
  description: terms => [
Experimenty s dlouhým kontextem ukazují, že výkon může záviset na poloze relevantní informace a klesat, když je umístěna uvnitř dlouhého vstupu. #cite(bib.liu2024)
  ],
  practical: terms => [
Degradace kontextu znamená, že pouhé zvětšování historie nemusí zachovat kvalitu rozhodování; agentní systém proto potřebuje selekci, sumarizaci nebo kompakci.
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
