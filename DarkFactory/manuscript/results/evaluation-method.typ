#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "evaluation_intro",
  title: [Úvod],
  definition: terms => [
Vyhodnocení používá reprodukovatelný evidence snapshot DarkFactory na commitu `e9c10221b40589512d262a0edb95f709b923150c` a odpovídající CI run `35616745304`. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304)
  ],
  description: terms => [
Snapshot slouží pouze jako pevný referenční bod pro výsledky. Kritéria a rozlišení architektonických, funkčních a integračních důkazů jsou vlastněna metodikou práce v části 1.5.
  ],
)
