# GitHub Pages IDE — Secondary Plan

This plan is independent from the thesis/manuscript execution plan in `PLAN.md`.

`PLAN.md` remains authoritative for thesis structure, manuscript content, evidence, school compliance, generated DarkFactory documentation, results, and publication completion.

`web/PLAN.md` owns the reusable GitHub-backed IDE/workbench that hosts the repository and publication tooling.

The two plans may execute in parallel. IDE work must not silently redesign manuscript semantics or overwrite thesis decisions. Thesis work may consume IDE capabilities once they exist, but must not depend on unfinished IDE work unless explicitly stated.

---

## Execution status — 2026-09-22

The generic IDE implementation is functionally complete through Phases 1–8 and has completed the Phase 9 code/CI audit.

Validated generic-core state:

- static GitHub Pages architecture remains intact;
- arbitrary GitHub repository workspaces, local editing, staging, local commits, explicit push/sync, diffs, and persistence are implemented;
- all four Dockview root surfaces, movable/pinnable/splittable tabs, launchers, shortcuts, omnibar navigation, Browser tabs, renderer/review/compare axes, GitHub client surfaces, exports, and capability registry are implemented;
- Explorer handles files, directories, submodules, symlinks, local rename/delete, staged decorations, and copy-path;
- omnibar supports files, symbols, commands, branches, tags, commits, issues/PRs, workflow runs, projects, releases, recent workspaces, URLs, and line navigation;
- patch export supports aggregate local state, working tree, staged state, all local commits, and individual local commits;
- current-workspace ZIP, remote-ref ZIP, Actions artifacts/logs, and release-asset downloads are implemented;
- generic `web/` code contains no DarkFactory, thesis, school, manuscript-path, or publication-schema assumptions;
- the dedicated `ci / web` gate is green on the current generic implementation.

Remaining validation work is manual browser QA across the acceptance matrix where CI cannot exercise drag/drop, iframe blocking, reload UX, narrow-window interaction, and real authenticated repository workflows.

Repository-specific extensions are not generic-core blockers. The notable outstanding DarkFactory-Paper extension is deterministic compiled single-file Typst generation and publication as a canonical release artifact. Browser-side Typst compilation and semantic manuscript Review remain optional capability-provider work unless separately promoted.

---

## Product goal

Build a **general-purpose GitHub IDE that runs entirely as a static GitHub Pages application**.

The IDE must work with **any GitHub repository the authenticated user can access**. DarkFactory-Paper is only the first/primary repository used to validate the workbench; no core shell, Git model, tab model, browser model, source-control model, or workspace model may assume Typst, a thesis, `DarkFactory/`, `publication.json`, or any repository-specific structure.

The application should provide:

- full repository browsing and editing;
- client-local changes until explicit GitHub writes;
- Git-aware diffs, staging, local commits, branches, push/sync;
- GitHub issues, pull requests, projects, Actions, releases, branches/tags, commits, and search;
- arbitrary editable repository files through Monaco;
- arbitrary embeddable web pages through a browser/iframe tab;
- rendered previews for file types where a renderer exists;
- review and comparison layers independent of renderer;
- arbitrary visible split layouts;
- export of patches, full current workspace, and compiled assets;
- repository/workspace state persistence in the browser;
- optional repository/language capabilities layered on top without specializing the IDE core.

No separate backend or local companion service is required.

---

# 1. Core execution model

## 1.1 Static GitHub Pages application

The deployed application remains fully usable from GitHub Pages.

No required backend service may be introduced for:

- repository browsing;
- editing;
- local working-tree state;
- diffs;
- local staging;
- local commits;
- patch export;
- project export;
- browser preview;
- workspace layout;
- GitHub API access;
- ordinary rendering where a browser/client implementation exists.

GitHub is the remote service for:

- repository objects and refs;
- explicit pushes;
- branches/tags;
- issues;
- pull requests;
- reviews/comments;
- Projects;
- Actions;
- checks;
- releases;
- canonical CI/build outputs;
- Pages deployment.

## 1.2 Local-first Git semantics

Editing must be local to the browser until an explicit remote mutation.

The working model is:

`GitHub remote snapshot → client working tree → staging/index → local commits → explicit push → GitHub ref`

Normal editing must never:

- autosave files to GitHub;
- create temporary GitHub branches silently;
- create hidden draft commits;
- upload working files for preview;
- invoke Actions simply to preview local changes;
- mutate the repository without a clear user action.

Remote writes occur only through explicit commands such as:

- Push;
- Create branch;
- Create issue;
- Create pull request;
- Add review/comment;
- Merge pull request;
- Dispatch workflow;
- Create/update release;
- explicit repository-file operation.

## 1.3 Client persistence

Persist workspace state in browser storage appropriate for large structured state, preferably IndexedDB and/or OPFS where available.

Persist at least:

