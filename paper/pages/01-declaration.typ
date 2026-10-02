#import "../components/metadata.typ": meta
#import "../styles/main.typ": nadpis-bez-cisla

// Declaration of independent work.
#nadpis-bez-cisla[Prohlášení]
Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval samostatně pod dohledem vedoucího uvedeného na první straně. Všechny použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby tištěná forma práce byla uchována na Gymnáziu J. K. Tyla a tam používána jako tištěný zdroj např. pro další studentské práce či pro prezentaci vzdělávání na #meta.school-short.

#v(1.5cm)
#grid(
  columns: (auto, 4.5cm),
  column-gutter: 0.35em,
  align: (left + horizon, left + horizon),
  [V #meta.city dne],
  [#box(width: 100%, height: 1em, stroke: (bottom: 0.5pt))[]],
)

#v(0.8cm)
#align(right)[
  #grid(
    columns: (auto, 4.5cm),
    column-gutter: 0.35em,
    align: (right + horizon, left + horizon),
    [Podpis autora práce —],
    [#box(width: 100%, height: 1em, stroke: (bottom: 0.5pt))[]],
  )
]
