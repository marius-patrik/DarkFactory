#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "loop-engineering",
    proper: translation(cs: "Inženýrství prováděcí smyčky", en: "Execution-loop Engineering"),
    industry: translation(cs: "Loop Engineering", en: "Loop Engineering"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Návrh a řízení iterativní prováděcí smyčky agenta: stavových přechodů, podmínek ukončení, rozpočtů, opakování, eskalací a vazby mezi rozhodováním modelu a nástroji.",
    explanation_en: "The design and control of an agent's iterative execution loop, including state transitions, termination conditions, budgets, retries, escalation, and the connection between model decisions and tools.",
  )

#let item = concept(
  key: "loop_engineering",
  term: terminology,
  heading: terms => [#term(terms.loop_engineering, marker: false, linked: false, emphasized: false)],
  theory_enabled: false,
  theory_intro: none,
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "agent_loop"),)
)
