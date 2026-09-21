#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agent_session",
  industry: "Session",
  czech: "Agentní sezení",
  english: "Agent Session",
  definition: terms => [
Ohraničený běh se sdíleným stavem, systémovými instrukcemi, pracovním kontextem, historií tahů a provozními rozpočty.
  ],
  description: terms => [
Harness v rámci session spravuje pracovní kontext a sleduje rozpočty, například spotřebu tokenů nebo počet iterací.
  ],
  relations: ((type: "dependency", target: "turn"), (type: "related", target: "context_engineering")),
)
