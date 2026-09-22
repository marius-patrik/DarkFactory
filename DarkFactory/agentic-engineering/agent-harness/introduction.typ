#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "harness",
  title: [Úvod],
  keyword: "Harness",
  citation: (bib.anthropic_managed_agents, bib.anthropic_harness_design),
  source: bib.anthropic_managed_agents,
  definition: terms => [
Harness je běhová vrstva kolem modelové inference, která drží stav, opakuje agentní smyčku a propojuje model s nástroji a prostředím. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Jeho odpovědností je kontinuita běhu a provedení účinků mimo model. Strategie, podle které se tyto schopnosti skládají do cíleného chování, patří až do Agentického inženýrství.
  ],
  relations: ((type: "dependency", target: "language_model"),),
)
