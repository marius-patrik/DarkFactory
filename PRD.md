# DarkFactory — Product Requirements Document

**Status: NORMATIVE.** `PRD.md` is the single normative source for DarkFactory's product
outcomes, constraints, actors, and acceptance measures. It succeeds the former
`ARCHITECTURE.md`/`VISION.md` pair and removes their two-document override relationship; the
non-normative provenance record of the scoping conversations lives under
`.agents/notes/vision_capture.md`.

## 1. Authority and scope

Product requirements in this document are normative. They rank below nothing else except the
facts of the platform they run on.

1. `PRD.md` defines stable product outcomes, constraints, actors, and acceptance measures.
2. `.darkfactory/manifest.json` and the declarable workflow graph define the mutable executable
   declarations: providers and identities, taxonomy, graph nodes and edges, and installed
   consumers.
3. `.agents/rules/*.md` define mandatory contribution and agent behavior.
4. `.agents/notes/adr/*.md` record why significant decisions were made; they do not override
   current PRD requirements.
5. Other `.agents/notes/` files are historical captures and runbooks and are non-normative.
6. Published documentation is a generated view; it is never a source of truth.

A deviation from this document must be explicitly approved by the user and recorded in a numbered
ADR under `.agents/notes/adr/` before it is implemented (`.agents/rules/003-product-requirements-and-adrs.md`).

## 2. Problem and product vision

In manufacturing, a **dark factory** is a production facility operated entirely by robotics and
automated systems; lights remain off because machines do not need light to perform precision
assembly. DarkFactory brings the same paradigm to software engineering: routine but multi-step
work — ingesting feature requests and bug reports, formulating disambiguated plans, writing code,
tests and documentation, running bounded self-review passes, opening bot-authored draft pull
requests, and merging on maintainer approval — proceeds autonomously, "with the lights off".

The central thesis is that autonomous development must be constrained so that it can be trusted:

- **zero hallucinated scope drift** — agents never invent work the user did not approve;
- **zero unattended regressions** — changes are verified by real suites and gates before merge;
- **total alignment with human intent** — the verbatim request and explicit approvals are the
  contract, never an agent's paraphrase of them.

DarkFactory is delivered as a turn-key template repository: a consumer instantiates it and receives
an enterprise-grade autonomous pipeline (agent orchestration, branch protection, project board
automation, documentation publication) without designing any of it.

## 3. Users and jobs

| Actor | Job |
|---|---|
| **Maintainer / operator** | Approves interpretations, plans, and final review; monitors status; supplies credentials and the project board. |
| **Pipeline agent** | Executes the workflow graph autonomously: interpret, plan, implement, self-review, align, open the PR, respond to feedback. |
| **Consumer repository** | Receives and runs the shared pipeline (workflows, scripts, rules) against its own manifest, with its own governance preserved. |
| **Docs reader** | Reads generated documentation and canonical root documents; never a source of truth. |

System-only operation is explicit: DarkFactory performs all pipeline work. There is no manual or
local human substitute for a governed step, and no feature is exempt from the approval gates
because it is "only" a script.

## 4. Goals and non-goals

### Goals

- **Autonomous delivery**: from verbatim request to merged PR with only human approval gates.
- **Anti-hallucination**: verbatim request capture and explicit approval semantics (section 5).
- **Auditability**: every lifecycle transition, review iteration, and outcome is traceable to an
  issue, a PR, and the board's status history.
- **Full quota use**: the pipeline consumes every available provider quota before it pauses;
  an unused account is always preferred over sleeping.
- **Classified outcomes**: a finished step is classified as success, failure, or blocked, never
  guessed from a zero exit code.

### Non-goals (current)

- **No web UI.** The operator surface is the terminal (`df status` / TUI) and GitHub itself.
- **No installation into `PersonalCode` or `dsh-stack`.** Their code may be mined and attributed
  during the TypeScript port, but they are never pipeline consumers.
- **Provider subscription terms are out of scope.** The pipeline neither negotiates nor
  guarantees third-party licensing, quota contracts, or data terms.
- **No manual substitute.** A step performed by hand outside the workflow graph is not a
  pipeline feature.

