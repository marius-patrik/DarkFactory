#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "swarm",
  industry: "Swarm",
  czech: "Roj",
  english: "Swarm",
  citation: bib.autogen_swarm,
  source: bib.autogen_swarm,
  definition: terms => [
Decentralizovaný multiagentní vzor, ve kterém agenti lokálně předávají úlohu dalším agentům podle jejich schopností bez nutnosti jediného centrálního orchestrátoru.
  ],
  description: terms => [
Jednotliví účastníci sdílejí pracovní kontext a rozhodnutí o dalším aktivním agentovi vzniká prostřednictvím handoffů mezi členy týmu. #cite(bib.autogen_swarm)
  ],
  relations: ((type: "dependency", target: "handoff"),),
)
