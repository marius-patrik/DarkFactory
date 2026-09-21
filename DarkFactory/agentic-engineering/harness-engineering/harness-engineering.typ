#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "harness_engineering",
  industry: "Harness Engineering",
  czech: "Harnessové inženýrství",
  citation: bib.anthropic_harness_design,
  source: bib.anthropic_harness_design,
  definition: terms => [
Návrh a iterativní úprava harnessu s cílem řídit chování agenta, jeho pracovní stav, provádění a ověřování.
  ],
  description: terms => [
Konkrétní struktura harnessu ovlivňuje výkon dlouhotrvajících agentních úloh a musí se přizpůsobovat schopnostem používaného modelu místo hromadění nepotřebného scaffolding. #cite(bib.anthropic_harness_design)
  ],
  relations: ((type: "dependency", target: "agentic_engineering"), (type: "related", target: "harness")),
)
