#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "graph_engineering",
    industry: "Graph Engineering",
  czech: "Inženýrství pracovních grafů",
  english: "Workflow-graph Engineering",
  citation: bib.wu2023autogen,
  source: bib.wu2023autogen,
definition: terms => [
Inženýrství pracovních grafů je návrh agentních nebo automatizačních workflow jako explicitních grafů uzlů, závislostí a přechodů namísto jediné neomezené smyčky.
  ],
  description: terms => [
#finalized[
Graf umožňuje explicitně řídit pořadí, paralelizaci a kontrolní body vícefázové úlohy. Dílčí práci lze delegovat pomocí #term(terms.subagent) a její závislosti vyjádřit pomocí #term(terms.dag).
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "agent_loop"),),
)