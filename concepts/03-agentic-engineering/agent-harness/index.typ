#import "../../schema.typ": folder
#import "../harness.typ" as section
#import "../sandbox.typ" as sandbox
#import "../human-in-the-loop.typ" as human_in_the_loop
#import "../plugins.typ" as plugins
#import "agent-loop/index.typ" as agent_loop
#import "tool-calling/index.typ" as tool_calling
#import "skills/index.typ" as skills
#import "context-engineering/index.typ" as context_engineering
#import "graph-engineering/index.typ" as graph_engineering

#let node = folder(
  key: "harness",
  section: section.item,
  concepts: (sandbox.item, human_in_the_loop.item, plugins.item),
  children: (
    agent_loop.node,
    tool_calling.node,
    skills.node,
    context_engineering.node,
    graph_engineering.node,
  ),
)
