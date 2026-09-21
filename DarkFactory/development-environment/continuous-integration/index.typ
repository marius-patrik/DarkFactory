#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/development-environment/continuous-integration/continuous-integration.typ" as section
#import "/DarkFactory/development-environment/continuous-integration/github-actions.typ" as github_actions
#import "/DarkFactory/development-environment/continuous-integration/container.typ" as container
#import "/DarkFactory/development-environment/continuous-integration/integration-test.typ" as integration_test

#let node = folder(
  key: "continuous_integration",
  section: section.item,
  concepts: (github_actions.item, container.item, integration_test.item),
)
