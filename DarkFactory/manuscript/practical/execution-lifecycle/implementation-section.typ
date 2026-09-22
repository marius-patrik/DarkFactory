#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_implementation_body",
  title: [Implementace],
  definition: terms => [
Po schválení plánu systém provede požadovanou změnu nad pracovním prostředím repozitáře.
  ],
  description: terms => [
Model může navrhovat a provádět kroky prostřednictvím dostupných schopností, ale zdrojem pravdy zůstává pozorovaný stav pracovního stromu a skutečně provedené účinky. Tato část proto popisuje provedení změny, nikoli její následné hodnocení. #cite(bib.darkfactory)
  ],
)
