#import "../../schema.typ": folder
#import "../prompt-engineering.typ" as section
#import "../system-prompt.typ" as system_prompt

#let node = folder(
  key: "prompt_engineering",
  section: section.item,
  concepts: (system_prompt.item,),
)
