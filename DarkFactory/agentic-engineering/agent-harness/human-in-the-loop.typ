#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "human_in_the_loop",
  industry: "HITL",
  czech: "Zapojení člověka do smyčky",
  english: "Human-in-the-loop",
  citation: bib.mosqueira2023human,
  source: bib.mosqueira2023human,
  definition: terms => [
Zapojení člověka do smyčky (HITL) je návrhový vzor, v němž člověk schvaluje nebo přebírá rozhodnutí v určených bodech automatizovaného procesu.
  ],
  description: terms => [
V DarkFactory zůstávají člověku zejména významná nebo nevratná rozhodnutí, zatímco rutinní kroky může harness provádět samostatně. Ke kontrole má předkládat pozorovatelný stav, například diff, výsledky kontrol a chyby. #cite(bib.mosqueira2023human)
  ],
  relations: ((type: "related", target: "version_control"),),
)
