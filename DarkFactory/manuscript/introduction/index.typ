#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/introduction/introduction.typ" as section
#import "/DarkFactory/manuscript/introduction/motivation/index.typ" as motivation
#import "/DarkFactory/manuscript/introduction/objectives/index.typ" as objectives
#import "/DarkFactory/manuscript/introduction/methodology/index.typ" as methodology

#let node = folder(
  key: "thesis_introduction",
  section: section.item,
  children: (
    motivation.node,
    objectives.node,
    methodology.node,
  ),
)
