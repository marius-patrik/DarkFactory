#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/practical.typ" as section
#import "/DarkFactory/manuscript/practical/harness-engineering/index.typ" as harness_engineering
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/index.typ" as darkfactory_architecture
#import "/DarkFactory/manuscript/results/index.typ" as results

#let node = folder(
  key: "practical",
  section: section.item,
  children: (
    harness_engineering.node,
    darkfactory_architecture.node,
    results.node,
  ),
)
