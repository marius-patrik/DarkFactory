#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/context-engineering/context-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/context-engineering/context-injection.typ" as context_injection
#import "/DarkFactory/agentic-engineering/context-engineering/compaction.typ" as compaction
#import "/DarkFactory/agentic-engineering/context-engineering/rag.typ" as rag
#import "/DarkFactory/agentic-engineering/context-engineering/semantic-drift.typ" as semantic_drift

#let node = folder(
  key: "context_engineering",
  section: section.item,
  concepts: (
    context_injection.item,
    compaction.item,
    rag.item,
    semantic_drift.item,
  ),
)
