#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "agentic-engineering",
    proper: translation(cs: "Agentické inženýrství", en: "Agentic Engineering"),
    explanation_cs: "Inženýrská disciplína zaměřená na návrh, orchestraci a provoz agentických systémů kolem jazykových modelů, včetně nástrojů, kontextu, prováděcích smyček, bezpečnostních mantinelů a lidského dohledu.",
    explanation_en: "An engineering discipline focused on designing, orchestrating, and operating agentic systems around language models, including tools, context, execution loops, guardrails, and human oversight.",
    citation: bib.wang2024survey,
    source: bib.darkfactory,
)

#let item = concept(
  key: "agentic_engineering",
  term: terminology,
  theory_enabled: true,
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
  relations: ((type: "dependency", target: "agent"),)
)