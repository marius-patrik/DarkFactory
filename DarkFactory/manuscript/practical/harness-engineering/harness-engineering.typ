#import "/DarkFactory/templates/common.typ": scope-note
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "harness_engineering",
  industry: "Harness Engineering",
  czech: "Harnessové inženýrství",
  definition: terms => [
Návrh, implementace a provoz běhové vrstvy, která propojuje jazykový model s nástroji, stavem a kontrolními mechanismy.
  ],
  description: terms => [
V praktické části určuje, jak jsou model, nástroje, stav, provádění a deterministické kontroly spojeny do implementovatelného a ověřitelného systému.

#scope-note[Termín Harness Engineering je zde použit jako zastřešující označení. Před finalizací rozhodnout, zda jej opřít o autoritativní zdroj, nebo výslovně vymezit jako pracovní termín této práce.]
  ],
  relations: ((type: "dependency", target: "agentic_engineering"),),
)
