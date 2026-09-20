#import "../../templates/common.typ": define-term, translation, finalized, bib, accepted, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
  id: "development-environment-practices",
  proper: translation(cs: "Vývojové prostředí a praxe", en: "Development Environment and Practices"),
  explanation_cs: "Soubor verzovacích, plánovacích, integračních a kontrolních postupů tvořících deterministické prostředí pro agentní vývoj softwaru.",
  explanation_en: "The set of versioning, planning, integration, and verification practices that form a deterministic environment for agentic software development.",
  keyword: false,
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
)

#let item = concept(
  key: "development_environment",
  term: terminology,
  theory_enabled: true,
  theory_intro: terms => [
#accepted[
#term(terms.development_environment, render: "both", detail-language: "cs", detail-style: "inline").
]
  ],
  theory_body: none,
  practical_enabled: false,
)
