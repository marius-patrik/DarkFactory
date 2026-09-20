#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "embedding",
    industry: "Embedding",
  czech: "Vektorová reprezentace",
  english: "Embedding",
  citation: bib.mikolov2013word2vec,
  source: bib.mikolov2013word2vec,
definition: terms => [
Embedding je vícerozměrná vektorová reprezentace tokenů nebo jiných dat, v níž numerické vztahy mezi vektory zachycují užitečné vztahy mezi reprezentovanými objekty.
  ],
  description: terms => [
V jazykovém modelu embedding převádí diskrétní identifikátory tokenů na spojité vektory zpracovatelné neuronovou sítí. Podobné vektorové reprezentace lze použít také mimo samotnou generaci, například pro vyhledávání semanticky podobných položek v systému RAG.
  ],
  summary: terms => [
Embedding propojuje diskrétní vstupy s numerickým prostorem modelu a může současně sloužit jako reprezentace pro sémantické vyhledávání.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "token"),),
)