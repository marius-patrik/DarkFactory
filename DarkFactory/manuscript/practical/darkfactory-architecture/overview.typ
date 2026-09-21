#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_architecture_overview_body",
  title: [Celková architektura],
  definition: terms => [
DarkFactory odděluje stabilní běhové mechanismy od agentního a doménového chování a od externích integračních hranic.
  ],
  description: terms => [
Root Bun workspace je rozdělen na protocol, core, capability, GitHub, keychain, auth, docs, CLI a web. Core vlastní provádění a stav, capability vrstva rozšiřitelné chování, GitHub trvalou vývojovou řídicí vrstvu a samostatné auth/keychain balíčky oddělují lidskou identitu od strojových přihlašovacích údajů. #cite(bib.darkfactory)
  ],
)
