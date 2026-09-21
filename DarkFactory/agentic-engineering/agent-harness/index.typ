#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/agent-harness.typ" as harness
#import "/DarkFactory/agentic-engineering/agent-harness/turn.typ" as turn
#import "/DarkFactory/agentic-engineering/agent-harness/session-management.typ" as session
#import "/DarkFactory/agentic-engineering/agent-harness/transcript.typ" as transcript
#import "/DarkFactory/agentic-engineering/agent-harness/state.typ" as state
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop.typ" as agent_loop
#import "/DarkFactory/agentic-engineering/agent-harness/environment.typ" as environment
#import "/DarkFactory/agentic-engineering/sandbox.typ" as sandbox
#import "/DarkFactory/agentic-engineering/agent-harness/plugins.typ" as plugins
#import "/DarkFactory/agentic-engineering/agent-harness/tools/tools.typ" as tools
#import "/DarkFactory/agentic-engineering/agent-harness/tools/json-schema-tool-calling.typ" as json_schema_tool_calling
#import "/DarkFactory/agentic-engineering/agent-harness/tools/code-execution.typ" as code_execution
#import "/DarkFactory/agentic-engineering/agent-harness/scripts/scripts.typ" as scripts
#import "/DarkFactory/agentic-engineering/agent-harness/hooks/hooks.typ" as hooks
#import "/DarkFactory/agentic-engineering/agent-harness/tools/mcp.typ" as mcp
#import "/DarkFactory/agentic-engineering/agent-harness/skills/skills.typ" as skills

#let execution_state = folder(
  key: "harness_execution_state",
  title: [Stav běhu],
  concepts: (
    session.item,
    turn.item,
    transcript.item,
    state.item,
  ),
)

#let runtime = folder(
  key: "harness_runtime",
  title: [Běh a prostředí],
  concepts: (
    agent_loop.item,
    environment.item,
    sandbox.item,
  ),
)

#let extensions = folder(
  key: "harness_extensions",
  title: [Rozšíření harnessu],
  concepts: (
    plugins.item,
    tools.item,
    json_schema_tool_calling.item,
    code_execution.item,
    scripts.item,
    hooks.item,
    mcp.item,
    skills.item,
  ),
)

#let node = folder(
  key: "harness",
  title: [Harness],
  concepts: (harness.item,),
  children: (
    execution_state,
    runtime,
    extensions,
  ),
)
