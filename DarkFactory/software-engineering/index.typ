#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/software-engineering/software-engineering.typ" as section
#import "/DarkFactory/software-engineering/vibe-coding.typ" as vibe_coding
#import "/DarkFactory/software-engineering/slop.typ" as slop
#import "/DarkFactory/software-engineering/spec-driven-development.typ" as spec_driven_development
#import "/DarkFactory/software-engineering/planning.typ" as planning
#import "/DarkFactory/software-engineering/version-control.typ" as version_control
#import "/DarkFactory/software-engineering/github.typ" as github
#import "/DarkFactory/software-engineering/runtime.typ" as runtime
#import "/DarkFactory/software-engineering/continuous-integration.typ" as continuous_integration
#import "/DarkFactory/software-engineering/github-actions.typ" as github_actions
#import "/DarkFactory/software-engineering/container.typ" as container
#import "/DarkFactory/software-engineering/integration-test.typ" as integration_test

#let node = folder(
  key: "software_engineering",
  section: section.item,
  concepts: (
    vibe_coding.item,
    slop.item,
    spec_driven_development.item,
    planning.item,
    version_control.item,
    github.item,
    runtime.item,
    continuous_integration.item,
    github_actions.item,
    container.item,
    integration_test.item,
  ),
)
