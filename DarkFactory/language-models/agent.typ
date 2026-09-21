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
Rozdíl mezi #term(terms.chatbot) a agentem nespočívá nutně v použitém jazykovém modelu, ale v architektuře jeho zapojení do prostředí. Agent může číst stav repozitáře, provádět změny, spouštět nástroje a podle jejich výsledků pokračovat v další iteraci. Tuto schopnost zajišťuje nadřazená prováděcí a nástrojová vrstva, nikoli samotný model.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "chatbot"),),
)