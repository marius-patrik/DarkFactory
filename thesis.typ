#import "metadata.typ": meta
#import "templates/registry.typ": default-template, template-for, appendices-for

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
    #include "kapitoly/01-uvod.typ"
    #include "kapitoly/02-teoreticka-cast.typ"
    #include "kapitoly/03-prakticka-cast.typ"
    #include "kapitoly/04-vysledky.typ"
    #include "kapitoly/05-zaver.typ"

    #appendices[
      #include "kapitoly/06-prilohy.typ"
    ]
  ]
}
