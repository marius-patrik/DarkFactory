#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "runtime",
  industry: "Runtime",
  czech: "Běhové prostředí",
  citation: bib.merkel2014docker,
  source: bib.merkel2014docker,
  definition: terms => [
Prostředí a systémové prostředky dostupné programu během jeho vykonávání.
  ],
  description: terms => [
Běhové prostředí určuje například dostupné procesy, souborový systém, síť a oprávnění; jeho hranice lze dále omezit kontejnerem nebo sandboxem. #cite(bib.merkel2014docker)
  ],
  relations: ((type: "related", target: "sandbox"),),
)
