#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "divergence",
  czech: "Patologie divergence",
  english: "Agent Divergence Pathologies",
  citation: bib.shinn2023reflexion,
  source: bib.shinn2023reflexion,
  definition: terms => [
Selhání agentní smyčky, při němž se běh vzdaluje cíli opakováním neúčinných kroků, oscilací nebo nekontrolovanou spotřebou zdrojů.
  ],
  description: terms => [
Typickými projevy jsou opakování stejné neúspěšné akce, střídání protichůdných změn a pokračování běhu bez měřitelného pokroku. Harness je proto musí rozpoznat pomocí pozorovaného stavu, limitů a podmínek ukončení. #cite(bib.shinn2023reflexion)
  ],
  relations: ((type: "related", target: "loop_engineering"),),
)
