#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/development-environment/development-environment.typ" as section
#import "/DarkFactory/development-environment/github.typ" as github
#import "/DarkFactory/development-environment/runtime.typ" as runtime
#import "/DarkFactory/development-environment/software-engineering/index.typ" as software_engineering
#import "/DarkFactory/development-environment/continuous-integration/index.typ" as continuous_integration

#let node = folder(
  key: "development_environment",
  section: section.item,
  concepts: (github.item, runtime.item),
  children: (
    software_engineering.node,
    continuous_integration.node,
  ),
)
