#import "/DarkFactory/templates/common.typ": translation, accepted
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "subgoals",
    czech: "Dílčí cíle",
  english: "Sub-goals",
definition: terms => [
#accepted[
- Vymezit infrastrukturu pro správu verzí (Git, GitHub a kontinuální integraci).
- Analyzovat limity velkých jazykových modelů (dynamiku kontextového okna, jev Context Rot, ztrátovou kompresi a sémantický posun).
- Navrhnout architekturu agent harnessu zahrnující nástrojové smyčky (ReAct), bezpečnostní pískoviště a hierarchickou orchestraci subagentů.
- Formalizovat mechanismy zapojení člověka do smyčky (_Human-in-the-loop_), schvalovací brány a protokol revizních značek pro dohled nad textovými výstupy.
]
  ],
  description: terms => [
Dílčí cíle pokrývají deterministické vývojové prostředí, limity modelového kontextu, prováděcí a nástrojovou architekturu harnessu a mechanismy lidského dohledu. Každá oblast odpovídá samostatným konceptům v dalším textu.
  ],
  summary: terms => [
Splnění dílčích cílů vytváří podklady pro návrh harnessu a následné zodpovězení výzkumných otázek.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "main_goal"),),
)
