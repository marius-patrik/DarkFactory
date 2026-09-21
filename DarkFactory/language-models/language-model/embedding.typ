#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "embedding",
  industry: "Embedding",
  czech: "Vektorová reprezentace",
  english: "Embedding",
  citation: bib.mikolov2013word2vec,
  source: bib.mikolov2013word2vec,
  definition: terms => [
Vícerozměrná vektorová reprezentace tokenů nebo jiných dat, v níž numerické vztahy mezi vektory zachycují užitečné vztahy mezi reprezentovanými objekty.
  ],
  description: terms => [
V jazykovém modelu embedding převádí diskrétní identifikátory tokenů na spojité vektory zpracovatelné neuronovou sítí. Podobné reprezentace lze použít také pro sémantické vyhledávání nebo porovnávání podobnosti. #cite(bib.mikolov2013word2vec)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/vector-embedding-queen.svg", width: 100%),
  caption: [Ilustrativní 2D projekce vztahu král − muž + žena ≈ královna; osy Pohlaví a Královský status slouží pouze k názornému vysvětlení a nepředstavují doslovné naučené dimenze embeddingového prostoru.],
)
  ],
  relations: ((type: "dependency", target: "token"),),
)
