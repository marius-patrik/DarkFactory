#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_request_plan_body",
  title: [Zadání a plán],
  definition: terms => [
První fáze odděluje původní záměr od závazného rámce, podle kterého bude změna provedena a později posouzena.
  ],
  description: terms => [
#term(terms.darkfactory_request) zachovává zdrojový záměr, zatímco #term(terms.darkfactory_planning) z něj vytváří schválený pracovní kontrakt pro následující fáze. Smyslem oddělení je zabránit tomu, aby implementace sama průběžně měnila kritéria, podle kterých bude hodnocena. #cite(bib.darkfactory)
  ],
)
