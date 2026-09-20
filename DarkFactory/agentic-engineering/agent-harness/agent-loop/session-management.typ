#import "/DarkFactory/templates/common.typ": translation, finalized
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "agent_session",
    czech: "Agentní sezení",
  english: "Agent Session",
definition: terms => [
Agentní sezení je ohraničený běh agenta se sdíleným stavem, systémovými instrukcemi, pracovním kontextem, historií tahů a provozními rozpočty.
  ],
  description: terms => [
#finalized[
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
