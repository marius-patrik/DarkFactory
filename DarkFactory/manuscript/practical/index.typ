#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/practical.typ" as section
#import "/DarkFactory/manuscript/practical/introduction/index.typ" as introduction
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/index.typ" as darkfactory_architecture
#import "/DarkFactory/manuscript/practical/execution-lifecycle/index.typ" as execution_lifecycle
#import "/DarkFactory/manuscript/results/index.typ" as results

#let node = folder(
  key: "practical",
  title: [Praktická část],
  section: section.item,
  children: (
    introduction.node,
    darkfactory_architecture.node,
    execution_lifecycle.node,
    results.node,
  ),
)
