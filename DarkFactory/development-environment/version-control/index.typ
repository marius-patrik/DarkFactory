#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/development-environment/version-control/version-control.typ" as section
#import "/DarkFactory/development-environment/version-control/git/index.typ" as git

#let node = folder(
  key: "version_control",
  section: section.item,
  children: (git.node,),
)
