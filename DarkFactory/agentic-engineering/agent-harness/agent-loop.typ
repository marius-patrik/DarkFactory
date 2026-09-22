#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agent_loop",
  term: "Agentní smyčka",
  keyword: "Agent Loop",
  citation: bib.yao2022,
  source: bib.yao2022,
  definition: terms => [
Iterativní cyklus, v němž model vyhodnotí stav, zvolí akci, harness ji provede a výsledek vrátí do další iterace. #cite(bib.yao2022)
  ],
  description: terms => [
ReAct formalizuje střídání rozhodnutí, akce a pozorování výsledku; nové pozorování se stává vstupem dalšího kroku. #cite(bib.yao2022)
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/react-loop.svg", width: 100%),
  caption: [Smyčka ReAct: model zvolí akci, harness ji provede a výsledek vrátí modelu.],
) <fig-react-loop>
  ],
  practical: terms => [
Agentní smyčka umožňuje opakovaně převádět pozorování na další akci, takže agent může postupovat po více krocích místo jednorázové odpovědi.
  ],
  relations: ((type: "dependency", target: "harness"),),
)
