#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "agentic-engineering",
    proper: translation(cs: "Agentické inženýrství", en: "Agentic Engineering"),
    citation: bib.wang2024survey,
    source: bib.darkfactory,
)

#let item = concept(
  key: "agentic_engineering",
  term: terminology,
  definition: terms => [
Agentické inženýrství je disciplína zaměřená na návrh, orchestraci a provoz agentních systémů kolem jazykových modelů, včetně nástrojů, kontextu, prováděcích smyček, mantinelů a lidského dohledu.
  ],
  description: terms => [
Předmětem agentického inženýrství není samotná modelová architektura, ale systémové prostředí, které převádí modelový výstup na řízené jednání. Patří sem zejména návrh agentního harnessu, správa kontextu a stavu, rozhraní nástrojů, prováděcí smyčky, ověřování výsledků, izolace a rozhodovací body pro lidský dohled.
  ],
  summary: terms => [
Agentické inženýrství hodnotí celý systém kolem modelu podle toho, zda dokáže modelové schopnosti převést na opakovatelné, kontrolovatelné a ověřitelné chování.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "agent"),),
)