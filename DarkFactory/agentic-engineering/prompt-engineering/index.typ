#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/prompt-engineering/prompt-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/prompt-engineering/system-prompt.typ" as system_prompt

#let node = folder(
  key: "prompt_engineering",
  section: section.item,
  concepts: (system_prompt.item,),
)
