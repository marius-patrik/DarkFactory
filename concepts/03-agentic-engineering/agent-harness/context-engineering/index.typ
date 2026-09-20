#import "../../../schema.typ": folder
#import "context-engineering.typ" as section
#import "compaction.typ" as compaction
#import "rag.typ" as rag
#import "context-rot.typ" as context_rot
#import "semantic-drift.typ" as semantic_drift

#let node = folder(
  key: "context_engineering",
  section: section.item,
  concepts: (compaction.item, rag.item, context_rot.item, semantic_drift.item),
)
