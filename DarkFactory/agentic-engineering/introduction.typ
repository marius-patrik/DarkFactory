#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "agentic_engineering",
  title: [Úvod],
  term: "Agentické inženýrství",
  citation: bib.anthropic_context_engineering,
  source: bib.anthropic_context_engineering,
  definition: terms => [
Agentické inženýrství v této práci označuje návrh způsobu, jakým se schopnosti Harnessu skládají, omezují a koordinují tak, aby agent cíleně plnil delší úlohu.
  ],
  description: terms => [
Vrstva se soustředí na tři otázky: jaké instrukce a informace model dostává, jak jsou jeho kroky omezeny a ukončovány a jak se práce koordinuje mezi více agenty nebo pracovními větvemi.
  ],
  relations: ((type: "dependency", target: "harness"),),
)
