#import "/DarkFactory/templates/common.typ": finalized, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agent_loop",
  keyword: true,
  industry: "Agent Loop",
  czech: "Smyčka ReAct",
  english: "ReAct Loop",
  citation: bib.yao2022,
  source: bib.yao2022,
  definition: terms => [
Iterativní cyklus, v němž model vyhodnotí stav, zvolí akci, harness ji provede a výsledek vrátí do další iterace.
  ],
  description: terms => [
Ve vzoru ReAct se cyklus opakuje jako rozhodnutí → volání nástroje → pozorování výsledku → další rozhodnutí. Harness zajišťuje provedení nástroje a vrácení pozorování do aktivního kontextu. #cite(bib.yao2022)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/react-loop.svg", width: 100%),
  caption: [Smyčka ReAct: model rozhodne o akci, harness ji provede a výsledek vrátí modelu.],
) <fig-react-loop>
  ],
  relations: ((type: "dependency", target: "agent"),),
)
