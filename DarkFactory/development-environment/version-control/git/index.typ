#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/development-environment/version-control/git/git.typ" as section
#import "/DarkFactory/development-environment/version-control/git/branch.typ" as branch
#import "/DarkFactory/development-environment/version-control/git/merge.typ" as merge
#import "/DarkFactory/development-environment/version-control/git/squash.typ" as squash
#import "/DarkFactory/development-environment/version-control/git/pull-request.typ" as pull_request
#import "/DarkFactory/development-environment/version-control/git/issue.typ" as issue
#import "/DarkFactory/development-environment/version-control/git/required-checks.typ" as required_checks
#import "/DarkFactory/development-environment/version-control/git/branch-protection.typ" as branch_protection

#let node = folder(
  key: "git",
  section: section.item,
  concepts: (
    branch.item,
    merge.item,
    squash.item,
    issue.item,
    pull_request.item,
    required_checks.item,
    branch_protection.item,
  ),
)
