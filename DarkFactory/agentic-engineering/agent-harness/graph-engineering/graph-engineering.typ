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
Monolitická agentní smyčka selhává při řešení komplexních, vícefázových úloh. Pro spolehlivé škálování se v moderních systémech uplatňuje hierarchická dělba práce a formalizace procesu do podoby grafu.
]

#unconfirmed[
Škálování je dále rozloženo na dva samostatné koncepty: hierarchickou delegaci prostřednictvím #term(terms.subagent) a explicitní závislosti pracovního postupu prostřednictvím #term(terms.dag).
]
  ],
  summary: terms => [
Grafová struktura umožňuje rozdělit složitou úlohu na kontrolovatelné kroky, oddělit jejich odpovědnosti a explicitně řídit závislosti mezi nimi.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "agent_loop"),),
)