- workspace identity;
- repository/ref/base commit;
- cached tree metadata;
- fetched blobs required by the working tree;
- local file overlay;
- staged state;
- local commits;
- open tabs;
- tab groups;
- split layout;
- sidebar/panel layout;
- active tabs;
- cursor/selection/scroll state;
- browser-tab history;
- editor view state;
- user settings;
- recent workspaces.

Local changes must survive reloads.

---

# 2. GitHub authentication

The IDE must remain fully static and must not embed a GitHub client secret.

GitHub's current GitHub App authorization-code exchange requires a client secret even when PKCE is used. That conflicts with the hard static/no-secret boundary, so the browser baseline uses an explicitly supplied GitHub user token (preferably fine-grained) stored in `sessionStorage` only.

Authentication behavior:

- public repositories remain usable without authentication;
- private or otherwise restricted repositories use an explicit user-supplied token;
- validate the token against GitHub before storing it;
- keep the token session-scoped by default;
- clear it on sign-out;
- request/use only repository permissions needed by implemented features;
- do not persist credentials across browser sessions unless a later explicit design provides an appropriate secure mechanism;
- do not reintroduce a browser OAuth exchange that requires shipping a client secret.

If GitHub later provides a secretless browser-safe GitHub App exchange compatible with this static architecture, that flow may replace manual session-token connection without changing the workspace/Git API layers.

Request only permissions needed by implemented features.

Likely capability families:

- repository contents: read/write;
- metadata: read;
- pull requests: read/write;
- issues: read/write;
- Actions/workflows: read/write where dispatch/rerun/cancel is supported;
- checks/statuses: read;
- releases: read/write if release management is implemented;
- projects: appropriate GraphQL read/write permissions;
- workflows content permission only if editing workflow files requires it.

Do not request broad administration/secrets permissions merely to make the IDE appear complete.

---

# 3. Workspace model

## 3.1 Any GitHub repository is a workspace

A workspace is generic:

`repository + ref/base + browser-local state + layout`

Examples:

- `owner/repo @ main`
- `owner/repo @ feature-branch`
- `owner/repo @ commit`
- `owner/repo @ PR head`

No core workspace code may depend on repository-specific paths.

## 3.2 No separate landing page

The app always opens directly into the IDE shell.

There is no separate welcome/landing route.

When the main workbench contains no tabs, display an **empty main view** inside the workbench itself.

First-launch empty state should expose:

### Open workspace
- Open GitHub Repository
- Open Repository URL
- Recent Workspaces
- optionally Create Repository if supported safely

### Open tab
- Editor
- Browser
- Explorer
- Source Control
- Search
- Issues
- Pull Requests
- Projects
- Actions
- Releases
- Branches
- Commits
- Settings

If a repository is already active but no main tabs are open, adapt the empty state to that workspace:

- Open File
- Explorer
- Source Control
- Browser
- Issues
- Pull Requests
- Actions
- Settings

No marketing/onboarding page should replace the workbench.

## 3.3 Repository/ref controls

The top-level shell exposes the active repository and ref.

Repository control supports:

- current repository;
- recent workspaces;
- search accessible repositories;
- organization repositories the user can access;
- open by `owner/repo`;
- open by GitHub repository URL;
- switch workspace.

Ref control supports:

- branches;
- tags;
- commit SHA;
- PR refs where supported.

Changing workspace/ref must preserve independent local state unless the user explicitly discards it.

---

# 4. Workbench shell

The shell has four dockable regions:

1. **Primary sidebar**
2. **Main workbench**
3. **Secondary sidebar**
4. **Bottom panel**

Each region is implemented as a Dockview shell, not a bespoke component hierarchy.

