#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/prompt-engineering/prompt-engineering.typ" as prompt_engineering
#import "/DarkFactory/agentic-engineering/prompt-engineering/system-prompt.typ" as system_prompt

#let node = folder(
  key: "agentic_prompting",
  title: [Instrukce modelu],
  concepts: (
    prompt_engineering.item,
    system_prompt.item,
  ),
)
