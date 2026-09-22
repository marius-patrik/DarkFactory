#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/section.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop.typ" as agent_loop
#import "/DarkFactory/agentic-engineering/agent-harness/session-management.typ" as session
#import "/DarkFactory/agentic-engineering/agent-harness/transcript.typ" as transcript
#import "/DarkFactory/agentic-engineering/agent-harness/state.typ" as state
#import "/DarkFactory/agentic-engineering/agent-harness/environment.typ" as environment
#import "/DarkFactory/agentic-engineering/agent-harness/tools/tools.typ" as tools
#import "/DarkFactory/agentic-engineering/agent-harness/tools/tool-calling.typ" as tool_calling
#import "/DarkFactory/agentic-engineering/agent-harness/tools/code-execution.typ" as code_execution
#import "/DarkFactory/agentic-engineering/sandbox.typ" as sandbox
#import "/DarkFactory/agentic-engineering/agent-harness/skills/skills.typ" as skills
#import "/DarkFactory/agentic-engineering/agent-harness/plugins.typ" as plugins
#import "/DarkFactory/agentic-engineering/agent-harness/scripts/scripts.typ" as scripts
#import "/DarkFactory/agentic-engineering/agent-harness/hooks/hooks.typ" as hooks
#import "/DarkFactory/agentic-engineering/agent-harness/tools/mcp.typ" as mcp
#import "/DarkFactory/agentic-engineering/agent-harness/skills/agents-directory.typ" as agents_directory
#import "/DarkFactory/agentic-engineering/agent-harness/skills/claude-directory.typ" as claude_directory

#let state_loop = folder(
  key: "harness_state_loop",
  title: [Smyčka a stav],
  concepts: (
    agent_loop.item,
    session.item,
    transcript.item,
    state.item,
  ),
)

#let environment_tools = folder(
  key: "harness_tools_environment",
  title: [Prostředí a nástroje],
  concepts: (
    environment.item,
    tools.item,
    tool_calling.item,
    code_execution.item,
    sandbox.item,
  ),
)

#let extensions = folder(
  key: "harness_extensions",
  title: [Rozšíření],
  concepts: (
    skills.item,
    plugins.item,
    scripts.item,
    hooks.item,
    mcp.item,
    agents_directory.item,
    claude_directory.item,
  ),
)

#let node = folder(
  key: "harness",
  section: section.item,
  children: (
    state_loop,
    environment_tools,
    extensions,
  ),
)
