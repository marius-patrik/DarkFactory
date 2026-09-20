#import "../../../schema.typ": folder
#import "skills.typ" as section
#import "script.typ" as script
#import "hook.typ" as hook
#import "progressive-disclosure.typ" as progressive_disclosure

#let node = folder(
  key: "skills",
  section: section.item,
  concepts: (progressive_disclosure.item, script.item, hook.item),
)