Conceptual layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ repo/ref        [              omnibar              ] account│
├───────────────┬───────────────────────────────────┬──────────┤
│ PRIMARY       │                                   │SECONDARY │
│ SIDEBAR       │          MAIN DOCKVIEW            │ SIDEBAR  │
│ Dockview      │                                   │ Dockview │
│ shell         │                                   │ shell    │
├───────────────┴───────────────────────────────────┴──────────┤
│                    BOTTOM PANEL Dockview                     │
├──────────────────────────────────────────────────────────────┤
│ status bar                                                   │
└──────────────────────────────────────────────────────────────┘
```

There is no hard-coded VS Code activity-bar + special sidebar architecture.

---

# 5. Unified tabs

## 5.1 One tab abstraction

Everything that can be opened is a workbench tab/pane.

Core tab types include:

- Editor
- Browser
- Explorer
- Source Control
- Search
- Diff
- Issues
- Issue
- Pull Requests
- Pull Request
- Projects
- Project
- Actions
- Workflow Run
- Releases
- Release
- Branches
- Commits
- Commit
- Problems
- Output
- Settings
- generic rendered file/document

Repository-specific capability providers may add tab types later without changing the core tab model.

## 5.2 Tabs can live anywhere

A tab can be moved between:

- primary sidebar;
- main workbench;
- secondary sidebar;
- bottom panel.

Tabs use one registry/identity model. Surface placement is layout state, not a different component class.

## 5.3 Pinned tabs

Pinned tabs are ordinary tabs with layout metadata.

Pinned behavior:

- restored automatically;
- protected from ordinary Close All;
- placed predictably in the group;
- optionally compact/icon-only in narrow sidebars;
- can still be unpinned/moved/closed intentionally.

Default pinned tabs may include:

### Primary sidebar
- Explorer
- Search
- Source Control

### Bottom panel
- Problems
- Output

Secondary sidebar may start empty.

No tool is permanently restricted to a given surface.

## 5.4 Tab context menu

Every tab should support relevant actions including:

- Pin / Unpin
- Close
- Close Others
- Close to Right
- Move to Primary Sidebar
- Move to Main
- Move to Secondary Sidebar
- Move to Panel
- Split Right
- Split Down
- Duplicate where meaningful
- Open in Browser renderer / Editor renderer where supported
- Reveal in Explorer where relevant
- Copy resource path/URL where relevant

---

# 6. Split layout

## 6.1 No special split mode

Remove the notion of a global `split mode`.

Splits are represented visually as actual Dockview groups.

Example:

```text
┌───────────────────────┬───────────────────────┐
│ app.tsx | README | +  │ Browser | PR #42 | + │
├───────────────────────┼───────────────────────┤
│                       │                       │
│ Monaco                │ iframe / PR UI        │
│                       │                       │
└───────────────────────┴───────────────────────┘
```

A four-way layout is equally valid.

## 6.2 Drag/drop layout

Support:

- reorder tabs;
- drag tab between groups;
- create split left/right/top/bottom;
- move entire groups;
- close/merge groups;
- resize groups;
- move tabs across root surfaces.

During drag, render visual drop zones.

## 6.3 Group tab strips

Each Dockview group owns a visible tab strip.

Horizontal groups use natural horizontal tabs.

Primary/secondary sidebar groups may use compact or vertical presentation where appropriate, but should still behave as real tabs rather than an icon-only activity bar.

---

# 7. Shell shortcuts

Required shortcuts:

- `Cmd+B` / `Ctrl+B`: toggle primary sidebar
- `Cmd+Option+B` / `Ctrl+Alt+B`: toggle secondary sidebar
- `Cmd+J` / `Ctrl+J`: toggle bottom panel
- `Cmd+P` / `Ctrl+P`: focus omnibar in file/navigation mode
- `Cmd+Shift+P` / `Ctrl+Shift+P`: focus omnibar in command mode
- split-right and split-down shortcuts should follow sensible VS Code-style conventions where practical
- normal editor shortcuts must continue to reach Monaco when appropriate

Empty primary/secondary/panel regions should auto-collapse unless explicitly pinned open.

---

# 8. Omnibar / command center

Replace the current top navigation with a VS Code-style omnibar/command center.

The omnibar is global to the active workspace.

It should support:

- files;
- folders;
- symbols;
- commands;
- commits;
- branches;
- tags;
- issues;
- pull requests;
- workflows/runs;
- projects;
- releases;
- URLs;
- line navigation;
- recent resources.

Suggested modes/prefixes:

- `>` commands
- `@` symbols
- `#` issues/PRs
- `:` line
- URL input → Browser
- plain text → files/resources/search

The omnibar should adapt to active context:

- Editor: file path / symbol / line
- Browser: current URL
- PR: repository + PR
- Workflow: repository + run
- rendered file: repository path / section where supported

The omnibar remains the primary global navigation surface.

---

# 9. New-tab launcher

Every tab group exposes a `+` button.

Clicking `+` opens a context menu/palette; it must not automatically create a publication/document tab.

Suggested launcher groups:

### Files
- New File
- Open File
- Explorer
- Search

### Git
- Source Control
- Branches
- Commits
- Diff

### GitHub
- Issues
- Pull Requests
- Projects
- Actions
- Releases

### Tools
- Browser
- Editor
- Settings

### Workspace
- Open Repository
- Switch Workspace
- Recent Workspaces

Repository capability providers may append contextual tab types.

The same launcher should appear in the empty main view.

---

# 10. Generic Explorer

Replace generated snapshot-only repository browsing with a live GitHub-backed repository Explorer over the active workspace tree.

Required behavior:

- directories;
- files;
- submodules;
- symlinks where GitHub metadata allows;
- lazy blob loading;
- create file/folder where supported;
- rename;
- delete;
- open;
- reveal;
- copy path;
- refresh remote metadata;
- show Git working-tree decorations.

Git decorations should include at least:

- modified;
- added;
- deleted;
- renamed where detectable;
- staged;
- conflicted;
- untracked/client-created.

