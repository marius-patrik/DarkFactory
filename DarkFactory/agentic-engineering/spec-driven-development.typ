#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "spec_driven_development",
  industry: "Spec-Driven Development",
  czech: "Vývoj řízený specifikací",
  citation: bib.fowler2025sdd,
  source: bib.fowler2025sdd,
  definition: terms => [
Spec-Driven Development je přístup k AI-asistovanému vývoji softwaru, při němž se před implementací vytvoří explicitní specifikace a ta slouží jako zdroj pravdy pro člověka i agenta.
  ],
  description: terms => [
Specifikace odděluje požadované chování a omezení od konkrétní implementace a používá se při plánování, generování a ověřování změn. #cite(bib.fowler2025sdd)
  ],
  relations: (
    (type: "related", target: "planning"),
    (type: "related", target: "integration_test"),
    (type: "related", target: "vibe_coding"),
  ),
)
