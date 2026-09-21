#import "/DarkFactory/templates/common.typ": scope-note
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "harness_engineering",
  industry: "Harness Engineering",
  czech: "Harnessové inženýrství",
  definition: terms => [
Harness Engineering je návrh, implementace a provoz běhové vrstvy, která propojuje jazykový model s nástroji, stavem a kontrolními mechanismy.
  ],
  description: terms => [
Určuje, jak jsou model, nástroje, stav a kontrolní mechanismy spojeny do implementovatelného a ověřitelného agentního systému.

#scope-note[Termín Harness Engineering je zde použit jako zastřešující označení. Před finalizací rozhodnout, zda jej opřít o autoritativní zdroj, nebo výslovně vymezit jako pracovní termín této práce.]
  ],
  relations: ((type: "dependency", target: "agentic_engineering"),),
)
