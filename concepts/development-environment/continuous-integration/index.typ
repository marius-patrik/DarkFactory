#import "../../schema.typ": folder
#import "continuous-integration.typ" as section
#import "github-actions.typ" as github_actions
#import "container.typ" as container
#import "flaky-test.typ" as flaky_test

#let node = folder(
  key: "continuous_integration",
  section: section.item,
  concepts: (github_actions.item, container.item, flaky_test.item),
)
