#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/darkfactory-architecture.typ" as section

#let design_goals = folder(
  key: "darkfactory_design_goals",
  title: [Cíle návrhu],
)

#let overview = folder(
  key: "darkfactory_architecture_overview",
  title: [Celková architektura],
)

#let execution_engine = folder(
  key: "darkfactory_execution_engine",
  title: [Vykonávací jádro],
)

#let capabilities = folder(
  key: "darkfactory_capability_system",
  title: [Systém capabilities],
)

#let integrations = folder(
  key: "darkfactory_external_integrations",
  title: [Externí integrace],
)

#let identity_security = folder(
  key: "darkfactory_identity_security",
  title: [Identita a bezpečnostní hranice],
)

#let interfaces = folder(
  key: "darkfactory_interfaces",
  title: [Rozhraní],
)

#let node = folder(
  key: "darkfactory_architecture",
  title: [Návrh systému DarkFactory],
  section: section.item,
  children: (
    design_goals,
    overview,
    execution_engine,
    capabilities,
    integrations,
    identity_security,
    interfaces,
  ),
)