Explorer operates on the client working tree, not directly on the remote tree once local changes exist.

---

# 11. Generic Editor / Monaco

Monaco is the generic source editor for repository files.

Core language support should include at least:

- TypeScript/JavaScript/JSX/TSX
- JSON
- CSS
- HTML
- Markdown
- YAML
- TOML
- Python
- Rust
- Shell
- XML/SVG
- Typst
- plain text

No code path may assume files are manuscript files.

Required editor behavior:

- editable models;
- dirty state;
- autosave to browser-local working tree;
- undo/redo;
- find/replace;
- multi-cursor;
- minimap;
- diagnostics where a language service exists;
- diff editor;
- cursor/scroll persistence;
- breadcrumbs;
- go-to-line;
- symbol support where possible;
- review/diff decorations independent of editor mode.

Repository/language extensions may add richer language services later.

---

# 12. Renderer model

Retire the current `View / Review / Raw` renderer model.

The renderer axis is only:

- **Browser**
- **Editor**

## 12.1 Browser renderer

Browser visually renders a resource when a renderer exists.

Examples:

- Markdown → rendered Markdown
- HTML → iframe
- SVG → visual SVG
- image → image viewer
- PDF → PDF.js
- Typst → compiled document preview
- JSON → optional structured viewer
- other resources → suitable preview if one exists

## 12.2 Editor renderer

Editor uses Monaco/source-oriented presentation.

Examples:

- `.typ` → Monaco Typst
- `.md` → Monaco Markdown
- `.html` → Monaco HTML
- `.svg` → Monaco XML
- `.ts` → Monaco TypeScript

Binary-only resources may fall back to metadata/hex inspection if no meaningful source representation exists.

## 12.3 Browser tab vs Browser renderer

A **Browser tab** is a generic URL resource.

The **Browser renderer** is a presentation choice for a repository/document resource.

They share iframe/web-rendering infrastructure where appropriate but are not the same tab type.

---

# 13. Generic Browser tab

Implement a real browser-like tab using iframes where allowed.

Per-browser-tab state:

- URL;
- history;
- back;
- forward;
- reload;
- stop;
- open externally;
- copy URL;
- loading/error state.

The omnibar should show/edit the active Browser tab URL.

The Browser tab may display:

- external documentation;
- GitHub Pages;
- project preview;
- generated HTML;
- object/blob URLs;
- any embeddable website.

External websites may block framing through browser security headers. The app must not proxy or circumvent this.

When framing is blocked, display a clear native error state with:

- URL;
- reason where detectable;
- Open externally;
- Copy URL.

---

# 14. Review presentation is independent

Review is a separate toggle/state, not a renderer.

Values:

- Review Off
- Review On

Review state must be orthogonal to:

- Browser vs Editor renderer;
- file type;
- Git comparison state;
- split placement.

Where a repository/language defines semantic review constructs, Review On should render them consistently in both Browser and Editor.

DarkFactory-Paper may provide repository-specific review semantics such as added/removed/unconfirmed/accepted/finalized, but the IDE core must treat these as an extension capability rather than global hardcoded thesis behavior.

For Monaco, review-capable resources may expose:

- inline decorations;
- underline/background states;
- gutter markers;
- hover explanations;
- contextual actions;
- accept/finalize/revert actions where supplied by the capability provider.

For rendered outputs, the same review state may affect PDF/HTML/Markdown/Typst rendering.

Switching Browser ↔ Editor must not reset or change Review state.

---

# 15. Git comparison is independent

Comparison/diff state is separate from Review.

Comparison values should include:

- None
- Working Tree
- Staged
- Commit
- Branch
- Pull Request

Comparison should work in:

- Monaco/source;
- rendered Markdown;
- rendered HTML;
- rendered PDF/Typst when a repository renderer can project the diff;
- any other renderer with a defined comparison adapter.

A resource may therefore be:

- Browser + Review On + Working Tree diff
- Editor + Review On + PR diff
- Browser + Review Off + branch diff
- Editor + Review Off + staged diff

Git state and review state must remain semantically distinct.

---

# 16. Source Control

Source Control is a first-class generic Git tab/panel.

Required sections:

- current branch/ref;
- remote tracking state;
- unstaged changes;
- staged changes;
- local commits not pushed;
- incoming/outgoing state where available;
- commit message input;
- Push;
- Pull/Sync/Rebase workflow as implemented safely.

Required operations:

- inspect file diff;
- inline/side-by-side Monaco diff;
- stage file;
- unstage file;
- stage/unstage hunks where practical;
- discard file/hunk with confirmation;
- create local commit;
- amend local commit;
- create/switch branch;
- push;
- refresh/fetch remote;
- detect remote head movement before push.

The local commit model must remain browser-local until Push.

---

# 17. Client-side Git object model

The client must track:

- base commit SHA;
- base tree;
- blob SHAs;
- local overlays;
- index/staging state;
- local commit graph;
- target remote branch/ref.

