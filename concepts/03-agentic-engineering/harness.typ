#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
    id: "harness",
    proper: translation(cs: "Agentní harness", en: "Agent Harness"),
    industry: translation(cs: "Agent Harness", en: "Agent Harness"),
    default-name-type: "industry",
    keyword-name-type: "both",
    explanation_cs: "Agentní harness — aplikační a orchestrační vrstva obklopující inferenční jádro modelu, která zajišťuje běhové prostředí nástrojů, dynamickou správu kontextového okna, bezpečnostní mantinely, práci se stavem a deterministické řízení životního cyklu požadavku.",
    explanation_en: "Agent harness — an application and orchestration layer surrounding a model's inference core that provides the tool runtime, dynamic context-window management, guardrails, state handling, and deterministic control over the request lifecycle.",
  )

#let item = concept(
  key: "harness",
  term: terminology,
  heading: terms => [#term(terms.harness, render: "both", detail-language: "cs", detail-style: "inline", marker: false, linked: false, emphasized: false)],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#accepted[
#term(terms.harness, render: "explanation", detail-language: "cs", detail-style: "inline", register: false, linked: false, marker: false, emphasized: false) Samotné inferenční jádro provádí výhradně matematické maticové operace nad zadanými váhami a vektory tokenů; orchestraci, práci se soubory, správu stavu a bezpečnostní mantinely zajišťuje #term(terms.harness, language: "en", marker: false, linked: false, emphasized: false).

Ústřední prováděcí funkcí, která v architektuře harnessu řídí iterativní koordinaci agenta v reálném vývojovém prostředí, je #term(terms.agent_loop). #term(terms.agent_loop, render: "explanation", detail-language: "cs", detail-style: "inline", register: false, linked: false, marker: false, emphasized: false).
]
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "parent", target: "agentic_engineering"),),
)
