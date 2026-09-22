#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "conclusion",
  title: [Závěr],
  definition: terms => [
Práce ukazuje, že delegování softwarové práce agentní AI vyžaduje více než samotnou schopnost jazykového modelu generovat kód: rozhodující jsou mechanismy, které mimo model udržují stav, zprostředkovávají účinky a poskytují ověřitelnou zpětnou vazbu.
  ],
  description: terms => [
DarkFactory demonstruje konkrétní realizaci tohoto přístupu a dostupná evaluace podporuje funkčnost klíčových mechanismů i jejich vybraných integrací. Výzkumné otázky proto lze uzavřít na úrovni řízené autonomie, obnovitelnosti běhu a oddělení trvalého stavu od omezeného modelového kontextu.

Rozsah závěru je omezen provedenými důkazy: práce neprokazuje obecnou převahu DarkFactory ani jeden úplný živý průchod celým produkčním životním cyklem změny. Tato hranice je součástí výsledku evaluace, nikoli nahrazena silnějším tvrzením. #cite(bib.darkfactory_request_359)
  ],
)
