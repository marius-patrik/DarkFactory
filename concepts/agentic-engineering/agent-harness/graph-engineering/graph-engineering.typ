#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "graph-engineering",
    proper: translation(cs: "Inženýrství pracovních grafů", en: "Workflow-graph Engineering"),
    industry: translation(cs: "Graph Engineering", en: "Graph Engineering"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Návrh agentních nebo automatizačních pracovních postupů jako explicitních grafů uzlů, závislostí a přechodů namísto jediné neomezené smyčky.",
    explanation_en: "The design of agentic or automation workflows as explicit graphs of nodes, dependencies, and transitions rather than as one unconstrained loop.",
    citation: bib.wu2023autogen,
    source: bib.wu2023autogen,
)

#let item = concept(
  key: "graph_engineering",
  term: terminology,
  theory_enabled: true,
  theory_intro: terms => [
#accepted[
Monolitická agentní smyčka selhává při řešení komplexních, vícefázových úloh. Pro spolehlivé škálování se v moderních systémech uplatňuje hierarchická dělba práce a formalizace procesu do podoby grafu.
]

#unconfirmed[
Klíčové přístupy ke škálování zahrnují:
- #diff[Subagenti (_Subagents_)][Subagenti (_Subagents_ @wu2023autogen)]: Hlavní orchestrátor dekomponuje rozsáhlou úlohu a deleguje dílčí kroky na specializované agenty (např. průzkumník repozitáře, plánovač, kódovací dělník). Po dokončení je kontext subagenta zahozen a orchestrátor obdrží pouze čistý výsledek, což chrání primární kontext před znečištěním (_context pollution_).
- Pracovní postupy jako grafy (#term(terms.dag, language: "en", marker: false, linked: false, emphasized: false) / Graph Engineering): Životní cyklus požadavku je modelován jako orientovaný acyklický graf (příjem $arrow$ plán $arrow$ kód $arrow$ testy $arrow$ schválení). Hrany definují striktní závislosti (`needs`); selhání v libovolném uzlu okamžitě zastaví navazující kroky.
]
  ],
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "agent_loop"),)
)