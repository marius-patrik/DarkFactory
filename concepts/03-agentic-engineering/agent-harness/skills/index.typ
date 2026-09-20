#import "../../../schema.typ": folder
#import "../../skills.typ" as section
#import "../../script.typ" as script
#import "../../hook.typ" as hook

#let node = folder(
  key: "skills",
  section: section.item,
  concepts: (script.item, hook.item),
)
