#import "/DarkFactory/templates/common.typ": translation, finalized
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "agent_session",
    czech: "Agentní sezení",
  english: "Agent Session",
definition: terms => [
Ohraničený běh agenta se sdíleným stavem, systémovými instrukcemi, pracovním kontextem, historií tahů a provozními rozpočty.
  ],
  description: terms => [
#finalized[
Sezení vymezuje stav jednoho běhu; harness v něm spravuje pracovní kontext a sleduje rozpočty, například spotřebu tokenů nebo počet iterací.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "agent_loop"), (type: "related", target: "context_engineering")),
)
