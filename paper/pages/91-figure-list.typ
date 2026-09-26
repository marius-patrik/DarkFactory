#import "../styles/main.typ": nadpis-bez-cisla

// List of components.
//
// The guide asks for a generated list of the components of the text, and the
// marking protocol scores it on whether it is *complete* — not merely present.
// A code listing is a component too: it is numbered, captioned and cited like
// any other, so it belongs here. Filtering to images and tables only would have
// left `Výpis 1` numbered in the body and absent from the list.
//
// Named after the guide's own term ("seznam součástí textu", kap. 4 a 6) rather
// than after the two kinds that used to appear, so the heading does not have to
// change again if a table is ever added.
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam součástí textu]
#outline(
  title: none,
  target: figure
    .where(kind: image)
    .or(figure.where(kind: table))
    .or(figure.where(kind: raw)),
)