When pushing:

1. verify expected remote base/ref;
2. create blobs for changed content;
3. create tree;
4. create commit(s);
5. update remote ref only if safe;
6. refuse/resolve if remote head moved.

Do not force-update refs by default.

Protected-branch workflows should naturally encourage branch + PR.

---

# 18. Diffs

## 18.1 Local diffs

Compare:

- base ↔ working tree
- base ↔ staged
- staged ↔ working tree
- local commit ↔ parent

Required views:

- Monaco inline diff;
- Monaco side-by-side diff;
- unified patch text;
- file-level list;
- hunk navigation.

## 18.2 Remote/GitHub diffs

Support:

- commit ↔ commit;
- branch ↔ branch;
- PR base ↔ head;
- remote ref ↔ local state where meaningful.

## 18.3 Diff navigation

Shared diff navigation model:

- next/previous change;
- next/previous changed file;
- changed line/range;
- changed rendered block/page where a renderer supplies mapping.

No renderer should invent diff semantics independently when a shared comparison model is available.

---

# 19. GitHub-native workbench tabs

The IDE should provide native GitHub-backed views rather than always redirecting to github.com.

## Issues
- list/filter/search;
- issue details;
- body/comments;
- labels;
- assignees;
- milestone;
- state;
- create/edit/comment where authorized.

## Pull Requests
- list/filter/search;
- Overview;
- Conversation;
- Commits;
- Files Changed;
- Checks;
- reviews;
- comments;
- approve/comment/request changes;
- merge where authorized.

## Projects
Use GitHub Projects v2/GraphQL where available.

Expose:
- projects;
- views;
- items;
- linked issue/PR;
- status;
- fields;
- iterations where available.

## Actions
- workflows;
- runs;
- jobs;
- logs;
- artifacts;
- dispatch;
- rerun;
- cancel where authorized.

## Releases
- releases;
- release notes;
- assets;
- source archives;
- create/update release where implemented.

## Branches / Tags / Commits
- browse;
- compare;
- open commit;
- switch branch/ref;
- create branch;
- inspect history.

The application is a GitHub client, not merely a file editor.

---

# 20. Status bar

Status bar is generic and contextual.

Possible left-side state:

- repository/ref;
- branch;
- ahead/behind;
- change count;
- sync state.

Editor context may show:

- line/column;
- language;
- encoding;
- indentation;
- diagnostics.

Renderer-capable resources may show:

- Browser / Editor;
- Review toggle;
- Compare state;
- file/representation type;
- zoom/page state.

Browser tab may show:

- URL/frame state.

Actions may show:

- run/job progress.

Only controls relevant to the active tab should render.

---

# 21. Breadcrumbs / contextual toolbar

The top omnibar is global.

Under each active tab/group, use contextual toolbars/breadcrumbs rather than one universal document toolbar.

Examples:

## Editor
- repository path breadcrumbs;
- symbol breadcrumbs;
- Review;
- Compare;
- editor actions.

## Browser
- back/forward/reload;
- URL state;
- open externally.

## Rendered document/file
- renderer;
- Review;
- Compare;
- representation/file type;
- page/zoom controls if applicable.

## Source Control
- branch;
- refresh;
- commit/push/sync.

## Pull Request
- overview / commits / checks / files / conversation.

## Workflow Run
- rerun/cancel/log/artifact controls.

This keeps the shell generic.

---

# 22. Workspace exports

Exports operate on the current client workspace, including unpushed changes where selected.

## 22.1 Git patch

Allow download of:

- all working-tree changes;
- staged changes;
- one local commit;
- all local commits since remote base.

Output standards-compatible unified `.patch` content.

Committed local changes should preserve useful commit metadata where practical.

## 22.2 Full project

Support:

### Remote repository archive
GitHub archive for selected remote ref.

### Current workspace archive
Client-generated ZIP representing:

`remote base tree + local overlay`

This must include unpushed edits.

## 22.3 Generated assets

Repositories may expose build/export capabilities.

DarkFactory-Paper currently requires:

- PDF
- HTML
- Markdown
- single-file compiled Typst
- full project ZIP
- patch

But the export framework must be generic and capability-based.

Other repositories may expose different artifacts.

---

# 23. Compiled single-file Typst capability

This is a repository/language capability, not a core IDE assumption.

For Typst repositories that opt into it, support an intermediate:

`<project>.compiled.typ`

Observable contract:

- deterministic single `.typ` source;
- self-contained with respect to local Typst source as far as safely possible;
- equivalent rendered document;
- local modules/import composition resolved;
- custom Typst functions preserved;
- usable in Editor;
- downloadable;
- eligible for release publication.

The exact implementation/flattening algorithm remains an implementation decision after inspecting the repository import graph.

Do not confuse this artifact with Typst's separate bundle/export terminology.

