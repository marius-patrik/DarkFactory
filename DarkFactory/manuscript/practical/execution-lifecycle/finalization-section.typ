#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_finalization_body",
  title: [Finalizace],
  definition: terms => [
Finalizace odděluje poslední kontrolu hotové změny od následné aktualizace trvalého workflow stavu.
  ],
  description: terms => [
#term(terms.final_alignment) uzavírá otázku souladu s posledním schváleným plánem; teprve potom #term(terms.darkfactory_reconciliation) promítá dosažený terminální výsledek do navázaných trvalých objektů. #cite(bib.darkfactory)
  ],
)
