#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/execution-lifecycle/request-capture-section.typ" as request_capture_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/planning-section.typ" as planning_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/implementation-section.typ" as implementation_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/verification-section.typ" as verification_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/finalization-section.typ" as finalization_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/recovery-section.typ" as recovery_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/request.typ" as request
#import "/DarkFactory/manuscript/practical/execution-lifecycle/planning-artifact.typ" as planning_artifact
#import "/DarkFactory/manuscript/practical/execution-lifecycle/review-fix-loop.typ" as review_fix_loop
#import "/DarkFactory/manuscript/practical/execution-lifecycle/deterministic-verification.typ" as deterministic_verification
#import "/DarkFactory/manuscript/practical/execution-lifecycle/final-alignment.typ" as final_alignment
#import "/DarkFactory/manuscript/practical/execution-lifecycle/reconciliation.typ" as reconciliation

#let request_capture = folder(
  key: "darkfactory_request_capture",
  title: [Zachycení požadavku],
  section: request_capture_section.item,
  concepts: (request.item,),
)

#let planning = folder(
  key: "darkfactory_planning_lifecycle",
  title: [Plánování a schválení],
  section: planning_section.item,
  concepts: (
    planning_artifact.item,
    review_fix_loop.item,
  ),
)

#let implementation = folder(
  key: "darkfactory_implementation_lifecycle",
  title: [Implementace],
  section: implementation_section.item,
)

#let verification = folder(
  key: "darkfactory_verification_lifecycle",
  title: [Ověření a revize],
  section: verification_section.item,
  concepts: (deterministic_verification.item,),
)

#let integration = folder(
  key: "darkfactory_integration_lifecycle",
  title: [Finalizace a integrace],
  section: finalization_section.item,
  concepts: (
    final_alignment.item,
    reconciliation.item,
  ),
)

#let recovery = folder(
  key: "darkfactory_recovery_lifecycle",
  title: [Obnova a pokračování],
  section: recovery_section.item,
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
