#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_web",
  industry: "DarkFactory Web",
  czech: "Webové rozhraní DarkFactory",
  english: "DarkFactory Web",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Browserové operátorské a renderovací rozhraní DarkFactory.
  ],
  description: terms => [
`@darkfactory/web` používá pouze browser-safe protocol, GitHub a auth kontrakty a nesmí importovat machine-secret implementace z keychain vrstvy.
  ],
  relations: ((type: "dependency", target: "darkfactory_browser_auth"),),
)
