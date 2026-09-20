#import "../schema.typ": folder
#import "agentic-engineering.typ" as section
#import "prompt-engineering/index.typ" as prompt_engineering
#import "agent-harness/index.typ" as agent_harness

#let node = folder(
  key: "agentic_engineering",
  section: section.item,
  children: (prompt_engineering.node, agent_harness.node),
)
