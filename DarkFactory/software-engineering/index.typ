#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/software-engineering/software-engineering.typ" as software_engineering
#import "/DarkFactory/software-engineering/vibe-coding.typ" as vibe_coding
#import "/DarkFactory/software-engineering/slop.typ" as slop
#import "/DarkFactory/software-engineering/spec-driven-development.typ" as spec_driven_development
#import "/DarkFactory/software-engineering/planning.typ" as planning
#import "/DarkFactory/software-engineering/version-control.typ" as version_control
#import "/DarkFactory/software-engineering/branch.typ" as branch
#import "/DarkFactory/software-engineering/pull-request.typ" as pull_request
#import "/DarkFactory/software-engineering/continuous-integration.typ" as continuous_integration
#import "/DarkFactory/software-engineering/integration-test.typ" as integration_test
#import "/DarkFactory/software-engineering/dag.typ" as dag
#import "/DarkFactory/software-engineering/runtime.typ" as runtime
#import "/DarkFactory/software-engineering/container.typ" as container

#let ai_assisted_development = folder(
  key: "software_engineering_ai_assisted_development",
  title: [AI-asistovaný vývoj],
  concepts: (
    vibe_coding.item,
    slop.item,
    spec_driven_development.item,
    planning.item,
  ),
)

#let change_management = folder(
  key: "software_engineering_change_management",
  title: [Řízení změn],
  concepts: (
    version_control.item,
    branch.item,
    pull_request.item,
  ),
)

#let verification = folder(
  key: "software_engineering_verification",
  title: [Ověřování a integrace],
  concepts: (
    continuous_integration.item,
    integration_test.item,
  ),
)

#let workflow_modelling = folder(
  key: "software_engineering_workflow_modelling",
  title: [Modelování pracovních postupů],
  concepts: (dag.item,),
)

#let execution_environments = folder(
  key: "software_engineering_execution_environments",
  title: [Běhová prostředí],
  concepts: (
    runtime.item,
    container.item,
  ),
)

#let node = folder(
  key: "software_engineering",
  title: [Software Engineering],
  concepts: (software_engineering.item,),
  children: (
    ai_assisted_development,
    change_management,
    verification,
    workflow_modelling,
    execution_environments,
  ),
)
