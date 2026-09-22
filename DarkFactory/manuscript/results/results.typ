#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "evaluation",
  title: [Vyhodnocení],
  definition: terms => [
Vyhodnocení odděluje důkazy o jednotlivých mechanismech od důkazů o jejich spolupráci na úrovni systému a od přenosu na konkrétní cílové repozitáře.
  ],
  description: terms => [
Metodika těchto důkazů je stanovena v části 1.5; zde se už neopakuje. Vyhodnocení používá reprodukovatelný evidence snapshot DarkFactory na commitu `e9c10221b40589512d262a0edb95f709b923150c` a odpovídající CI run `35616745304`. Snapshot slouží pouze jako pevný referenční bod pro výsledky. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304)
  ],
  conclusion: terms => [
Evaluace prokazuje implementaci a automatické ověření klíčových mechanismů DarkFactory a současně vymezuje chybějící systémové důkazy. Hlavní cíl je proto hodnocen na úrovni navržené architektury a reprodukovatelně testovaných mechanismů; neprovedený plný živý lifecycle zůstává explicitním omezením závěrů. #cite(bib.darkfactory_request_359)
  ],
)
