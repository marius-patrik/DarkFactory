#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/appendices/encyclopedia/index.typ" as encyclopedia

#let node = folder(
  key: "appendices",
  children: (encyclopedia.node,),
)
