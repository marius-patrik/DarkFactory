#import "../../templates/common.typ": define-term, translation, finalized
#import "../schema.typ": concept

#let terminology = define-term(
  id: "development-environment-practices",
  proper: translation(cs: "Vývojové prostředí a praxe", en: "Development Environment and Practices"),
  explanation_cs: "Soubor verzovacích, plánovacích, integračních a kontrolních postupů tvořících deterministické prostředí pro agentní vývoj softwaru.",
  explanation_en: "The set of versioning, planning, integration, and verification practices that form a deterministic environment for agentic software development.",
  keyword: false,
)

#let item = concept(
  key: "development_environment",
  term: terminology,
  heading: terms => [#finalized[Development Environment and Practices (Vývojové prostředí a praxe)]],
  theory_enabled: true,
  theory_body: none,
  practical_enabled: false,
)
