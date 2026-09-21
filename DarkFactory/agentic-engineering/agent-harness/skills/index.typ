#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/skills/skills.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/skills/script.typ" as script
#import "/DarkFactory/agentic-engineering/agent-harness/skills/hook.typ" as hook

#let node = folder(
  key: "skills",
  section: section.item,
  concepts: (script.item, hook.item),
)
