#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "planning",
  industry: "Planning",
  czech: "Plánování",
  english: "Planning",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Převod požadavku na explicitní kroky, závislosti a podmínky ověření před prováděním změn. #cite(bib.sommerville2016)
  ],
  description: terms => [
Plán rozděluje práci na kontrolovatelné části a určuje, podle jakých podmínek lze posoudit jejich dokončení. Závislosti mezi částmi práce lze reprezentovat například pomocí DAG. #cite(bib.sommerville2016)
  ],
  relations: ((type: "related", target: "dag"),),
)
