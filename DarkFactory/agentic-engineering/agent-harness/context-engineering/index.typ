#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/context-engineering/context-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/context-engineering/compaction.typ" as compaction
#import "/DarkFactory/agentic-engineering/agent-harness/context-engineering/rag.typ" as rag
#import "/DarkFactory/agentic-engineering/agent-harness/context-engineering/context-rot.typ" as context_rot
#import "/DarkFactory/agentic-engineering/agent-harness/context-engineering/semantic-drift.typ" as semantic_drift

#let node = folder(
  key: "context_engineering",
  section: section.item,
  concepts: (compaction.item, rag.item, context_rot.item, semantic_drift.item),
)
