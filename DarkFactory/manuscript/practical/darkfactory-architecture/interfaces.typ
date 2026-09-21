#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_interfaces_body",
  title: [Rozhraní],
  definition: terms => [
Stejné protokolové a stavové modely jsou zpřístupněny více operátorskými a publikačními rozhraními bez vytvoření druhého vykonávacího systému.
  ],
  description: terms => [
`@darkfactory/cli` vlastní příkaz `df` a interaktivní operátorské rozhraní, `@darkfactory/web` browserové zobrazení a operátorský web a `@darkfactory/docs` headless kompilaci dokumentačního content graphu. Vykreslení dokumentace patří webové vrstvě, nikoli druhému frontendovému runtime. #cite(bib.darkfactory)
  ],
)
