#import "../../schema.typ": folder
#import "introduction.typ" as section
#import "motivation/index.typ" as motivation
#import "objectives/index.typ" as objectives
#import "methodology/index.typ" as methodology

#let node = folder(
  key: "thesis_introduction",
  section: section.item,
  children: (
    motivation.node,
    objectives.node,
    methodology.node,
  ),
)
