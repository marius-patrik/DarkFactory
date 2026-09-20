#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(id: "planning", proper: translation(cs: "Plánování", en: "Planning"), explanation_cs: "Proces převodu požadavku na explicitní posloupnost kroků, závislostí a ověřovacích podmínek před prováděním změn.", explanation_en: "The process of turning a requirement into an explicit sequence of steps, dependencies, and verification conditions before changes are executed.", keyword: false, citation: bib.sommerville2016, source: bib.sommerville2016)

#let item = concept(
  key: "planning",
  term: terminology,
  definition: terms => [
Plánování je proces převodu požadavku na explicitní posloupnost kroků, závislostí a ověřovacích podmínek před prováděním změn.
  ],
  description: terms => [
V agentním vývoji plán omezuje okamžité přecházení od požadavku k úpravám kódu. Rozděluje práci na kontrolovatelné kroky a předem určuje, jak bude možné ověřit, že jednotlivé části i celek splnily zadání.
  ],
  summary: terms => [
Plánování vytváří kontrolovatelný mezistupeň mezi požadavkem a provedením a snižuje riziko, že agent optimalizuje lokální změny bez ohledu na celek.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)