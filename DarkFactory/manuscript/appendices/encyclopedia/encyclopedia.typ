#import "/DarkFactory/templates/common.typ": term-full-name, term-sort-name, term-link-label
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "concept_encyclopedia",
  title: [Encyklopedie a rejstřík pojmů],
  definition: terms => [
Abecední přehled klíčových pojmů použitých v práci. Názvy a definice jsou odvozeny přímo z kanonických sémantických položek.
  ],
  description: terms => {
    let entries = terms.values()
      .filter(item => item.keyword != none)
      .sorted(key: item => lower(term-sort-name(item)))

    if entries.len() == 0 {
      [—]
    } else {
      let output = []
      for item in entries {
        output += [
          #block(above: 6pt, below: 2pt)[
            #link(term-link-label(item), strong(term-full-name(item)))
          ]
          #(item.definition)(terms)
        ]
      }
      output
    }
  },
)
