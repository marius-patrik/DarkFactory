#import "/DarkFactory/metadata.typ": meta
#import "/DarkFactory/templates/registry.typ": default-template, template-for, appendices-for
#import "/DarkFactory/index.typ": render-introduction, render-theory, render-practical, render-results, render-conclusion, render-appendices

// Jediný zdroj obsahu práce. Konkrétní dokumentová šablona je zvolena
// samostatně, takže stejný konceptový rukopis lze kompilovat více šablonami.
#let thesis(
  review: false,
  profile: "school",
  template-name: default-template,
) = {
  let render = template-for(template-name)
  let appendices = appendices-for(template-name)

  render(
    meta: meta,
    logo: "/DarkFactory/img/logo.jpeg",
    review: review,
    profile: profile,
    koncept: none,
  )[
    #render-introduction()
    #render-theory()
    #render-practical()
    #render-results()
    #render-conclusion()

    #appendices[
      #render-appendices()
    ]
  ]
}
