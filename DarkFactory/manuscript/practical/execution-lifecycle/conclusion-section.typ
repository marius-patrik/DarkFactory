#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_lifecycle_conclusion",
  title: [Závěr],
  definition: terms => [
Životní cyklus odděluje záměr, provedení, důkaz správnosti a terminální stav změny tak, aby žádná z těchto vrstev nebyla nahrazena tvrzením modelu.
  ],
  description: terms => [
Tato separace poskytuje základ pro následující evaluaci: jednotlivé mechanismy lze ověřovat samostatně a zároveň lze sledovat, zda jejich kombinace funguje na úrovni celého systému.
  ],
)
