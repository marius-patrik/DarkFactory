#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/software-engineering/introduction.typ" as introduction
#import "/DarkFactory/software-engineering/conclusion.typ" as conclusion
#import "/DarkFactory/software-engineering/vibe-coding.typ" as vibe_coding
#import "/DarkFactory/software-engineering/slop.typ" as slop
#import "/DarkFactory/software-engineering/spec-driven-development.typ" as spec_driven_development
#import "/DarkFactory/software-engineering/planning.typ" as planning
#import "/DarkFactory/software-engineering/version-control.typ" as version_control
#import "/DarkFactory/software-engineering/branch.typ" as branch
#import "/DarkFactory/software-engineering/pull-request.typ" as pull_request
#import "/DarkFactory/software-engineering/continuous-integration.typ" as continuous_integration
#import "/DarkFactory/software-engineering/integration-test.typ" as integration_test

#let intro = folder(
  key: "ai_assisted_development_intro",
  section: introduction.item,
)

#let specification = folder(
  key: "ai_assisted_specification",
  title: [Zadání a způsob práce],
  concepts: (
    vibe_coding.item,
    spec_driven_development.item,
    planning.item,
  ),
)

#let change = folder(
  key: "ai_assisted_change_control",
  title: [Řízení změny],
  concepts: (
    version_control.item,
    branch.item,
    pull_request.item,
  ),
)

#let verification = folder(
  key: "ai_assisted_quality_verification",
  title: [Kvalita a ověřování],
  concepts: (
    slop.item,
    continuous_integration.item,
    integration_test.item,
  ),
)

#let close = folder(
  key: "ai_assisted_development_conclusion",
  section: conclusion.item,
)

#let node = folder(
  key: "ai_assisted_development",
  title: [AI-asistovaný vývoj],
  children: (
    intro,
    specification,
    change,
    verification,
    close,
  ),
)
