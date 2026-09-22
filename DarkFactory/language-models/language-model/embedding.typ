#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "embedding",
  term: "Vektorová reprezentace",
  keyword: "Embedding",
  citation: bib.mikolov2013word2vec,
  source: bib.mikolov2013word2vec,
  definition: terms => [
Vícerozměrná vektorová reprezentace diskrétních prvků, v níž geometrické vztahy mohou zachycovat užitečné vztahy mezi reprezentovanými objekty. #cite(bib.mikolov2013word2vec)
  ],
  description: terms => [
V jazykovém modelu embedding převádí identifikátory tokenů na spojité vektory zpracovatelné neuronovou sítí; vektorové reprezentace lze také porovnávat podle podobnosti. #cite(bib.mikolov2013word2vec)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/vector-embedding-queen.svg", width: 100%),
  caption: [Ilustrativní 2D projekce vztahu král − muž + žena ≈ královna; osy Pohlaví a Královský status slouží pouze k názornému vysvětlení a nepředstavují doslovné naučené dimenze embeddingového prostoru.],
)
  ],
  practical: terms => [
Vektorové reprezentace umožňují vyhledávat podle sémantické podobnosti, což je praktický základ pro výběr relevantního kontextu například v retrieval pipeline.
  ],
  relations: ((type: "dependency", target: "token"),),
)
