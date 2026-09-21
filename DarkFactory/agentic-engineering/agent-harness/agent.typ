#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "agent",
  keyword: true,
    czech: "Agent",
  english: "Agent",
  citation: bib.wooldridge1995,
  source: bib.wang2024survey,
definition: terms => [
Agent je softwarový systém řízený jazykovým modelem a vybavený nástroji, který samostatně vnímá stav prostředí a provádí vícekrokové akce směřující k zadanému cíli.
  ],
  description: terms => [
Oproti #term(terms.chatbot) může agent pozorovat stav prostředí, volat nástroje a pokračovat podle jejich výsledků. Tyto schopnosti poskytuje harness, nikoli samotný model.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "chatbot"),),
)