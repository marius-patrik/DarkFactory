#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "version-control",
    proper: translation(cs: "Správa verzí", en: "Version control"),
    citation: bib.chacon2014,
    source: bib.chacon2014,
)

#let item = concept(
  key: "version_control",
  term: terminology,
  definition: terms => [
Správa verzí je řízení a sledování změn zdrojových souborů a dalších verzovaných artefaktů tak, aby bylo možné změny bezpečně větvit, slučovat, auditovat a vracet.
  ],
  description: terms => [
Pro autonomní vývoj poskytuje verzovací vrstva deterministický záznam reality, který je nezávislý na interním kontextu modelu. Agent může pracovat nad izolovanou změnou, její stav porovnat s výchozí verzí a v případě neúspěchu se vrátit k známému bodu historie.
  ],
  summary: terms => [
Správa verzí je základní stavová a návratová vrstva agentního vývoje; model navrhuje změny, ale repozitář uchovává jejich skutečnou historii.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
