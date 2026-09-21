#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "subagent",
  industry: "Subagent",
  czech: "Podřízený agent",
  citation: bib.wu2023autogen,
  source: bib.wu2023autogen,
  definition: terms => [
Specializovaná agentní instance, které nadřazený orchestrátor deleguje vymezenou dílčí úlohu.
  ],
  description: terms => [
Rozdělení práce mezi více agentních instancí umožňuje oddělit role a dílčí kontexty a následně předat výsledek zpět koordinujícímu procesu. #cite(bib.wu2023autogen)
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "graph_engineering")),
)
