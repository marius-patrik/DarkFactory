#import "../../schema.typ": folder
#import "software-engineering.typ" as section
#import "planning.typ" as planning

#let node = folder(
  key: "software_engineering",
  section: section.item,
  concepts: (planning.item,),
)
