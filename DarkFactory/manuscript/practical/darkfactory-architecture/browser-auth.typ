#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_browser_auth",
  industry: "Auth",
  czech: "Autentizace uživatele",
  english: "Browser Authentication",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Oddělená browser-safe hranice pro lidskou autentizaci a session DarkFactory Web.
  ],
  description: terms => [
`@darkfactory/auth` odděluje uživatelskou GitHub autentizaci od machine credentials, refresh tokenů, client secrets a GitHub App private-key operací, které zůstávají mimo browserovou část.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"), (type: "related", target: "darkfactory_keychain")),
)
