#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_verification_review_body",
  title: [Ověření a revize],
  definition: terms => [
Po implementaci se odděluje strojově pozorovatelný výsledek změny od jeho následného kvalitativního posouzení.
  ],
  description: terms => [
#term(terms.deterministic_verification) zajišťuje důkaz o tom, co se skutečně stalo; #term(terms.review_fix_loop) nad tímto výsledkem rozhoduje, zda je potřeba další oprava. Nová oprava vrací změnu zpět do ověřovacího cyklu. #cite(bib.darkfactory)
  ],
)
