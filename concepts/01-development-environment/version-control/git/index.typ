#import "../../../schema.typ": folder
#import "../../git.typ" as section
#import "../../branch.typ" as branch
#import "../../merge.typ" as merge
#import "../../squash.typ" as squash
#import "../../pull-request.typ" as pull_request
#import "../../required-checks.typ" as required_checks
#import "../../branch-protection.typ" as branch_protection

#let node = folder(
  key: "git",
  section: section.item,
  concepts: (
    branch.item,
    merge.item,
    squash.item,
    pull_request.item,
    required_checks.item,
    branch_protection.item,
  ),
)
