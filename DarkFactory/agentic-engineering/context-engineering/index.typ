#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/context-engineering/context-engineering.typ" as context_engineering
#import "/DarkFactory/agentic-engineering/context-engineering/context-injection.typ" as context_injection
#import "/DarkFactory/agentic-engineering/context-engineering/prompt-injection.typ" as prompt_injection
#import "/DarkFactory/agentic-engineering/context-engineering/compaction.typ" as compaction
#import "/DarkFactory/agentic-engineering/context-engineering/rag.typ" as rag

#let node = folder(
  key: "agentic_context",
  title: [Kontextové mechanismy],
  concepts: (
    context_engineering.item,
    context_injection.item,
    prompt_injection.item,
    compaction.item,
    rag.item,
  ),
)
