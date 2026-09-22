#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/execution-lifecycle/introduction-section.typ" as introduction
#import "/DarkFactory/manuscript/practical/execution-lifecycle/planning-section.typ" as planning_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/implementation-section.typ" as implementation_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/verification-section.typ" as verification_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/finalization-section.typ" as finalization_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/recovery-section.typ" as recovery_section
#import "/DarkFactory/manuscript/practical/execution-lifecycle/conclusion-section.typ" as conclusion
#import "/DarkFactory/manuscript/practical/execution-lifecycle/request.typ" as request
#import "/DarkFactory/manuscript/practical/execution-lifecycle/planning-artifact.typ" as planning_artifact
#import "/DarkFactory/manuscript/practical/execution-lifecycle/review-fix-loop.typ" as review_fix_loop
#import "/DarkFactory/manuscript/practical/execution-lifecycle/deterministic-verification.typ" as deterministic_verification
#import "/DarkFactory/manuscript/practical/execution-lifecycle/final-alignment.typ" as final_alignment
#import "/DarkFactory/manuscript/practical/execution-lifecycle/reconciliation.typ" as reconciliation

#let intro = folder(
  key: "change_lifecycle_intro",
  section: introduction.item,
)

#let planning = folder(
  key: "change_request_plan",
  title: [Zadání a plán],
  section: planning_section.item,
  concepts: (
    request.item,
    planning_artifact.item,
  ),
)

#let implementation = folder(
  key: "change_implementation",
  title: [Implementace],
  section: implementation_section.item,
)

#let verification = folder(
  key: "change_verification_review",
  title: [Ověření a revize],
  section: verification_section.item,
  concepts: (
    deterministic_verification.item,
    review_fix_loop.item,
  ),
)

#let finalization = folder(
  key: "change_finalization",
  title: [Finalizace],
  section: finalization_section.item,
  concepts: (
    final_alignment.item,
    reconciliation.item,
  ),
)

#let recovery = folder(
  key: "change_interruption_recovery",
  title: [Přerušení a obnova],
  section: recovery_section.item,
)

#let close = folder(
  key: "change_lifecycle_conclusion",
  section: conclusion.item,
)

#let node = folder(
  key: "change_lifecycle",
  title: [Životní cyklus změny],
  children: (
    intro,
    planning,
    implementation,
    verification,
    finalization,
    recovery,
    close,
  ),
)