---

# 24. Release artifacts

For repositories with configured release outputs, canonical GitHub Actions builds should publish their artifact matrix to Releases.

For DarkFactory-Paper, target release outputs include at least:

- PDF
- HTML
- Markdown
- compiled single-file Typst
- project ZIP

Review-profile artifacts may also be published when explicitly part of the repository's publication contract.

Ad-hoc comparison/diff exports should normally remain client-generated rather than automatically becoming release assets.

---

# 25. Browser-side preview vs canonical build

Where possible, use client-side preview compilation/rendering for unpushed work.

Canonical release/build outputs remain GitHub Actions outputs after Push.

General pattern:

`browser working tree → client preview`

then after Push:

`GitHub branch/commit → Actions → canonical artifacts → Pages/Release`

The workbench should reconcile the current client base SHA with GitHub Action/Pages/Release status.

Do not require Push merely to preview ordinary edits.

---

# 26. Repository capability model

The core IDE must not specialize itself to individual repositories.

Instead, repository/language integrations contribute capabilities such as:

- renderer;
- build task;
- preview;
- artifact export;
- semantic review model;
- structure/outline;
- language service;
- release artifact definitions.

Use existing conventions first:

- package.json
- Cargo.toml
- typst.toml
- workflow files
- repository metadata
- language detection

Only add a repository-specific configuration manifest if existing conventions cannot express the required capability cleanly.

DarkFactory-Paper may provide:
- Typst renderer/compiler;
- PDF/HTML/Markdown outputs;
- compiled Typst;
- semantic manuscript Review;
- semantic Structure.

A normal TypeScript repository should still be fully usable without any of those.

---

# 27. Rich document editing as an optional capability

The generic IDE is not a thesis editor, but repositories/languages may contribute a structured document-editing capability to the **Browser** renderer.

When a resource supports lossless structured editing, Browser may expose Word-like contextual tools while the **Editor** renderer always exposes the exact source in Monaco.

Possible structured-document controls include:
- undo/redo;
- bold/italic/underline/strike;
- superscript/subscript;
- lists;
- indentation;
- alignment where semantically valid;
- links;
- images/figures;
- tables;
- equations/math;
- code blocks;
- footnotes;
- citations;
- cross-references;
- captions;
- comments/review actions;
- find/replace;
- word/character count.

The source remains authoritative.

Do not implement a generic WYSIWYG serializer that destroys arbitrary source syntax, imports, comments, macros/functions, or repository-specific semantics.

For Typst capability specifically:
- Browser may provide source-preserving structured document editing;
- Editor is Monaco over the exact `.typ` source;
- arbitrary custom Typst functions remain first-class;
- completion/symbol data may expose repository-defined functions;
- a contextual **Insert Typst Function…** command may insert the real call and known arguments;
- unsupported/custom constructs remain lossless and may be presented as atomic source-backed nodes rather than rewritten;
- structured edits must patch source ranges deterministically rather than regenerate the full file from a reduced document model.

Review remains independent from Browser/Editor and therefore applies to structured Browser editing and Monaco alike.

---

# 30. Client preview and canonical GitHub build

Unpushed changes must remain previewable without sending source to GitHub.

Where a repository capability provides client-side compilation/rendering:

`browser working tree → client preview artifacts`

Client preview may produce:
- rendered Browser output;
- diagnostics;
- generated intermediate representations;
- downloadable working-tree artifacts.

After explicit Push, GitHub Actions remains authoritative for canonical CI/publication/release output:

`GitHub commit → Actions → canonical artifacts → Pages / Release`

The IDE should always distinguish:
- **local preview**, derived from the browser working tree;
- **canonical remote build**, tied to an exact GitHub commit SHA.

For Typst-capable repositories:
- use a current browser/WASM Typst implementation where feasible;
- resolve imports/resources from the virtual browser working tree;
- support incremental recompilation where practical;
- expose the deterministic single-file compiled Typst intermediate;
- never require a push merely to preview ordinary edits.

For DarkFactory-Paper canonical releases, the configured build/release pipeline should publish at least:
- PDF;
- HTML;
- Markdown;
- compiled single-file Typst;
- project/source ZIP.

Review-profile artifacts may be released only when intentionally part of the repository publication contract.

Ad-hoc Git comparison/diff artifacts remain client exports by default rather than multiplying release assets.

The Actions/Pages/Release views should reconcile their artifacts/status against the exact pushed SHA visible in the workspace.

---

# 31. Security boundaries

Because the application is a static browser IDE:

- obey normal browser same-origin rules;
- never circumvent iframe frame restrictions;
- do not proxy blocked sites merely to make iframe browsing work;
- do not expose hidden GitHub credentials to arbitrary framed pages;
- isolate browser iframes appropriately;
- sanitize rendered Markdown/HTML inputs;
- restrict GitHub writes to explicit user actions;
- do not force-push by default;
- verify expected remote refs before updates;
- do not grant repository administration/secrets permissions without a real implemented requirement.

