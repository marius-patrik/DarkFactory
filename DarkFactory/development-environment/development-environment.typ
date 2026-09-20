#import "/DarkFactory/templates/common.typ": define-term, translation, finalized, bib, accepted, term, kw
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "development-environment-practices",
  proper: translation(cs: "Vývojové prostředí a praxe", en: "Development Environment and Practices"),
  keyword: false,
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
)

#let item = concept(
  key: "development_environment",
  term: terminology,
  definition: terms => [
Vývojové prostředí a praxe tvoří soubor verzovacích, plánovacích, integračních a kontrolních postupů, které poskytují deterministický rámec pro agentní vývoj softwaru.
  ],
  description: terms => [
Agentní systém nepracuje pouze s textem, ale se stavem repozitáře a vývojovým procesem. Proto musí být jeho akce ukotveny v explicitních postupech pro verzování, plánování změn, automatické kontroly a revizi výsledků.
  ],
  summary: terms => [
Deterministické vývojové prostředí převádí jednotlivé agentní akce na dohledatelný a ověřitelný softwarově-inženýrský proces.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
