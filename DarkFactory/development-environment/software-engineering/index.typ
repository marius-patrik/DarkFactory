#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/development-environment/software-engineering/software-engineering.typ" as section
#import "/DarkFactory/development-environment/software-engineering/planning.typ" as planning
#import "/DarkFactory/development-environment/version-control/index.typ" as version_control

#let node = folder(
  key: "software_engineering",
  section: section.item,
  concepts: (planning.item,),
  children: (version_control.node,),
)
