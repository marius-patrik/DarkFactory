#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_cli",
  industry: "df CLI",
  czech: "Příkazové rozhraní df",
  english: "df Command-Line Interface",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Veřejné příkazové a operátorské rozhraní DarkFactory pro spouštění a řízení funkcí systému.
  ],
  description: terms => [
Balíček `@darkfactory/cli` skládá veřejné příkazy nad sdílenými protocol, core a capability vrstvami.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"),),
)
