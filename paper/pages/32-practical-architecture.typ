// 3.2 System design.
//
// Purpose:
// - explain why DarkFactory is GitHub-native;
// - explain why the first version is intentionally minimal;
// - explain the design goals before describing components;
// - make clear what DarkFactory itself is responsible for versus what external coding-agent
//   harnesses provide;
// - establish the bootstrap idea: the system is already capable of running the agents that
//   can extend it.
//
// Material to migrate here from the current practical chapter:
// - GitHub as interface and durable state;
// - event-driven operation rather than a permanent server;
// - isolation of agent work;
// - deterministic orchestration around model-driven steps;
// - human decision points;
// - the reason for using production coding-agent harnesses rather than implementing a model
//   runtime from scratch.
//
// Do not turn this into another theory section. This is the concrete design rationale of
// DarkFactory.
#heading(level: 2)[Návrh systému DarkFactory] <darkfactory-design>