---

# 30. Parallel-safe repository boundaries

This IDE workstream is intended to run in parallel with thesis work.

Prefer ownership of:

- `web/`
- generic client-side Git/workspace modules
- generic preview/export modules
- generic GitHub API/auth modules
- generic workbench UI
- IDE-specific tests
- release/workflow integration where required

Avoid editing:

- manuscript concept files;
- thesis prose;
- thesis hierarchy;
- thesis citations;
- generated DarkFactory documentation content;
- thesis school-compliance semantics

unless a specific integration requires a narrowly scoped metadata/build hook.

High-conflict shared files require explicit reconciliation before modification:
- `PLAN.md`;
- `AGENTS.md`;
- `README.md`;
- publication templates;
- publication/build scripts;
- `.github/workflows/*`;
- release configuration.

Early IDE phases should not touch these merely for convenience.

If IDE work needs a repository-specific contract, consume the current public schema rather than redesigning it.

`PLAN.md` remains authoritative for thesis execution.
`web/PLAN.md` remains authoritative for the IDE workstream.

---

# 31. Implementation sequence

## IDE Phase 1 — Workbench shell

Goal: replace the current viewer-centric shell with a generic Dockview IDE shell without yet implementing full Git semantics.

Implement:

- root Dockview main workbench;
- primary sidebar Dockview;
- secondary sidebar Dockview;
- bottom panel Dockview;
- unified tab registry;
- movable/pinnable tabs;
- group-local tab strips;
- visible split layouts;
- drag/drop split zones;
- no global split mode;
- empty main view;
- no separate landing page;
- universal `+` tab launcher;
- omnibar shell;
- Cmd+B;
- Cmd+Option+B;
- Cmd+J;
- layout persistence;
- generic Browser tab;
- generic Settings tab;
- generic Explorer shell;
- generic Editor shell.

Exit:
- app boots directly into an empty IDE;
- no hard-coded activity bar remains;
- no separate old app tab bar remains;
- all four root regions are Dockview shells;
- tabs can move across regions;
- splits are visible as real groups.

## IDE Phase 2 — GitHub workspace foundation

Implement:

- session-scoped GitHub token authentication compatible with the static/no-secret boundary;
- repository picker;
- repository URL opening;
- recent workspaces;
- ref picker;
- GitHub tree loading;
- lazy blobs;
- per-workspace persistence;
- client working-tree overlay;
- writable Monaco;
- create/delete/rename;
- dirty state;
- Explorer Git decorations.

Exit:
- any accessible GitHub repository can be opened and edited locally in-browser without remote mutation.

## IDE Phase 3 — Source Control and local Git

Implement:

- base tree/SHA tracking;
- staging;
- local commits;
- unstaged/staged/local-commit groups;
- Monaco diff;
- hunk navigation;
- stage/unstage;
- discard;
- branch creation/switching;
- remote head checks;
- push via Git object/ref APIs;
- sync/fetch behavior;
- patch export;
- workspace ZIP export.

Exit:
- complete local edit → stage → local commit → explicit push loop works against arbitrary repositories.

## IDE Phase 4 — Renderer / Review / Compare architecture

Implement the independent axes:

### Renderer
- Browser
- Editor

### Review
- Off
- On

### Compare
- None
- Working Tree
- Staged
- Commit
- Branch
- Pull Request

### Representation/file type
capability-specific.

Implement shared comparison state and adapters for:

- Monaco;
- Markdown;
- HTML;
- PDF where available;
- other supported rendered resources.

Exit:
- Review and Compare are independent from renderer;
- switching Browser/Editor never discards Review/Compare state;
- diff/review semantics can coexist.

## IDE Phase 5 — Full GitHub client

Implement native workbench tabs for:

- Issues;
- Pull Requests;
- Projects;
- Actions;
- Releases;
- Branches;
- Tags;
- Commits;
- repository/global search where supported.

Include authorized write actions:

- issue create/edit/comment/state;
- PR create/update/review/merge;
- workflow dispatch/rerun/cancel;
- project edits where supported;
- release management where supported.

Exit:
- ordinary GitHub development/collaboration can be performed without leaving the IDE for most repository workflows.

## IDE Phase 6 — Browser and preview framework

Strengthen Browser tabs:

- navigation history;
- URL omnibar integration;
- iframe lifecycle;
- blocked-frame state;
- same-origin previews;
- local blob/object URL previews;
- renderer capability registry;
- file-type detection;
- generic rendered-file tabs.

Exit:
- the IDE behaves as a coherent editor + embedded browser workbench.

## IDE Phase 7 — Language/repository capability system

Implement pluggable capability providers.

Initial providers:

- generic text/Monaco;
- Markdown;
- HTML;
- SVG/images;
- PDF;
- Typst.

