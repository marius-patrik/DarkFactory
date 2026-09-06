# Architecture Decision Records

Numbered, append-only. An ADR is added when an open decision from `ARCHITECTURE.md` §7 is resolved,
or when any deviation from `ARCHITECTURE.md` is approved (rule 3 in `AGENTS.md`).

Each record states the decision, the alternatives that were rejected **and why**, and what the
decision forecloses. "We chose X because it is better" is not an ADR.

**Status values:** `Proposed` (awaiting the maintainer's approval) · `Accepted` · `Superseded by
ADR-NNNN`. An ADR only binds the implementation once it is `Accepted`.

| # | Title | Status | Resolves |
|---|---|---|---|
| [0001](#adr-0001--one-scene-tree-two-renderer-backends) | One scene tree, two renderer backends | Accepted | — |
| [0002](#adr-0002--profiles-not-themes-and-profiles-are-data) | Profiles, not themes; profiles are data | Accepted | — |
| [0003](#adr-0003--the-modification-surface-is-one-api-for-every-caller) | The modification surface is one API for every caller | Accepted | — |
| [0004](#adr-0004--the-agent-pipeline-is-harness-agnostic) | The agent pipeline is harness-agnostic | Accepted | — |
| [0005](#adr-0005--packages-and-extensions-are-separate-universes) | Packages and extensions are separate universes | Proposed | — |
| [0006](#adr-0006--agent-accountability-is-one-invariant-audit-plus-escrow) | Agent accountability is one invariant: audit plus escrow | Proposed | — |
| [0007](#adr-0007--configuration-lives-in-files-data-lives-in-pglite) | Configuration lives in files, data lives in PGlite | Proposed | D2 |

---

## ADR-0001 — One scene tree, two renderer backends

- **Status**: Accepted
- **Date**: 2026-09-06
- **Resolves**: Supersedes `VISION.md` §6's two-renderer switch; narrows D8

### Context

The source transcript proposes two renderers — `dom-flexbox` (React/Dockview) and
`terminal-cell-grid` (GPU cell matrix) — selected by a setting, and never describes a representation
both consume. Two renderers with no shared representation means every pane, dialog, editor, and
settings screen is implemented twice.

The maintainer then set two requirements the transcript does not cover: a *single* renderer
responsible for browser rendering and terminal alike, extended to 3D, shaders, and particles; and a
TUI surface that genuinely runs in a terminal rather than merely looking like one.

Those requirements are only contradictory if "renderer" is one concept. They are compatible once
sources, the scene tree, and backends are separated.

### Decision

One **scene tree**. Cell-grid layout, widget layout, web content, and 3D are **sources** that emit
into it. Two **renderer backends** consume it:

| Backend | Crate | Target |
|---|---|---|
| GPU compositor | `omnis-render` | Desktop window |
| ANSI/TUI | `omnis-tui` | A real terminal, local or over SSH |

Five primitive classes only — quad, glyph run, texture, path, material layer. Adding a source must
not add a primitive class. **Every primitive declares a terminal fallback**, enforced at the type
level; a primitive without one cannot enter the scene tree.

`cell-grid` presentation mode is the terminal *aesthetic*, GPU-rasterized in a desktop window.
`omnis-tui` is Omnis *running in a terminal*. Different problems, different code, identical features.

### Alternatives rejected

- **Two renderers, no shared representation** (the transcript's model). Every surface built twice;
  features drift apart; the second renderer becomes a second product. This is the specific failure
  the repository exists to avoid.
- **One GPU renderer only.** Cannot run over SSH, in `tmux`, or on a headless box. Fails an explicit
  requirement outright.
- **TUI as a degraded mode of the GPU renderer** — software-rasterize the frame, downsample to
  cells. Inverts the abstraction: the terminal backend would depend on GPU code paths it has no use
  for, and still could not run where no GPU stack exists. It also produces pixel-mush instead of
  text, losing selection, copy, and screen-reader access.
- **DOM as the second backend.** Reintroduces a browser engine inside the product UI, with the
  styling, performance, and parity problems that motivated leaving it. The DOM survives only as an
  out-of-process host for third-party webviews, composited as a texture.

### Consequences

- Owning the renderer means owning text shaping, hit-testing, IME, and **accessibility**. A
  custom-rendered UI publishes no native accessibility tree unless built to, so UIA/AX/AT-SPI is in
  E3's acceptance criteria rather than a later epic.
- The scene tree must land before either backend (E10 before E3), and is now the parity contract as
  well as the view model.
- Adding a primitive class is a two-backend change, deliberately expensive.
- The material layer has no terminal equivalent. Shaders are GPU code; a terminal has no GPU. It
  renders its static fallback, with CPU approximation an opt-in per material.
- D8 collapses from "renderer hot-swap" to "graphics device loss and adapter switching", since
  switching presentation mode is now a layout change.

### What this forecloses

Any feature that cannot be expressed as scene-tree primitives with a working terminal fallback. That
is the intended constraint, not a limitation to work around: a feature that cannot degrade is a
scene-tree design problem, fixed by extending the scene tree, never by branching on the backend.

---

## ADR-0002 — Profiles, not themes, and profiles are data

- **Status**: Accepted
- **Date**: 2026-09-06

### Context

The transcript escalates across four turns from "theme" (colour tokens, icons) to "window styling"
to "System Personality Package" — by the end, selecting one changes the renderer, layout paradigm,
keymap, input routing, extension-host compatibility, and the agent persona. The word "theme" stopped
describing it somewhere around turn 3.

### Decision

A **profile** is a named point in the five-axis capability matrix, plus tokens and assets, expressed
as **data**. The term "theme" is not used.

- No product code may branch on a profile name. Features branch on axis values or capability
  queries. Enforced by lint.
- Adding a profile requires zero code changes.
- **Agent persona is not an axis.** A profile may *suggest* a persona; it never sets a provider,
  model, or reasoning effort behind the user's back.

### Alternatives rejected

- **Keeping "theme".** Implies decoration and understates the blast radius. Someone reading
  "switching theme" will not expect their keymap to change.
- **Profiles as code or plugins.** Makes every profile a supply-chain and review surface, and makes
  "add a brand" a code change — precisely the per-profile bolt-on the whole design rejects.
- **Binding persona to profile** (the transcript's `aiPersona`). Selecting a *look* would silently
  select a model provider and reasoning effort. Nobody asked for that coupling, and it surprises
  anyone who wants one product's layout with a different model.

### Consequences

- The profile file format becomes a compatibility surface with its own versioning obligation.
- The lint is load-bearing; without it the invariant erodes on the first deadline.
- Third-party trade dress becomes a data and licensing question (D3) rather than a code question,
  which is the right place for it.

---

## ADR-0003 — The modification surface is one API for every caller

- **Status**: Accepted
- **Date**: 2026-09-06

### Context

The maintainer requires the system to be fully modifiable by the user *and* by the integrated agent
*and* by external agents. The transcript treats configuration as something the GUI edits and the
database stores; it never states how an agent changes anything, nor what stops one from changing
something it should not.

### Decision

Everything configurable is modifiable at runtime through **one** control-socket API
(`ARCHITECTURE.md` §3.2):

- **No privileged surface.** The GUI is a control-socket client like the CLI or an external harness.
  Anything changeable by clicking is changeable by `omnis` and by an agent over MCP, via the same
  operation.
- **Introspectable, not guessable.** Clients enumerate settings, axes, legal values, profiles,
  keymaps, layouts, extensions, and material layers rather than hardcoding them.
- **One validation path, one approval path.** Side-effectful mutations pass the same escrow whoever
  sent them. There is no trusted-caller shortcut.
- **Attributed.** Every mutation records who made it — user, integrated agent, or a named external
  harness — in the audit stream.
- **Reversible.** Layered config files plus recorded mutations make any change diffable and
  revertible.

### Alternatives rejected

- **A privileged GUI API plus a limited API for everyone else.** Guarantees drift: the GUI path gets
  the attention, the scriptable path rots, and agents end up working around it.
- **A separate agent API.** Two APIs to keep in sync, and agents end up with either less power than
  the user (useless) or more (unsafe).
- **Trusting the integrated agent more than external ones.** Identity is not a security boundary
  here — both execute arbitrary model output. The gate belongs on the *action*, not the caller.
- **Making everything modifiable without attribution.** An unattributable change is
  indistinguishable from a compromise. Attribution is what makes granting agents this power
  defensible at all.

### Consequences

- Every setting needs a machine-readable schema; the introspection endpoints are a compatibility
  surface.
- Approval escrow sits on the mutation path and must be fast enough not to be routed around.
- Audit stream volume grows with agent activity and needs a retention policy.
- Any "GUI-only" feature is a defect by definition.

---

## ADR-0004 — The agent pipeline is harness-agnostic

- **Status**: Accepted
- **Date**: 2026-09-06

### Context

The delivery pipeline was hardcoded to Google Antigravity's `agy`, with fallback only *between
models within that one CLI*. During this repository's first real run, Antigravity exhausted both
fallback tiers mid-implementation and two approved plans stalled at `Blocked` with nothing else to
try — a single vendor's quota halted delivery entirely.

### Decision

Coding-agent CLIs are described declaratively in `.github/scripts/harnesses.py`: a binary, an argv
template, a model chain, and credential keys. Antigravity, Claude Code, Codex, Kimi, Grok, Cursor,
and opencode ship in the registry.

- Fallback escalates **across harnesses**, not only across models.
- Harnesses whose binary is absent from `PATH`, or whose credentials are unset, are **skipped, not
  failed**.
- `AGENT_HARNESS_CHAIN` and `AGENT_HARNESS_CONFIG` override order and every field at runtime.
- Prompts are passed as argv elements, never through a shell.

### Alternatives rejected

- **Stay single-vendor.** Demonstrated to halt delivery on one provider's quota. Not hypothetical —
  it happened during the run that motivated this ADR.
- **`if`/`elif` per CLI in the runner.** Every new CLI edits the core retry loop, and each upstream
  flag rename becomes a code change, a review, and a container rebuild.
- **A wrapper shell script per CLI in the image.** Moves invocation into shell — where prompt
  quoting becomes an injection risk — and puts it beyond the reach of unit tests.
- **An LLM API abstraction instead of CLIs.** These tools are agents, not completions endpoints:
  they carry their own tool loops, permissions, and repository awareness. Reimplementing that is the
  project, not a dependency.

### Consequences

- Invocation flags are a maintenance surface. Mitigated by making every field overridable from a
  repository variable, so upstream drift never requires a code change.
- The container is larger and its build tolerates per-CLI failure, printing a manifest of what
  actually landed rather than pretending.
- Harness behaviour differs — output verbosity, tool permissions, repository conventions. Prompts
  must not assume any one CLI's habits.

---

## ADR-0005 — Packages and extensions are separate universes

- **Status**: Proposed
- **Date**: 2026-09-06
- **Promotes**: `VISION.md` §9.3

### Context

The transcript draws a line most tools blur: **packages** are what the *user's project* runs on (Bun,
Cargo, uv, Homebrew, APT), while **extensions** are what the *workspace and its agents* run on (VS
Code extensions, LSPs, MCP servers, agent skills, profiles, icon packs). VS Code, for one, merges
these — its extension host installs both editor features and toolchains, and the result is a
permissions model nobody can reason about.

### Decision

Two installable universes, never merged, with separate commands, separate stores, and separate
capability grants: `omnis pkg` / `ctx.packages` and `omnis ext` / `ctx.extensions`.

A package is scoped to a project or the host OS and has no access to the Omnis client. An extension
is scoped to the client, the editor, or an agent, and has no ability to mutate a project's
dependency graph. Crossing the line requires an explicit, audited grant.

### Alternatives rejected

- **One unified "add-on" system.** Simpler to describe, impossible to secure: a linter and a shell
  toolchain would share a permission surface, so either the linter is over-privileged or the
  toolchain is under-privileged.
- **Extensions only, treating packages as an extension concern.** Makes every project dependency an
  Omnis dependency, which breaks the moment a project must build without Omnis installed.
- **Packages only, no extension system.** Forecloses D5 and the whole VS Code compatibility path.

### Consequences

- Two resolvers, two caches, two lockfile stories. The FastCDC content-addressed store is shared
  underneath, so the duplication is in policy, not in bytes.
- A user installing "a thing" must be told which universe it lands in; the CLI and UI have to make
  that obvious rather than guessing.
- Anything wanting both — a toolchain that also contributes editor features — must ship as two
  artifacts with an explicit grant between them.

---

## ADR-0006 — Agent accountability is one invariant: audit plus escrow

- **Status**: Proposed
- **Date**: 2026-09-06
- **Promotes**: `VISION.md` §9.5; completes ADR-0003

### Context

ADR-0003 grants external agents the same modification power as the user. The transcript describes an
append-only agent audit stream with a killswitch, and separately an approval escrow with expiring
tickets. They are presented as two features. They are one invariant, and ADR-0003 is not safe
without them.

### Decision

Every side-effectful action taken by any agent — integrated or external — is subject to both:

1. **Recorded** in an append-only audit stream before it takes effect: actor, action category
   (`fs_write`, `shell_exec`, `sql_query`, `net_request`, `config_mutate`), parameters, and outcome.
   The stream is append-only at the storage layer, not by convention.
2. **Gated** by an approval escrow ticket when the action is classed as side-effectful. Tickets
   expire; an expired ticket is a denial, never a silent grant.

A one-click killswitch revokes in-flight execution, not merely future execution.

Actions that cannot be recorded cannot be executed. There is no unaudited path, including for the
integrated agent.

### Alternatives rejected

- **Audit without escrow.** A perfect record of damage already done. Useful forensically, useless
  preventively.
- **Escrow without audit.** Approvals with no history: no way to answer "what has this agent been
  doing", and no way to review a standing grant.
- **Per-agent trust levels.** Re-introduces the trusted-caller shortcut ADR-0003 rejects. Both run
  arbitrary model output; the gate belongs on the action.
- **Approving per session rather than per action class.** The usability win is real, but a session
  grant is unbounded in scope and time — exactly the failure mode expiring tickets exist to prevent.
  Batching remains available *within* an action class, which is where it is safe.

### Consequences

- Escrow is on the hot path for every mutation and must be fast, or users will disable it.
- Audit volume is significant under agent load; retention and compaction need a policy, and
  compaction must not be able to erase history.
- Interactive latency: an agent doing many small writes will hit escrow repeatedly. Grouping by
  action class with a bounded ticket is the mitigation, and its bounds need stating.

---

## ADR-0007 — Configuration lives in files, data lives in PGlite

- **Status**: Proposed
- **Date**: 2026-09-06
- **Resolves**: D2

### Context

The transcript puts appearance profiles in a `brand_appearance_profiles` table *and* the same
settings in `settings.json`, with no stated precedence. It also names the store: a "Serialized
PGlite Mailbox" — embedded Postgres, not a server, which resolves the local-first tension but not
the overlap.

### Decision

- **Configuration** — profiles, keymaps, layouts, feature flags, settings — lives in versioned files
  and resolves through the layered chain `defaults → profile → user → workspace → runtime`. It is
  diffable, shareable, and reviewable, and it survives losing the database.
- **User data** — workspaces, tabs, chat threads, audit entries, CAS metadata, VCS state, context
  fragments, escrow tickets — lives in PGlite.
- The transcript's `brandAppearanceProfiles` table is **not adopted**. A profile that exists only as
  a row cannot be diffed, reviewed, or shared as a file.
- The test: *would a user want this in version control, or would they be alarmed to find it there?*
  Config is the first; data is the second.

### Alternatives rejected

- **Everything in the database.** Profiles stop being shareable artifacts, configuration becomes
  unreviewable, and a corrupt store takes the user's setup with it.
- **Everything in files.** Chat history, audit streams, and CAS metadata as flat files means no
  queries, no transactions, and a synchronization problem per file.
- **A server Postgres.** Contradicts local-first; makes a background service a hard dependency for a
  desktop application.
- **SQLite instead of PGlite.** Defensible, and lighter. Rejected to stay with the transcript's
  named choice, which also keeps one dialect across the eventual sync/mailbox work. Worth
  revisiting if PGlite's footprint proves unacceptable — that would supersede this ADR.

### Consequences

- Two persistence mechanisms, two backup stories, and a boundary that will be argued about at the
  edges (is a pinned context fragment config or data? — data, because the user did not author it as
  a setting).
- Config changes are file writes, so the modification surface (ADR-0003) must make them atomic and
  attributable in the same way database mutations are.
- The sync boundary (E19) has to handle both, and they have different conflict semantics: config
  merges textually, data merges through the CRDT.
