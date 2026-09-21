#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/darkfactory-architecture.typ" as section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/design-goals.typ" as design_goals_section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/overview.typ" as overview_section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/execution-engine.typ" as execution_engine_section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/capabilities.typ" as capabilities_section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/integrations.typ" as integrations_section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/identity-security.typ" as identity_security_section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/interfaces.typ" as interfaces_section
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/darkfactory.typ" as darkfactory
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/protocol.typ" as protocol
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/run-state.typ" as run_state
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/routing.typ" as routing
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/supervisor.typ" as supervisor
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/result-capture.typ" as result_capture
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/recovery.typ" as recovery
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/capability.typ" as capability
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/capability-abi.typ" as capability_abi
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/capability-adapter.typ" as capability_adapter
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/github-control-plane.typ" as github_control_plane
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/keychain.typ" as keychain
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/browser-auth.typ" as browser_auth
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/cli.typ" as cli
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/web.typ" as web
#import "/DarkFactory/manuscript/practical/darkfactory-architecture/docs-compiler.typ" as docs

#let design_goals = folder(
  key: "darkfactory_design_goals",
  title: [Cíle návrhu],
  section: design_goals_section.item,
)

#let overview = folder(
  key: "darkfactory_architecture_overview",
  title: [Celková architektura],
  section: overview_section.item,
  concepts: (darkfactory.item,),
)

#let execution_engine = folder(
  key: "darkfactory_execution_engine",
  title: [Vykonávací jádro a stav],
  section: execution_engine_section.item,
  concepts: (
    protocol.item,
    run_state.item,
    routing.item,
    supervisor.item,
    result_capture.item,
    recovery.item,
  ),
)

#let capabilities = folder(
  key: "darkfactory_capability_system",
  title: [Systém capabilities],
  section: capabilities_section.item,
  concepts: (
    capability.item,
    capability_abi.item,
    capability_adapter.item,
  ),
)

#let integrations = folder(
  key: "darkfactory_external_integrations",
  title: [Externí integrace],
  section: integrations_section.item,
  concepts: (github_control_plane.item,),
)

#let identity_security = folder(
  key: "darkfactory_identity_security",
  title: [Identita a bezpečnostní hranice],
  section: identity_security_section.item,
  concepts: (
    keychain.item,
    browser_auth.item,
  ),
)

#let interfaces = folder(
  key: "darkfactory_interfaces",
  title: [Rozhraní],
  section: interfaces_section.item,
  concepts: (
    cli.item,
    web.item,
    docs.item,
  ),
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
