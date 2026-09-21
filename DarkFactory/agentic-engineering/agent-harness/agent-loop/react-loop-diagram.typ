#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "react_loop_diagram",
    czech: "Schéma agentní smyčky ReAct",
  english: "ReAct Agent-loop Diagram",
definition: terms => [
Schéma znázorňuje iterativní tok mezi uživatelem, aktivním kontextem, jazykovým modelem, voláním nástrojů a pozorováním výsledků v agentní smyčce ReAct.
  ],
  description: terms => [
Diagram odděluje modelové rozhodnutí od exekuce nástroje a zpětného vložení pozorování do další iterace, což odpovídá základnímu vzoru Reasoning + Acting.
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/react-loop.svg", width: 100%),
  caption: [Architektura autonomní ReAct smyčky a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.],
) <fig-react-loop>
  ],
  citations: (bib.yao2022,),
)
