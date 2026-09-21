#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_design_goals_body",
  title: [Cíle návrhu],
  definition: terms => [
DarkFactory je navržen jako řízený autonomní systém pro vývoj softwaru, ve kterém člověk zadává záměr a schvaluje vybraná rozhodnutí, zatímco systém provádí Planning, implementaci, ověření, revizi, integraci a obnovu běhu. #cite(bib.darkfactory)
  ],
  description: terms => [
Návrh sleduje několik současně platných požadavků: běh musí být obnovitelný, skutečné změny musí být ověřovány podle pozorovaného stavu místo tvrzení modelu, agentní chování musí být rozšiřitelné mimo jádro a GitHub musí zůstat trvalou řídicí vrstvou pro Requesty, pull requesty, kontroly a autorizaci. #cite(bib.darkfactory)
  ],
)
