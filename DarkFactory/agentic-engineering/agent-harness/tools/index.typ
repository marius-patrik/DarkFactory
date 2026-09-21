#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/tools/tools.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/tools/json-schema-tool-calling.typ" as json_schema
#import "/DarkFactory/agentic-engineering/agent-harness/tools/code-execution.typ" as code_execution
#import "/DarkFactory/agentic-engineering/agent-harness/tools/mcp.typ" as mcp

#let node = folder(
  key: "tools",
  section: section.item,
  concepts: (
    json_schema.item,
    code_execution.item,
    mcp.item,
  ),
)
