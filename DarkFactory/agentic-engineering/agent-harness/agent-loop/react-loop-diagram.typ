#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "react-loop-diagram",
  proper: translation(cs: "Schéma agentní smyčky ReAct", en: "ReAct Agent-loop Diagram"),
  keyword: false,
)

#let item = concept(
  key: "react_loop_diagram",
  term: terminology,
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
  summary: terms => [
Vizuální tok ukazuje, že agentní běh je uzavřená iterace modelového rozhodnutí, externí akce a nového pozorování.
  ],
  citations: (bib.yao2022,),
)
