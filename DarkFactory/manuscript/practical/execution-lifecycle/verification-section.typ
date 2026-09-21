#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_verification_lifecycle_body",
  title: [Ověření a revize],
  definition: terms => [
Výsledek implementace je nejprve deterministicky ověřen a následně prochází samostatnou review/fix smyčkou.
  ],
  description: terms => [
Automatické kontroly vycházejí z pozorovaných změn a skutečně spuštěných verifikačních akcí. Revize následně hledá problémy v implementaci a může vyvolat opravu a nové ověření; pokud oprava vyžaduje materiální práci mimo schválený Planning, musí být rozsah explicitně změněn a schválen. #cite(bib.darkfactory)
  ],
)
