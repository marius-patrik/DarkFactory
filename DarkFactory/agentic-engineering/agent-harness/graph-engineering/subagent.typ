#import "/DarkFactory/templates/common.typ": translation, finalized, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "subagent",
    industry: "Subagent",
  czech: "Podřízený agent",
  english: "Subagent",
  citation: bib.wu2023autogen,
  source: bib.wu2023autogen,
definition: terms => [
Subagent je dočasná nebo specializovaná agentní instance, které nadřazený orchestrátor deleguje vymezenou dílčí úlohu a následně převezme její výsledek.
  ],
  description: terms => [
#finalized[
Subagent izoluje dílčí práci, například průzkum, plánování nebo implementaci, a může nadřazenému orchestrátoru vrátit pouze výsledek místo celé pracovní historie.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "graph_engineering"), (type: "related", target: "agent")),
)
