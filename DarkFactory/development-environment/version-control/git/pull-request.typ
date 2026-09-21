#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "pull_request",
    industry: "Pull Request",
  czech: "Požadavek na sloučení",
  english: "Pull Request",
  citation: bib.chacon2014,
  source: bib.dabbish2012github,
definition: terms => [
Pull Request je formální návrh na začlenění změn z jedné větve repozitáře do druhé a společné místo pro automatizované kontroly, lidskou revizi a diskusi nad navrženými úpravami.
  ],
  description: terms => [
#finalized[
V navrženém procesu DarkFactory tvoří #term(terms.pull_request) kontrolní hranici mezi pracovní větví agenta a hlavní historií repozitáře @chacon2014. Agent připraví změnu, její souhrn a výsledky automatických kontrol; lidský revizor následně rozhodne o přijetí, přepracování nebo zamítnutí změny v souladu s principem #term(terms.human_in_the_loop).

Pull request soustřeďuje na jednom místě řádkový diff, popis změny, vazbu na původní zadání, výsledky automatických kontrol a revizní diskusi. Tím poskytuje společný bod pro strojové ověření i lidskou sémantickou kontrolu před integrací.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "branch"), (type: "related", target: "github"),),
)