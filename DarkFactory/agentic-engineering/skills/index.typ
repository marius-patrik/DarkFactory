#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/skills/skills.typ" as section
#import "/DarkFactory/agentic-engineering/skills/script.typ" as script
#import "/DarkFactory/agentic-engineering/skills/hook.typ" as hook

#let node = folder(
  key: "skills",
  section: section.item,
  concepts: (script.item, hook.item),
)
