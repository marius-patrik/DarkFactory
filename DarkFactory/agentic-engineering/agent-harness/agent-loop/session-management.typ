#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "agent-session",
  proper: translation(cs: "Agentní sezení", en: "Agent Session"),
)

#let item = concept(
  key: "agent_session",
  term: terminology,
  definition: terms => [
Agentní sezení je ohraničený běh agenta se sdíleným stavem, systémovými instrukcemi, pracovním kontextem, historií tahů a provozními rozpočty.
  ],
  description: terms => [
#unconfirmed[
Správa agentního sezení zahrnuje sestavení systémového promptu, načtení relevantního kontextu repozitáře, průběžné uchování stavu a sledování rozpočtů, například spotřeby tokenů nebo počtu iterací.
]
  ],
  summary: terms => [
Sezení poskytuje jednotku životního cyklu, ve které lze konzistentně spravovat stav, kontext a zdrojové limity jednoho agentního běhu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "agent_loop"), (type: "related", target: "context_engineering")),
)
