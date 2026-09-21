#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/execution-lifecycle/request.typ" as request
#import "/DarkFactory/manuscript/practical/execution-lifecycle/planning-artifact.typ" as planning_artifact
#import "/DarkFactory/manuscript/practical/execution-lifecycle/review-fix-loop.typ" as review_fix_loop
#import "/DarkFactory/manuscript/practical/execution-lifecycle/deterministic-verification.typ" as deterministic_verification
#import "/DarkFactory/manuscript/practical/execution-lifecycle/reconciliation.typ" as reconciliation

#let request_capture = folder(
  key: "darkfactory_request_capture",
  title: [Zachycení požadavku],
  concepts: (request.item,),
)

#let planning = folder(
  key: "darkfactory_planning_lifecycle",
  title: [Plánování a schválení],
  concepts: (
    planning_artifact.item,
    review_fix_loop.item,
  ),
)

#let implementation = folder(
  key: "darkfactory_implementation_lifecycle",
  title: [Implementace],
)

#let verification = folder(
  key: "darkfactory_verification_lifecycle",
  title: [Ověření a revize],
  concepts: (deterministic_verification.item,),
)

#let integration = folder(
  key: "darkfactory_integration_lifecycle",
  title: [Integrace],
  concepts: (reconciliation.item,),
)

#let recovery = folder(
  key: "darkfactory_recovery_lifecycle",
  title: [Obnova a pokračování],
)

#let node = folder(
  key: "darkfactory_execution_lifecycle",
  title: [Životní cyklus požadavku],
  children: (
    request_capture,
    planning,
    implementation,
    verification,
    integration,
    recovery,
  ),
)
