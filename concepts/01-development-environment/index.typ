#import "../../templates/common.typ": define-term, translation
#import "../schema.typ": section
#import "version-control.typ" as version_control
#import "git.typ" as git
#import "branch.typ" as branch
#import "pull-request.typ" as pull_request
#import "merge.typ" as merge
#import "planning.typ" as planning
#import "continuous-integration.typ" as continuous_integration
#import "required-checks.typ" as required_checks
#import "branch-protection.typ" as branch_protection
#import "software-engineering.typ" as software_engineering
#import "github.typ" as github
#import "squash.typ" as squash
#import "github-actions.typ" as github_actions
#import "container.typ" as container

#let terminology = define-term(id: "development-environment-practices", proper: translation(cs: "Vývojové prostředí a praxe", en: "Development Environment and Practices"), explanation_cs: "Soubor verzovacích, plánovacích, integračních a kontrolních postupů tvořících deterministické prostředí pro agentní vývoj softwaru.", explanation_en: "The set of versioning, planning, integration, and verification practices that form a deterministic environment for agentic software development.", keyword: false)

#let item = section(
  key: "development_environment",
  term: terminology,
  heading: terms => [#finalized[Vývojové prostředí a praxe]],
  theory_prelude: none,
  theory_intro_heading: none,
  theory_intro: none,
  theory_summary: none,
  practical_prelude: none,
  practical_intro_heading: none,
  practical_intro: none,
  practical_summary: none,
  practical_grouped: false,
  concepts: (
    version_control.item,
    git.item,
    branch.item,
    pull_request.item,
    merge.item,
    planning.item,
    continuous_integration.item,
    required_checks.item,
    branch_protection.item,
    software_engineering.item,
    github.item,
    squash.item,
    github_actions.item,
    container.item,
  ),
)
