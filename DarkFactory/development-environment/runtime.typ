#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "runtime",
  industry: "Runtime",
  czech: "Běhové prostředí",
  english: "Runtime Environment",
  citation: bib.merkel2014docker,
  source: bib.merkel2014docker,
  definition: terms => [
Běhové prostředí je prostředí, ve kterém se program nebo agent skutečně vykonává a ve kterém má k dispozici procesy, souborový systém, proměnné prostředí, síť a další systémové prostředky.
  ],
  description: terms => [
Pro agentní systém určuje runtime praktické hranice toho, co může během úlohy provést. Harness může běh izolovat v kontejneru nebo jiném sandboxu, přidělit mu pracovní adresář, potřebné nástroje a oprávnění a po dokončení zachovat pouze požadované výstupy.

Oddělení runtime od modelu je důležité také pro reprodukovatelnost: stejný model může v různých prostředích disponovat zcela odlišnými nástroji, soubory a systémovými možnostmi.
  ],
  relations: ((type: "related", target: "sandbox"),),
)
