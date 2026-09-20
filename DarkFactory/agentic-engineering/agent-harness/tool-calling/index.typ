#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/tool-calling/tool-calling.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/tool-calling/mcp.typ" as mcp

#let node = folder(
  key: "tool_calling",
  section: section.item,
  concepts: (mcp.item,),
)
