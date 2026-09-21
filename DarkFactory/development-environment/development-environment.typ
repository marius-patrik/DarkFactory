#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "development_environment",
  czech: "Vývojové prostředí a praxe",
  english: "Development Environment and Practices",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Verzovací, plánovací, integrační a kontrolní mechanismy, ve kterých agent provádí změny softwaru.
  ],
  description: terms => [
Tyto mechanismy poskytují explicitní stav repozitáře, ověřování změn a kontrolní body nezávislé na tvrzení modelu.
  ],
  relations: ((type: "dependency", target: "darkfactory_architecture"),),
)
