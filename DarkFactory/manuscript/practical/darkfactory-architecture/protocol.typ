#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_protocol",
  industry: "Protocol",
  czech: "Protokol DarkFactory",
  english: "DarkFactory Protocol",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Sdílená vrstva serializovaných schémat a kontraktů používaná mezi balíčky DarkFactory a capabilities.
  ],
  description: terms => [
Balíček `@darkfactory/protocol` exportuje kontrakty pro modely, workflow, Planning, review, kvóty, zachycení výsledků a recovery a je navržen jako bezpečný pro runtime i browserové použití.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"),),
)
