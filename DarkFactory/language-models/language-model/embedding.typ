#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "embedding",
    proper: translation(cs: "Vektorová reprezentace", en: "Embedding"),
    industry: translation(cs: "Embedding", en: "Embedding"),
    explanation_cs: "Vícerozměrná vektorová reprezentace tokenů nebo jiných dat, v níž numerické vztahy mezi vektory zachycují užitečné sémantické vztahy mezi reprezentacemi.",
    explanation_en: "A multidimensional vector representation of tokens or other data in which numerical relationships between vectors capture useful semantic relationships between representations.",
    citation: bib.mikolov2013word2vec,
    source: bib.mikolov2013word2vec,
)

#let item = concept(
  key: "embedding",
  term: terminology,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "token"),),
)