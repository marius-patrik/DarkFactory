#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "global_ai_usage_figure",
  czech: "Používání generativní AI ve světě",
  english: "Generative AI Usage Worldwide",
  citation: bib.cparip2026aiusage,
  source: bib.cparip2026aiusage,
  definition: terms => [
Grafický podklad znázorňuje odhad celosvětového používání generativní AI pomocí bodové reprezentace světové populace.
  ],
  description: terms => [
CPA.RIP dne 14. září 2026 publikoval odhad Gradually AI, podle kterého generativní AI používá přibližně 2,4 miliardy lidí, tedy 29 % světové populace. Výpočet vychází z dat DataReportal pro duben 2026 a článek výslovně uvádí, že všechny globální hodnoty jsou přibližné. #cite(bib.cparip2026aiusage)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/cpa-ai-usage-worldwide.webp", width: 100%),
  caption: [Odhad používání AI ve světové populaci. Zdroj: CPA.RIP / Gradually AI #cite(bib.cparip2026aiusage).],
)
  ],
)
