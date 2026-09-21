#import "/DarkFactory/templates/common.typ": translation, finalized, bib, accepted, term, kw
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "development_environment",
    czech: "Vývojové prostředí a praxe",
  english: "Development Environment and Practices",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
definition: terms => [
Vývojové prostředí a praxe tvoří soubor verzovacích, plánovacích, integračních a kontrolních postupů, které poskytují deterministický rámec pro agentní vývoj softwaru.
  ],
  description: terms => [
Agentní systém nepracuje pouze s textem, ale se stavem repozitáře a vývojovým procesem. Proto musí být jeho akce ukotveny v explicitních postupech pro verzování, plánování změn, automatické kontroly a revizi výsledků.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
