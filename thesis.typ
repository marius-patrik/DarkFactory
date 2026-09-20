#import "metadata.typ": meta
#import "templates/registry.typ": default-template, template-for, appendices-for
#import "concepts/index.typ": render-introduction, render-theory, render-practical, render-results, render-conclusion

// Jediný zdroj obsahu práce. Konkrétní dokumentová šablona je zvolena
// samostatně, takže stejný rukopis lze kompilovat více šablonami.
#let thesis(
  review: false,
  profile: "school",
  template-name: default-template,
) = {
  let render = template-for(template-name)
  let appendices = appendices-for(template-name)

  render(
    meta: meta,
    logo: "/img/logo.jpeg",
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
      #include "kapitoly/06-prilohy.typ"
    ]
  ]
}