## 5. Product workflow invariants

The workflow graph, its nodes, edges, and stage sequence are declared (workflow-graph workstream)
and are authoritative over any diagram. Whatever the graph's current shape, these invariants hold:

- **Verbatim request fidelity.** The incoming request is captured into a `Request` issue exactly
  as worded; agents never rewrite or summarize it prior to interpretation.
- **Two explicit human gates, one issue.** The interpretation is approved before a plan is
  written, and the plan is approved before any code is written. Approved plans live as comments on
  the same `Request` issue; one issue is one unit of work, so one PR binds it and closing one
  closes the other. The merge-gates workstream may merge these into a single gate; the invariant
  is that no code is written before an explicit human approval of intent and of approach.
- **Implementation-review gate.** Before the bound PR merges, a review confirming the
  implementation matches the approved plan exactly (`Matches Plan: Yes`) is recorded on the issue;
  divergences are recorded as `Plan Alignment:` comments and explicitly approved.
- **Traceability.** Every PR binds a tracked issue with a closing keyword; every issue and PR is
  on the project board with one of the seven statuses.
- **Bounded review.** Automated self-review is bounded (maximum three iterations) so no run burns
  unbounded tokens.
- **Board invariant.** The seven board statuses — `Backlog`, `ToDo`, `In Progress`, `Blocked`,
  `Done`, `Superseded`, `Dropped` — are mutually exclusive and system-enforced identically across
  every installed repository.

## 6. `df` functional requirements

The target distribution is one command, `df`, built as a TypeScript/Bun executable. It replaces
the loose collection of scripts as the front door and is the only supported interface.

- **Interactive TUI / harness**: an operator session for inspecting state and approving gates.
- **`df run …`**: headless execution of one workflow-graph node from CI or a scheduler.
- **`df status`**: why nothing is happening — missing credential, agent never switched on,
  repository never installed, quota blocked — checked against the things that are silently absent.
- **`df doctor`**: repository/pipeline diagnostics against the manifest.
- **`df install`**: conflict-safe installation and governance propagation into consumer
  repositories (section 8).
- **`df work`**: queue inspection and manipulation.
- **Server-compatible boundary**: `df run` must be embeddable behind a server later without
  redesign; the current boundaries are TUI, headless node execution, and install.

## 7. Agent runtime and provider continuity

The runtime executes coding-agent CLIs through a harness abstraction; no pipeline code knows which
CLI is running. Providers, models, and accounts are manifest declarations, never hardcoded.

- **Embedded `pi`**: autonomous execution runs from a self-contained package (Bun compiled
  binary), not from a checked-out repository alone.
- **Cross-provider mid-session handoff**: an approved step can continue on the next provider when
  the current one exhausts capacity, without restarting the step.
- **Full available quota**: rotation escalates across accounts, then pools, then harnesses; each
  rung is a fresh quota, never a weaker model.
- **Classified outcomes**: steps report success, failure, or blocked explicitly.
- **Repository-variable quota state**: quota state lives in repository variables so it survives
  runner restarts; a scheduled resume sweep continues paused work.
- **Containers**: execution is hermetic and non-root (D4); see section 9.

## 8. Installation and fleet governance

- DarkFactory is installed only in the six declared consumers
  (`marius-patrik/DarkFactory`, `omnis`, `ChessWithQuests`, `OdbornaPrace`,
  `template-OdbornaPrace`, `mono-OdbornaPrace`), all recorded in the manifest `installed_on`.
  `PersonalCode` and `dsh-stack` are excluded.
- GitHub interaction is API-only (shared API client); no subprocess `gh` calls.
- Board statuses are identical system-enforced across every installed site.
- Governance propagation is conflict-safe: files with an unknown prior hash are never
  overwritten; an existing repository `AGENTS.md` is preserved byte-for-byte as a
  repository-policy overlay before the aggregate is generated.
- PRD and notes content are never propagated to consumers; only the rules, adapters, and
  directory conventions are managed, and project-specific knowledge stays owned by the consumer.
