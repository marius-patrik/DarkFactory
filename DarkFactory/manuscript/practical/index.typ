#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/practical.typ" as section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/index.typ" as darkfactory_architecture
#import "/DarkFactory/development-environment/index.typ" as development_environment
#import "/DarkFactory/manuscript/results/index.typ" as results

#let node = folder(
  key: "practical",
  section: section.item,
  children: (
    darkfactory_architecture.node,
    development_environment.node,
    results.node,
  ),
)
