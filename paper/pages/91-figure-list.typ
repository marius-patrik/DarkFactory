#import "../styles/main.typ": nadpis-bez-cisla

// List of figures and tables.
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
