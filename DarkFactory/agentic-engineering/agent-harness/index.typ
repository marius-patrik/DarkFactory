#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/agent-harness.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/agentic-ai.typ" as agentic_ai
#import "/DarkFactory/agentic-engineering/agent-harness/chatbot.typ" as chatbot
#import "/DarkFactory/agentic-engineering/agent-harness/agent.typ" as agent
#import "/DarkFactory/agentic-engineering/agent-harness/turn.typ" as turn
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop.typ" as agent_loop
#import "/DarkFactory/agentic-engineering/agent-harness/session-management.typ" as session_management
#import "/DarkFactory/agentic-engineering/agent-harness/divergence.typ" as divergence
#import "/DarkFactory/agentic-engineering/agent-harness/tool-calling.typ" as tool_calling
#import "/DarkFactory/agentic-engineering/agent-harness/json-schema-tool-calling.typ" as json_schema_tool_calling
#import "/DarkFactory/agentic-engineering/agent-harness/code-execution.typ" as code_execution
#import "/DarkFactory/agentic-engineering/agent-harness/mcp.typ" as mcp
#import "/DarkFactory/agentic-engineering/agent-harness/plugins.typ" as plugins
#import "/DarkFactory/agentic-engineering/agent-harness/subagent.typ" as subagent

#let node = folder(
  key: "harness",
  section: section.item,
  concepts: (
    agentic_ai.item,
    chatbot.item,
    agent.item,
    turn.item,
    agent_loop.item,
    session_management.item,
    divergence.item,
    tool_calling.item,
    json_schema_tool_calling.item,
    code_execution.item,
    mcp.item,
    plugins.item,
    subagent.item,
  ),
)
