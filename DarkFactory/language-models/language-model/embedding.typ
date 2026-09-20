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
Embedding je vícerozměrná vektorová reprezentace tokenů nebo jiných dat, v níž numerické vztahy mezi vektory zachycují užitečné vztahy mezi reprezentovanými objekty.
  ],
  description: terms => [
V jazykovém modelu embedding převádí diskrétní identifikátory tokenů na spojité vektory zpracovatelné neuronovou sítí. Podobné reprezentace lze použít také pro sémantické vyhledávání nebo porovnávání podobnosti.

Známým didaktickým příkladem je přibližný relační vztah mezi vektory slov král, muž, žena a královna. Obrázek zobrazuje pouze trojrozměrnou projekci; skutečný embeddingový prostor má obvykle mnohem více rozměrů. #cite(bib.mikolov2013word2vec)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/vector-embedding-queen.svg", width: 100%),
  caption: [Třírozměrná projekce příkladu vektorového vztahu král − muž + žena ≈ královna.],
)
  ],
  summary: terms => [
Embedding propojuje diskrétní vstupy s numerickým prostorem, v němž lze některé vztahy mezi reprezentacemi vyjádřit směrem a vzdáleností vektorů.
  ],
  relations: ((type: "dependency", target: "token"),),
)
