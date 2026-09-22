# GitHub Pages IDE — Remaining Completion Plan

This file contains only the remaining work for the generic GitHub IDE/workbench.

`PLAN.md` owns the thesis/manuscript.
`web/PLAN.md` owns the reusable IDE.
Repository-wide publication/workflow cleanup may touch shared files only where explicitly listed below.

## Current checkpoint — 2026-09-22

The generic IDE core is implemented and the dedicated `ci / web` gate is green at the latest verified checkpoint.

Implemented:
- static GitHub Pages workbench;
- arbitrary repository/ref workspaces;
- browser-local working tree, staging, local commits, explicit push/sync;
- Explorer, Search, Source Control, Monaco, Browser, Diff, GitHub Issues/PRs/Projects/Actions/Releases/Branches/Commits;
- four root Dockview surfaces: primary sidebar, main, secondary sidebar, bottom panel;
- splits within a root Dockview;
- unified tab model and context-menu moves between root surfaces;
- omnibar including files, commands, entities, symbols, URLs, and line navigation;
- launcher/empty-state parity;
- local-state persistence and editor view-state persistence;
- patch/workspace/remote/artifact exports;
- generic capability registry;
- no thesis/school/DarkFactory assumptions in generic `web/` core.

The remaining IDE work is limited to the gaps below.

## Product invariants

Keep:
- generic repository support;
- local-first edits;
- explicit remote writes only;
- static GitHub Pages for the workbench itself;
- one unified tab model;
- Browser and Editor as the renderer axis;
- Review/Compare independent from renderer where supported;
- generic capabilities rather than thesis-specific core behavior.

Do not reintroduce:
- a thesis-specific viewer architecture;
- hidden GitHub mutations;
- repository-specific paths in generic workbench code;
- a global split mode;
- separate tab models for sidebars/panel/main;
- browser-side Typst compilation as a generic or repository capability.

## Explicitly dropped work

### Browser-side Typst compilation — DROPPED

Do not implement WASM/browser Typst compilation.

For `.typ` files:
- Editor remains Monaco/source editing;
- Browser preview may consume already-generated/canonical PDF/HTML/Markdown artifacts when available;
- ordinary IDE behavior must not depend on compiling Typst in the browser.

Do not add:
- a browser Typst compiler;
- incremental browser Typst builds;
- virtual-worktree Typst import resolution;
- browser-generated compiled single-file Typst;
- semantic manuscript Review as a prerequisite for generic IDE completion.

If compiled single-file Typst is later required as a canonical publication artifact, that belongs to the repository publication pipeline, not the generic IDE.

## Remaining Phase 1 — Replace PAT entry with guided GitHub sign-in

### Desired UX

The account action must no longer lead with a raw PAT field.

Primary UX:
1. user chooses **Sign in with GitHub**;
2. the IDE starts a guided GitHub authorization flow;
3. user is shown the GitHub verification step/code when applicable;
4. the GitHub authorization page opens explicitly;
5. the IDE shows pending/authorized/expired/denied state;
6. on success, the IDE validates the resulting user identity and permissions;
7. the token remains session-scoped by default;
8. Sign out clears all auth material.

Do not expose the access token in normal UI.

Do not persist auth tokens in IndexedDB/localStorage.

### Architecture gate

A literal GitHub device-code exchange requires requests to GitHub login endpoints, not only `api.github.com`.

Before implementation:
- verify the deployed GitHub Pages origin can directly perform both device-code request and token polling in the browser;
- verify actual response CORS behavior, not only protocol documentation.

If direct device flow works from the deployed origin:
- use the existing/public GitHub App or OAuth client ID;
- request a device code;
- obey `interval`, `slow_down`, expiry, denial, and cancellation semantics;
- provide Copy Code and Open GitHub actions;
- poll only at the server-provided cadence;
- validate the resulting token through the GitHub API before accepting it.

If GitHub's browser CORS policy blocks the device-code or token endpoint:
- do **not** silently fall back to asking for a PAT;
- do **not** embed a client secret;
- do **not** add an arbitrary general backend;
- stop this subphase at the architecture boundary and require an explicit decision on a minimal auth-only broker or another GitHub-supported browser-safe flow.

The rest of the IDE remains static regardless.

### Removal

Once guided auth is functional:
- remove PAT-first login UI;
- remove token-input help copy;
- keep low-level token storage helpers only if they remain the internal session storage mechanism after authorization;
- remove dead manual-token paths unless deliberately retained as a developer-only escape hatch.

### Exit

- normal users never need to create/paste a PAT;
- private repository workflows work after guided sign-in;
- sign-out fully clears session auth;
- public repositories remain usable anonymously.

## Remaining Phase 2 — True cross-surface tab drag/drop

Current state:
- tabs move inside a Dockview root normally;
- context-menu commands can move a tab between Primary/Main/Secondary/Panel;
- direct drag between separate root Dockview instances is not complete.

Required behavior:
- drag a tab directly from any root surface to any other root surface;
- target surface shows native/consistent Dockview drop affordances;
- dropping can place within a group or create a split where the target supports it;
- preserve tab ID, type, resource, state, pin state where valid, editor view state, Review/Compare state, and active state;
- remove the source panel only after the target accepts/creates the transferred panel;
- persist the resulting layouts atomically enough that reload cannot duplicate or lose the tab;
- auto-open a collapsed target surface when hovering/dropping into it where practical;
- retain context-menu Move actions as keyboard/accessibility fallback.

