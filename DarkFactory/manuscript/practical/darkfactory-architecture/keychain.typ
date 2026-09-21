#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_keychain",
  industry: "Keychain",
  czech: "Správa strojových přihlašovacích údajů",
  english: "Machine Credential Keychain",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Bezpečnostní hranice DarkFactory pro držení a zpřístupňování strojových přihlašovacích údajů, tokenů a souvisejících autentizačních dat.
  ],
  description: terms => [
Balíček `@darkfactory/keychain` vlastní machine credential custody a nesmí být importován browserovými balíčky; zahrnuje mimo jiné OS keychain, vault, GitHub App credentials, OAuth, redaction a diagnostiku.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"), (type: "related", target: "sandbox")),
)
