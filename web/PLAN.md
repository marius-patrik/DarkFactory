# GitHub Pages IDE — Remaining Completion Plan

`web/PLAN.md` defines the remaining generic IDE workstream. The thesis plan is independent.

## Product boundary

The IDE remains:
- generic across GitHub repositories;
- local-first for edits;
- explicit about remote mutations;
- deployable as a static GitHub Pages workbench;
- organized around one unified tab model;
- based on Browser and Editor renderer modes;
- extensible through repository/language capabilities.

Typst source is edited in Monaco. Canonical Typst compilation/publication belongs to repository CI/release workflows.

## Phase 1 — Guided GitHub authentication

Target UX:
1. user selects **Sign in with GitHub**;
2. the app initiates a GitHub-supported guided authorization flow;
3. the user completes authorization in GitHub;
4. the app shows pending/success/denied/expired state;
5. authenticated identity and repository permissions are validated;
6. credentials remain session-scoped;
7. Sign out clears session auth.

Architecture decision:
- verify whether GitHub's device authorization/token endpoints are directly usable from the deployed Pages origin;
- if the browser can complete the flow, implement it directly;
- if GitHub requires a non-browser exchange, bring back one explicit decision for the smallest auth-only architecture compatible with the static workbench.

Public repositories remain usable anonymously.

## Phase 2 — Cross-surface tab drag/drop

Tabs must drag directly among:
- Primary Sidebar;
- Main;
- Secondary Sidebar;
- Panel.

Requirements:
- preserve tab identity, resource, state, pin state, editor view state, Review/Compare state, and active state;
- support dropping into an existing group;
- support creating a split at the destination;
- persist layouts without duplicate/lost tabs;
- keep context-menu Move actions as accessibility/keyboard fallback.

Use Dockview external drag/drop integration so all root surfaces share one interaction model.

## Phase 3 — Resizable root regions

Add draggable separators for:
- Primary/Main;
- Main/Secondary;
- Main/Panel.

Persist:
- primary width;
- secondary width;
- panel height.

Requirements:
- continuous pointer resizing;
- sensible min/max bounds;
- size persistence across reload and hide/show;
- clamping for narrow windows;
- compatibility with Monaco and Browser iframes.

## Phase 4 — Workflow simplification

The repository publication workflow should expose only responsibilities required by the final product:

### CI
- manuscript/build validation;
- generic web validation;
- current required tests/checks.

### Deploy Documentation / Pages
- build and publish the current static IDE/documentation site.

### Release
- publish the final canonical repository artifacts.

Workflow implementation should use:
- minimal permissions;
- a small explicit trigger model;
- current artifact names;
- only inputs and jobs required by the final repository contract.

Shared DarkFactory reusable workflows may remain where they are the simplest expression of the final pipeline.

## Phase 5 — Browser acceptance

Exercise the built/deployed workbench with:
- guided GitHub sign-in and a private repository;
- anonymous public repository;
- cross-root tab dragging;
- internal split dragging;
- root-region resizing;
- layout/editor recovery after reload;
- sidebar/panel hide/show;
- Browser iframe blocked state;
- Browser history/reload;
- Monaco editing and local dirty persistence;
- stage/unstage/local commit/explicit push;
- remote-head divergence;
- Issues/PR/Actions write flows;
- narrow-window layout;
- keyboard shortcuts.

Fix defects found during this pass.

## Exit

The IDE lane is complete when:
- normal login uses guided GitHub authorization;
- private and public repository workflows work;
- tabs drag across all four root surfaces;
- sidebars/panel resize by dragging and persist;
- browser acceptance passes;
- generic `web/` remains repository-agnostic;
- `bun run --cwd web check` passes;
- dedicated `ci / web` is green;
- repository workflows match the final CI/Pages/Release contract.
