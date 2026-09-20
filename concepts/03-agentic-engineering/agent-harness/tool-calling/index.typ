#import "../../../schema.typ": folder
#import "tool-calling.typ" as section
#import "../../mcp.typ" as mcp

#let node = folder(
  key: "tool_calling",
  section: section.item,
  concepts: (mcp.item,),
)
