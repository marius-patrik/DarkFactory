#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_finalization_body",
  title: [Finalizace],
  definition: terms => [
Před ukončením změny se implementace porovná se schváleným plánem a dosažený výsledek se promítne do trvalého stavu vývojového procesu.
  ],
  description: terms => [
Final Alignment kontroluje soulad hotové změny s aktuálním schváleným Planningem. Reconciliation následně sjednocuje stav navázaného Requestu, pull requestu a dalších trvalých workflow objektů podle skutečného výsledku. #cite(bib.darkfactory)
  ],
)
