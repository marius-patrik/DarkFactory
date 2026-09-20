#import "../../../../templates/common.typ": define-term, translation, unconfirmed, bib
#import "../../../schema.typ": concept

#let terminology = define-term(
  id: "subagent",
  proper: translation(cs: "Podřízený agent", en: "Subagent"),
  industry: translation(cs: "Subagent", en: "Subagent"),
  explanation_cs: "Dočasná nebo specializovaná agentní instance, které nadřazený orchestrátor deleguje vymezenou dílčí úlohu a následně převezme její výsledek.",
  explanation_en: "A temporary or specialized agent instance to which a parent orchestrator delegates a bounded subtask and from which it later receives the result.",
  citation: bib.wu2023autogen,
  source: bib.wu2023autogen,
)

#let item = concept(
  key: "subagent",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
Při hierarchické dělbě práce hlavní orchestrátor rozděluje rozsáhlou úlohu a jednotlivé části deleguje specializovaným subagentům, například pro průzkum repozitáře, plánování nebo implementaci. Po dokončení dílčího běhu může nadřazený agent převzít pouze jeho výsledek namísto celé pracovní historie subagenta.
]
  ],
  relations: ((type: "dependency", target: "graph_engineering"), (type: "related", target: "agent"))
)
