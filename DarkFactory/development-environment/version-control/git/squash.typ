#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "squash",
    proper: translation(cs: "Sloučení commitů", en: "Commit Squashing"),
    industry: translation(cs: "Squash", en: "Squash"),
    explanation_cs: "Operace, při níž se více po sobě jdoucích commitů nahradí jedním souhrnným commitem, obvykle za účelem zjednodušení historie před integrací změn.",
    explanation_en: "An operation that replaces multiple consecutive commits with one aggregate commit, commonly to simplify history before integrating changes.",
    citation: bib.chacon2014,
    source: bib.chacon2014,
)

#let item = concept(
  key: "squash",
  term: terminology,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "merge"),),
)