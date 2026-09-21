#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "spec_driven_development",
  industry: "Spec-Driven Development",
  czech: "Vývoj řízený specifikací",
  citation: bib.fowler2025sdd,
  source: bib.fowler2025sdd,
  definition: terms => [
Přístup k AI-asistovanému vývoji, ve kterém explicitní specifikace řídí plánování, implementaci a ověřování změny. #cite(bib.fowler2025sdd)
  ],
  description: terms => [
Specifikace odděluje požadované chování a omezení od konkrétní implementace a slouží jako společný referenční bod pro člověka i agenta. #cite(bib.fowler2025sdd)
  ],
  relations: (
    (type: "related", target: "planning"),
    (type: "related", target: "integration_test"),
    (type: "related", target: "vibe_coding"),
  ),
)
