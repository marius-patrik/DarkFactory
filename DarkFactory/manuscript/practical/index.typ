#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/practical.typ" as section
#import "/DarkFactory/manuscript/results/index.typ" as results

#let node = folder(
  key: "practical",
  section: section.item,
  children: (results.node,),
)
