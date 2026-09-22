#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "planning",
  term: "Plánování",
  keyword: "Planning",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Převod požadavku na explicitní kroky, závislosti a podmínky ověření před prováděním změn. #cite(bib.sommerville2016)
  ],
  description: terms => [
Plán rozděluje práci na kontrolovatelné části, určuje jejich pořadí a stanovuje podmínky, podle kterých lze posoudit dokončení. #cite(bib.sommerville2016)
  ],
  relations: (),
)
