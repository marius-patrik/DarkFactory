#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_docs",
  industry: "DarkFactory Docs",
  czech: "Kompilátor dokumentace DarkFactory",
  english: "DarkFactory Documentation Compiler",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Headless dokumentační kompilátor, který vytváří typovaný obsahový graf z kanonických zdrojů projektu.
  ],
  description: terms => [
`@darkfactory/docs` vlastní konfiguraci a kompilaci dokumentace; vykreslení výsledného content graphu patří `@darkfactory/web`.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"), (type: "related", target: "darkfactory_web")),
)
