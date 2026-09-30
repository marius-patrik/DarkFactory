// 3.3 System architecture.
//
// Purpose:
// - describe the concrete components that implement the design from 3.2;
// - present the architecture diagram;
// - define the boundary between GitHub, GitHub Actions, Docker/Python runner and external
//   coding-agent harnesses;
// - explain event dispatch, workspace isolation, durable state and credentials;
// - keep implementation facts here rather than repeating them in the request walkthrough.
//
// Material to migrate here:
// - current architecture diagram;
// - GitHub / Git / pull request roles;
// - GitHub Actions workflow and event triggers;
// - Docker workspace;
// - runner responsibility;
// - declarative harness registry;
// - GitHub App/token and provider-secret handling.
#heading(level: 2)[Architektura systému] <darkfactory-architecture>
