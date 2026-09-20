#import "../schema.typ": folder
#import "development-environment.typ" as section
#import "github.typ" as github
#import "software-engineering/index.typ" as software_engineering
#import "version-control/index.typ" as version_control
#import "continuous-integration/index.typ" as continuous_integration

#let node = folder(
  key: "development_environment",
  section: section.item,
  concepts: (github.item,),
  children: (
    software_engineering.node,
    version_control.node,
    continuous_integration.node,
  ),
)
