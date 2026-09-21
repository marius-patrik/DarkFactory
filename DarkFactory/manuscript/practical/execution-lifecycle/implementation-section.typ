#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_implementation_lifecycle_body",
  title: [Implementace],
  definition: terms => [
Po schválení Planningu runtime provádí změnu pomocí capabilities a deterministických mechanismů nad pracovním prostředím repozitáře.
  ],
  description: terms => [
Model může rozhodovat o obsahu změny a používat dostupné nástroje, ale pravdu o mutacích nevlastní jeho textový výstup. Stav souborů, diff, scope, verifikační akce, commity a další účinky jsou zjišťovány z prostředí a zachycovány vykonávacím jádrem. #cite(bib.darkfactory)
  ],
)