Implementation direction:
- use Dockview external drag/drop hooks rather than inventing a second drag system;
- attach transferable workbench-tab metadata on panel drag;
- accept compatible external tab drags on the other root Dockview instances;
- materialize the panel in the destination through the shared tab registry/runtime;
- finalize source removal after successful destination creation.

Also verify whole-group dragging. It may remain root-local if cross-root group transfer would add disproportionate complexity; individual tab transfer is mandatory.

### Exit

The acceptance matrix must include:
- Primary → Main;
- Main → Secondary;
- Secondary → Panel;
- Panel → Main;
- dragging into an existing group;
- dragging to create a target split;
- reload after each transfer.

## Remaining Phase 3 — Draggable root-region resizing

Current state:
- Primary/Secondary/Panel sizes are fixed CSS variables;
- visibility toggles work;
- inner Dockview groups resize normally;
- root region boundaries are not user-draggable.

Required behavior:
- drag the edge between Primary and Main to resize Primary;
- drag the edge between Main and Secondary to resize Secondary;
- drag the top edge of the bottom Panel to resize Panel vertically;
- show standard resize cursors and a narrow visible/hit-target separator;
- resize continuously while dragging without text selection or iframe interference;
- persist sizes with the workbench layout;
- restore sizes on reload;
- preserve sizes when a surface is toggled closed/open;
- enforce sensible minimum/maximum sizes so Main cannot be reduced to an unusable area;
- adapt/clamp persisted values on narrow windows;
- double-clicking a separator may reset that dimension to the default size.

Recommended implementation:
- store `primarySize`, `secondarySize`, and `panelSize` alongside root visibility/layout persistence;
- drive the existing CSS custom properties from persisted state;
- use pointer events with pointer capture for the three splitters;
- do not introduce another layout library for three root boundaries.

### Exit

Resize behavior must survive:
- reload;
- theme switch;
- visibility toggle;
- narrow-window resize;
- active Monaco editor;
- active Browser iframe.

## Remaining Phase 4 — Repository/workflow cleanup

The repository currently has four workflow entrypoints:
- `.github/workflows/agent.yml`;
- `.github/workflows/ci.yml`;
- `.github/workflows/deploy-docs.yml`;
- `.github/workflows/release.yml`.

All four currently delegate to a pinned DarkFactory shared-pipeline revision. Treat this as a cleanup target, not as a reason to preserve old workflow shape.

### Remove obsolete/specialized automation

Delete `agent.yml` unless there is a current explicit requirement for issue/comment-triggered autonomous-agent execution in this repository.

Do not retain autonomous issue/comment workflows merely because they existed historically.

### Keep only canonical repository workflows

After the manuscript/publication contract settles, the repository should have only the workflow entrypoints that serve current outputs:

**CI**
- validate manuscript/build contract;
- validate generic `web/`;
- run only current required tests/checks;
- no jobs for removed concept/glossary/review architecture.

**Deploy Documentation / Pages**
- build and publish the current static documentation/IDE site;
- no obsolete viewer/manuscript-specific deployment branches.

**Release**
- publish only the canonical artifacts still required by the final repository/publication contract;
- do not publish legacy review/concept/intermediate artifacts simply because an old workflow did.

For every retained workflow:
- minimize permissions;
- remove stale inputs/variables;
- remove dead artifact names;
- remove obsolete conditions;
- use one obvious trigger model;
- remove comments describing superseded architecture;
- keep shared-pipeline delegation only if it still expresses the final contract more simply than a repository-owned workflow.

Do not rewrite working CI merely for aesthetic independence from DarkFactory; the cleanup criterion is current necessity and simplicity.

## Remaining Phase 5 — Manual browser acceptance

Run the actual deployed/built application through a focused browser QA matrix.

Mandatory:
- guided GitHub sign-in path and private repository access;
- public anonymous repository access;
- cross-root tab drag/drop;
- internal split drag/drop;
- root edge resizing;
- root sizes after reload;
- layout/tab/editor state after reload;
- collapse/reopen sidebars and panel;
- Browser iframe blocked-state UX;
- Browser back/forward/reload;
- Monaco editing and dirty persistence;
- stage/unstage/local commit/explicit push;
- remote-head divergence behavior;
- Issues/PR/Actions write paths under real auth;
- narrow-window behavior;
- keyboard shortcuts;
- no repository-specific assumptions in generic workbench code.

Fix defects found by this pass; do not merely document them.

## Final IDE exit gate

The IDE lane is complete when:
- PAT entry is no longer the normal login UX;
- the chosen guided GitHub auth path works for a real private repository;
- tabs can be dragged directly between all four root surfaces;
- sidebars and bottom panel are edge-draggable and persistent;
- root/split layout survives reload;
- manual browser acceptance passes;
- browser-side Typst compilation is absent from the plan/product;
- generic `web/` remains repository-agnostic;
- `bun run --cwd web check` succeeds;
- dedicated `ci / web` is green;
- obsolete/specialized workflows have been removed or simplified to the final repository contract.

## Parallel-work boundary

The thesis rewrite worker is currently in flight.

IDE work must avoid:
- `paper/PAPER.typ`;
- manuscript bibliography/content;
- thesis structure;
- thesis assets being rewritten by that worker;
- `PLAN.md` unless coordinated separately.

Preferred IDE ownership:
- `web/**`;
- `web/PLAN.md`;
- narrowly scoped `.github/workflows/**` cleanup only after checking the current thesis/publication pipeline contract.

Do not let IDE cleanup overwrite concurrent manuscript work.
