#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "harness_engineering",
  industry: "Harness Engineering",
  czech: "Harnessové inženýrství",
  definition: terms => [
Návrh, implementace a provoz harnessu, který propojuje jazykový model s nástroji, stavem, kontextem a kontrolními mechanismy.
  ],
  description: terms => [
Zaměřuje se na strukturu běhové vrstvy, její rozhraní a deterministické mechanismy, které převádějí modelový výstup na řízené a ověřitelné jednání.
  ],
  relations: ((type: "dependency", target: "agentic_engineering"), (type: "related", target: "harness")),
)