Typst provider may add:

- browser-side compilation;
- syntax/language integration;
- generated single-file Typst;
- document structure;
- repository-specific semantic Review when declared.

Do not make Typst a core dependency of generic Git/GitHub features.

## IDE Phase 8 — Export/release integration

Implement generic export surfaces:

- patch;
- current workspace ZIP;
- remote archive;
- capability-generated artifacts.

For DarkFactory-Paper validate:

- PDF;
- HTML;
- Markdown;
- compiled Typst;
- project ZIP.

Align GitHub Actions/Release artifact publication with declared repository capabilities.

## IDE Phase 9 — Integration/QA

Audit:

- arbitrary public repo;
- arbitrary private repo accessible with a validated user-supplied GitHub token;
- branch switching;
- dirty-state persistence;
- reload recovery;
- remote head divergence;
- local commit push;
- PR workflows;
- Issue workflows;
- Action workflows;
- Browser iframe restrictions;
- split/tab persistence;
- Review + Compare + Browser/Editor combinations;
- export correctness;
- mobile/narrow-window degradation where feasible.

No repository-specific assumptions may leak into generic paths.

---

# 32. Initial acceptance matrix

Before declaring the generic IDE foundation complete, demonstrate at least:

1. Open an arbitrary GitHub repository.
2. Open Explorer in the primary sidebar.
3. Open multiple files in main tabs.
4. Split the main workbench visually.
5. Drag a tab into another split.
6. Move Source Control to the secondary sidebar.
7. Move Problems/Output to the bottom panel.
8. Toggle primary sidebar with Cmd+B.
9. Toggle secondary sidebar with Cmd+Option+B.
10. Toggle panel with Cmd+J.
11. Open Browser tab from `+`.
12. Navigate to an embeddable URL.
13. Handle a blocked iframe cleanly.
14. Edit a repository file in Monaco.
15. Reload and recover the local edit.
16. View working-tree diff.
17. Stage/unstage.
18. Create a local commit.
19. Export patch.
20. Export current workspace ZIP.
21. Explicitly push a branch.
22. Open/create a PR.
23. Inspect Actions/checks.
24. Open Issues.
25. Open Releases.
26. Switch repository/workspace without losing the first workspace state.

---

# 33. Non-goals for the generic core

Do not make the generic IDE dependent on:

- DarkFactory manuscript concepts;
- GJKT school rules;
- thesis section numbering;
- a Typst-only workflow;
- PDF-only rendering;
- a specific build system;
- a local daemon;
- a server backend;
- hidden GitHub mutations.

Do not turn the browser tab into a browser-security bypass.

Do not recreate every GitHub administration/security/settings surface unless there is a concrete need.

---

# 34. DarkFactory-Paper as validation consumer

DarkFactory-Paper should use the generic IDE without changing the generic architecture.

Repository-specific capabilities may expose:

- Typst source editing;
- Browser-rendered PDF;
- Browser-rendered HTML;
- Browser-rendered Markdown;
- compiled single-file Typst;
- semantic structure;
- semantic Review;
- Review rendering across Monaco/PDF/HTML/Markdown;
- comparison rendering across those same surfaces;
- Git patch export;
- project ZIP;
- release artifact matrix.

Those are extensions layered onto the generic workbench.

The IDE must remain useful if all DarkFactory-Paper-specific capability providers are removed.

---

# 35. Final gate

The secondary IDE plan is complete only when:

- the application opens directly into the IDE shell with no separate landing page;
- empty main workbench shows workspace/tab actions;
- primary sidebar, main, secondary sidebar, and panel are Dockview shells;
- activity-bar-specific architecture is removed;
- tab behavior is unified across all surfaces;
- horizontal tabs work natively in normal groups;
- splits are visible, draggable, persistent workbench groups;
- Cmd+B toggles primary sidebar;
- Cmd+Option+B toggles secondary sidebar;
- Cmd+J toggles panel;
- omnibar replaces the old viewer-centric top navbar;
- `+` opens a tab-type launcher;
- arbitrary GitHub repositories can be opened as workspaces;
- edits remain client-only until explicit GitHub mutation;
- Monaco edits arbitrary text/code files;
- Browser tabs provide real iframe/web navigation;
- renderer is only Browser or Editor;
- Review is an independent mode toggle;
- Compare is an independent Git comparison state;
- Review and diff formatting can render in Monaco and supported Browser renderers;
- Source Control supports local staging/commits and explicit push;
- patches and full current workspace can be downloaded;
- GitHub Issues/PRs/Projects/Actions/Releases/Branches/Commits are first-class workbench surfaces;
- repository-specific render/build/review capabilities are pluggable;
- DarkFactory-Paper can expose PDF/HTML/Markdown/compiled-Typst capabilities without specializing the core;
- the app remains a static GitHub Pages application.
