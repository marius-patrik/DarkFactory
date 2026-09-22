#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "harness",
  title: [Harness],
  keyword: "Harness",
  citation: (bib.anthropic_managed_agents, bib.anthropic_harness_design),
  source: bib.anthropic_managed_agents,
  definition: terms => [
Harness je běhová vrstva kolem modelové inference, která drží stav, opakuje agentní smyčku a propojuje model s nástroji a prostředím. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Jeho odpovědností je kontinuita běhu a provedení účinků mimo model. Strategie, podle které se tyto schopnosti skládají do cíleného chování, patří do agentického inženýrství.
  ],
  practical: terms => [
Harness umožňuje převést jednotlivé modelové inference na dlouhotrvající agentní běh, který může udržovat stav, používat nástroje a pracovat se skutečným prostředím.
  ],
  relations: ((type: "dependency", target: "language_model"),),
  conclusion: terms => [
Harness doplňuje modelovou inferenci o kontinuitu běhu a rozhraní pro pozorování a změnu externího prostředí. Tím vzniká stavový agentní systém schopný jednat; výběr kontextu, řízení chování a rozdělování práce jsou navazujícími návrhovými rozhodnutími agentického inženýrství.
  ],
)
