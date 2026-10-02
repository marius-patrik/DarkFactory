#import "../styles/main.typ": nadpis-bez-cisla

// Bibliography.
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#block[
  #set par(justify: false)
  #bibliography("/components/bib/references.bib", style: "/components/bib/gjkt-iso690-numeric-cs.csl", title: none)
]
