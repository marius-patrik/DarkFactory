#import "../../../../../templates/common.typ": define-term, translation, accepted
#import "../../../../schema.typ": concept

#let terminology = define-term(
  id: "subgoals",
  proper: translation(cs: "Dílčí cíle", en: "Sub-goals"),
  keyword: false,
)

#let item = concept(
  key: "subgoals",
  term: terminology,
  definition: terms => [
#accepted[
- Vymezit infrastrukturu pro správu verzí (Git, GitHub a kontinuální integraci).
- Analyzovat limity velkých jazykových modelů (dynamiku kontextového okna, jev Context Rot, ztrátovou kompresi a sémantický posun).
- Navrhnout architekturu agent harnessu zahrnující nástrojové smyčky (ReAct), bezpečnostní pískoviště a hierarchickou orchestraci subagentů.
- Formalizovat mechanismy zapojení člověka do smyčky (_Human-in-the-loop_), schvalovací brány a protokol revizních značek pro dohled nad textovými výstupy.
]
  ],
  document_enabled: true,
  relations: ((type: "dependency", target: "main_goal"),),
)
