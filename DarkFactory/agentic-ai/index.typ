#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-ai/agentic-ai.typ" as section
#import "/DarkFactory/language-models/chatbot.typ" as chatbot
#import "/DarkFactory/language-models/agent.typ" as agent
#import "/DarkFactory/agentic-engineering/agent-harness/index.typ" as agent_harness

#let node = folder(
  key: "agentic_ai",
  section: section.item,
  concepts: (chatbot.item, agent.item),
  children: (agent_harness.node,),
)
