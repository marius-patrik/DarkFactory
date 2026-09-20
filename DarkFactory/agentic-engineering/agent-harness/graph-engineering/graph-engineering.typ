#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "graph-engineering",
    proper: translation(cs: "Inženýrství pracovních grafů", en: "Workflow-graph Engineering"),
    industry: translation(cs: "Graph Engineering", en: "Graph Engineering"),
    citation: bib.wu2023autogen,
    source: bib.wu2023autogen,
)

#let item = concept(
  key: "graph_engineering",
  term: terminology,
  definition: terms => [
Inženýrství pracovních grafů je návrh agentních nebo automatizačních workflow jako explicitních grafů uzlů, závislostí a přechodů namísto jediné neomezené smyčky.
  ],
  description: terms => [
#accepted[
Monolitická agentní smyčka selhává při řešení komplexních, vícefázových úloh. Pro spolehlivé škálování se v moderních systémech uplatňuje hierarchická dělba práce a formalizace procesu do podoby grafu.
]

#unconfirmed[
#diff[
Klíčové přístupy ke škálování zahrnují:
- Subagenti (_Subagents_ @wu2023autogen): Hlavní orchestrátor dekomponuje rozsáhlou úlohu a deleguje dílčí kroky na specializované agenty (např. průzkumník repozitáře, plánovač, kódovací dělník). Po dokončení je kontext subagenta zahozen a orchestrátor obdrží pouze čistý výsledek, což chrání primární kontext před znečištěním (_context pollution_).
- Pracovní postupy jako grafy (#term(terms.dag, language: "en", marker: false, linked: false, emphasized: false) / Graph Engineering): Životní cyklus požadavku je modelován jako orientovaný acyklický graf (příjem $arrow$ plán $arrow$ kód $arrow$ testy $arrow$ schválení). Hrany definují striktní závislosti (`needs`); selhání v libovolném uzlu okamžitě zastaví navazující kroky.
][
Škálování je dále rozloženo na dva samostatné koncepty: hierarchickou delegaci prostřednictvím #term(terms.subagent) a explicitní závislosti pracovního postupu prostřednictvím #term(terms.dag).
]
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