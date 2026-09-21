#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/development-environment/development-environment.typ" as section
#import "/DarkFactory/development-environment/github.typ" as github
#import "/DarkFactory/development-environment/runtime.typ" as runtime
#import "/DarkFactory/development-environment/software-engineering.typ" as software_engineering
#import "/DarkFactory/development-environment/planning.typ" as planning
#import "/DarkFactory/development-environment/version-control.typ" as version_control
#import "/DarkFactory/development-environment/continuous-integration.typ" as continuous_integration
#import "/DarkFactory/development-environment/github-actions.typ" as github_actions
#import "/DarkFactory/development-environment/container.typ" as container
#import "/DarkFactory/development-environment/integration-test.typ" as integration_test

#let node = folder(
  key: "development_environment",
  section: section.item,
  concepts: (
    github.item,
    runtime.item,
    software_engineering.item,
    planning.item,
    version_control.item,
    continuous_integration.item,
    github_actions.item,
    container.item,
    integration_test.item,
  ),
)
