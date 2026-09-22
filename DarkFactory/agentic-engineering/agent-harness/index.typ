#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/introduction.typ" as introduction
#import "/DarkFactory/agentic-engineering/agent-harness/conclusion.typ" as conclusion
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

#let intro = folder(key: "harness", section: introduction.item)

#let state = folder(
  key: "harness_state_loop",
  title: [Smyčka a stav],
  concepts: (
    agent_loop.item,
    session.item,
    transcript.item,
    state.item,
  ),
)

#let environment = folder(
  key: "harness_tools_environment",
  title: [Nástroje a prostředí],
  concepts: (
    environment.item,
    tools.item,
    tool_calling.item,
    code_execution.item,
    sandbox.item,
  ),
)

#let extensions = folder(
  key: "harness_skills_extensions",
  title: [Dovednosti a rozšíření],
  concepts: (
    skills.item,
    plugins.item,
    scripts.item,
    hooks.item,
    mcp.item,
  ),
)

#let close = folder(key: "harness_conclusion", section: conclusion.item)

#let node = folder(
  key: "harness_section",
  title: [Harness],
  children: (
    intro,
    state,
    environment,
    extensions,
    close,
  ),
)
