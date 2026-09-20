#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "agent-session",
  proper: translation(cs: "Agentní sezení", en: "Agent Session"),
  explanation_cs: "Ohraničený běh agenta se sdíleným stavem, systémovými instrukcemi, pracovním kontextem, historií tahů a provozními rozpočty.",
  explanation_en: "A bounded agent run with shared state, system instructions, working context, turn history, and operating budgets.",
)

#let item = concept(
  key: "agent_session",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
Správa agentního sezení zahrnuje sestavení systémového promptu, načtení relevantního kontextu repozitáře, průběžné uchování stavu a sledování rozpočtů, například spotřeby tokenů nebo počtu iterací.
]
  ],
  relations: ((type: "dependency", target: "agent_loop"), (type: "related", target: "context_engineering"))
)
