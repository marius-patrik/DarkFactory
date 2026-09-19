#import "metadata.typ": meta
#import "lib/odborna-prace.typ": odborna-prace, prilohy

// Jediný vstupní bod pro obě výstupní varianty práce.
// Rozdíl mezi normal/review se předává pouze jako režim šabloně;
// samotný obsah kapitol, sazba i výpočet rozsahu jsou společné.
#let thesis(review: false, profile: "school", language: none) = odborna-prace(
  meta: meta,
  logo: "/img/logo.jpeg",
  review: review,
  profile: profile,
  language: language,
  koncept: if review { "KONCEPT" } else { none },
)[
  #include "kapitoly/01-uvod.typ"
  #include "kapitoly/02-teoreticka-cast.typ"
  #include "kapitoly/03-prakticka-cast.typ"
  #include "kapitoly/04-vysledky.typ"
  #include "kapitoly/05-zaver.typ"

  #prilohy[
    #include "kapitoly/06-prilohy.typ"
  ]
]
