#import "/DarkFactory/templates/common.typ": finalized, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "scripts",
  industry: "Scripts",
  czech: "Skripty",
  english: "Scripts",
  citation: bib.anthropic2024tooluse,
  source: bib.anthropic2024tooluse,
  definition: terms => [
Soubory nebo posloupnosti příkazů určené k automatizovanému vykonání interpretem, shellem nebo jiným běhovým prostředím.
  ],
  description: terms => [#finalized[
V harnessu se používají pro opakovatelné transformace, validace a další kroky, které nemají vyžadovat nové rozhodnutí modelu.
  ]],
  relations: ((type: "dependency", target: "tools"),),
)
