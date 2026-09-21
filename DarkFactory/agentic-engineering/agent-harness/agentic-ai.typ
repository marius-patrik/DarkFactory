#import "/DarkFactory/templates/common.typ": issue
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agentic_ai",
  keyword: true,
  industry: "Agentic AI",
  czech: "Agentické AI",
  definition: terms => [
Agentic AI je systémové použití jazykového modelu, při němž model prostřednictvím nástrojů samostatně provádí vícekrokové akce nad stavem prostředí.
  ],
  description: terms => [
Tato vrstva zahrnuje agenty, jejich běhový harness, prováděcí smyčku, nástroje a správu pracovního kontextu.

#issue[Doplnit autoritativní zdroj pro vymezení pojmu Agentic AI, protože jde o hlavní termín práce a aktuálně nemá citační ani zdrojové metadata.]
  ],
  relations: ((type: "dependency", target: "language_model"),),
)
