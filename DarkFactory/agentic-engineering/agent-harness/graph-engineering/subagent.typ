#import "/DarkFactory/templates/common.typ": translation, unconfirmed, bib
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
#unconfirmed[
Při hierarchické dělbě práce hlavní orchestrátor rozděluje rozsáhlou úlohu a jednotlivé části deleguje specializovaným subagentům, například pro průzkum repozitáře, plánování nebo implementaci. Po dokončení dílčího běhu může nadřazený agent převzít pouze jeho výsledek namísto celé pracovní historie subagenta.
]
  ],
  summary: terms => [
Subagenti umožňují paralelní nebo specializovanou práci a současně omezují množství dílčí pracovní historie, které musí zůstat v kontextu hlavního orchestrátoru.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "graph_engineering"), (type: "related", target: "agent")),
)
