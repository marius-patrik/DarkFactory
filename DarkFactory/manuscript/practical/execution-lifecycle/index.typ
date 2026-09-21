#import "/DarkFactory/schema.typ": folder

#let request_capture = folder(
  key: "darkfactory_request_capture",
  title: [Zachycení požadavku],
)

#let planning = folder(
  key: "darkfactory_planning_lifecycle",
  title: [Plánování a schválení],
)

#let implementation = folder(
  key: "darkfactory_implementation_lifecycle",
  title: [Implementace],
)

#let verification = folder(
  key: "darkfactory_verification_lifecycle",
  title: [Ověření a revize],
)

#let integration = folder(
  key: "darkfactory_integration_lifecycle",
  title: [Integrace],
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
