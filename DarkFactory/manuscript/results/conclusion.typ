#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "evaluation_conclusion",
  title: [Závěr],
  definition: terms => [
Evaluace prokazuje implementaci a automatické ověření klíčových mechanismů DarkFactory a současně přesně vymezuje chybějící systémové důkazy.
  ],
  description: terms => [
Hlavní cíl práce je proto hodnocen na úrovni navržené architektury a reprodukovatelně testovaných mechanismů. Neprovedený plný živý lifecycle není nahrazen silnějším tvrzením; zůstává explicitním omezením závěrů. #cite(bib.darkfactory_request_359)
  ],
)