- A consumer repository that keeps notes adopts `.agents/notes` (runbooks, captures, and one ADR
  per decision under `.agents/notes/adr/`) exactly as DarkFactory does; the layout convention is
  what is shared, never the notes themselves.

## 9. Identity, security, and secrets

- Credentials exist only in DarkFactory (GitHub repository secrets or the local keychain) and are
  never propagated to consumers or committed.
- Workflow logs must be assumed public: no credential, refresh token, or private key is ever
  echoed into them.
- The automation identity is the `darkfactory-pipeline` GitHub App; a real Claude identity is
  declared in the harness registry. Exact identities and credential names are manifest
  declarations, not prose.
- D4 — **Containerized sandbox isolation**: agent processes execute inside a hermetic container
  with non-root privileges and strict env scoping. Non-root execution is enforced by a `USER agent`
  directive in `docker/Dockerfile.agent`; the unprivileged user is created with uid 1001, matching
  the GitHub runner's user so the bind-mounted workspace stays writable without loosening
  permissions. Containerized runners never inherit ambient host credentials.

## 10. Platform and distribution constraints

- **Runtime/toolchain**: TypeScript on Bun. The Python automation is the migration source and
  port target; it is sunset, not an extension target.
- **`bun test`** is the test command; `bun build --compile` produces all-platform binaries.
- The published npm package remains Node-compatible for consumers that do not run Bun.
- No harness submodule: every provider CLI is installed inside the prepared image, never checked
  out as a submodule of this repository.
- Code may be cannibalized from `dsh-stack` and `PersonalCode` and attributed, but DarkFactory
  never depends on them or installs into them.

## 11. Boards, documentation, and observable acceptance

- The board invariant of section 5 is mandatory across every installed repository; the executable
  schema lives in the manifest, not duplicated here.
- Documentation is generated from source: `PRD.md`, `.agents/rules/*.md`, and
  `.agents/notes/adr/*.md` are read directly by the docs generator into an ignored transient
  staging directory; no static documentation tree is committed.
- The documentation site's project selector lists every `installed_on` repository, with
  cross-project preview links falling back to the other project's main site.

## 12. Migration and compatibility

- The Python scripts are the reference implementation being ported to TypeScript/Bun `df`;
  compatibility is staged and rollback-capable.
- Publication stays Node-compatible while binaries extend platform coverage.
- Consumer migration is contract-based: managed files are versioned by hash; a schema version is
  recorded in each manifest; conflicts are reported in the plan and open an approval-gated
  migration request. Consumers migrate in the declared rollout order (DarkFactory first, omnis
  last because it carries the deepest independent governance corpus).

## 13. Decisions

Durable decisions are recorded in discrete ADRs under `.agents/notes/adr/` and tracked as issues;
this document records only the decisions that bind product acceptance:

| ID | Decision | Where expressed |
|---|---|---|
| D1 | Harness-agnostic agent pipeline | `.agents/rules/014-agent-runtime-and-resilience.md`, harness registry |
| D2 | Two-gate human approval contract | Section 5, `.agents/rules/010-approved-delivery-plan.md` |
| D3 | GitHub-native state synchronization | Section 11, board automation |
| D4 | Containerized sandbox isolation — non-root `USER agent`, uid 1001, strict env scoping | Section 9, `docker/Dockerfile.agent` |
| D5 | Conventional commits and automated formatting | `.agents/rules/005-commit-granularity.md`, `.agents/rules/008-formatting-and-linting.md`, manifest |
| D6 | Pure-code repository settings | manifest-driven settings automation |
| D7 | Virtual documentation publishing | Section 11, docs generator |
| D8 | Multi-tier fallback and quota ladder | Section 7, `.agents/rules/014-agent-runtime-and-resilience.md` |

Decisions invalidated by the TypeScript/Bun `df` target, embedded `pi`, the merged approval gate,
and the declared workflow graph are superseded — either by new ADRs or by the executable
declarations that replaced them. Open questions are tracked as issues, not maintained in this
document; the sections above state only the invariants that must hold regardless of how the open
design workstreams (merge-gates, workflow-graph, harness-auth, rotation, gh-client, cli-release,
docs-site, install-audit) resolve them.
