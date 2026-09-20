#import "../../schema.typ": folder
#import "version-control.typ" as section
#import "git/index.typ" as git

#let node = folder(
  key: "version_control",
  section: section.item,
  children: (git.node,),
)
