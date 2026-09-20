#import "../../../schema.typ": folder
#import "../../context-engineering.typ" as section
#import "../../../02-language-models/compaction.typ" as compaction
#import "../../../02-language-models/rag.typ" as rag
#import "../../../02-language-models/context-rot.typ" as context_rot
#import "../../../02-language-models/semantic-drift.typ" as semantic_drift

#let node = folder(
  key: "context_engineering",
  section: section.item,
  concepts: (compaction.item, rag.item, context_rot.item, semantic_drift.item),
)
