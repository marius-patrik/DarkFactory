#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let royalty_example = example(
  key: "embedding_royalty_2d",
  title: [Analogie král − muž + žena ≈ královna],
  source: bib.mikolov2013linguistic,
  description: terms => [
Mikolov, Yih a Zweig ukazují, že rozdílové vektory naučených slovních reprezentací mohou zachycovat sémantické vztahy; klasickým příkladem je vektor blízký vztahu „King − Man + Woman ≈ Queen“. #cite(bib.mikolov2013linguistic)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/vector-embedding-queen.svg", width: 100%),
  caption: [Ilustrativní 2D projekce vztahu král − muž + žena ≈ královna. Osy Pohlaví a Královský status jsou vysvětlující projekcí pro názornost, nikoli doslovnými naučenými dimenzemi nebo produkčními souřadnicemi embeddingového prostoru.],
)
  ],
)

#let semantic_space_example = example(
  key: "embedding_semantic_space_3d",
  title: [Dvě relační rodiny v projekci],
  source: (bib.mikolov2013linguistic, bib.mikolov2013compositionality),
  description: terms => [
Vedle vztahu pohlaví a královského statusu ukazují práce o word embeddings také relační rodinu země–hlavní město; Mikolov et al. uvádějí například vztah „Madrid − Spain + France ≈ Paris“. Druhá rovina proto pedagogicky zobrazuje analogickou dvojici Francie–Paříž a Itálie–Řím bez tvrzení, že zakreslené souřadnice odpovídají skutečným naučeným osám. #cite(bib.mikolov2013compositionality) #cite(bib.mikolov2013linguistic)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/vector-embedding-3d.svg", width: 100%),
  caption: [Pedagogická 3D projekce dvou relačních rodin. Reálné embeddingové prostory jsou vysokodimenzionální; osy Pohlaví, Královský status a Další sémantická dimenze jsou pouze vysvětlující projekční pomůcky a nepředstavují doslovné produkční souřadnice embeddingu.],
)
  ],
)

#let item = concept(
  key: "embedding",
  term: "Vektorová reprezentace",
  keyword: "Embedding",
  citation: (bib.mikolov2013word2vec, bib.vaswani2017),
  source: bib.mikolov2013word2vec,
  definition: terms => [
Embedding je spojitá vícerozměrná vektorová reprezentace diskrétního prvku, v níž se naučené geometrické vztahy mohou využít k zachycení podobnosti a dalších vztahů mezi reprezentovanými objekty. #cite(bib.mikolov2013word2vec)
  ],
  description: terms => [
Uvnitř Transformeru se identifikátory tokenů mapují na naučené vektory, které vstupují do neuronového zpracování. #cite(bib.vaswani2017) Vektorové reprezentace však lze používat i mimo samotnou inferenci jazykového modelu, například pro porovnání blízkosti reprezentací; jde o obecnější použití než interní tokenové embeddingy. #cite(bib.mikolov2013word2vec)
  ],
  examples: (royalty_example, semantic_space_example),
  practical: terms => [
Vektorové reprezentace umožňují řadit nebo vyhledávat položky podle sémantické podobnosti, což je užitečné při výběru relevantních informací pro další modelový krok. Samotný embedding přitom neurčuje, jak se vybraný kontext následně spravuje nebo používá.
  ],
  relations: ((type: "dependency", target: "token"),),
)
