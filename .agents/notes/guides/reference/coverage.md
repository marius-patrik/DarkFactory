# Documentation coverage and acceptance

This is an acceptance inventory, **not** a second product specification. README defines requirements, accepted ADRs explain decisions, `repo.dfconfig` declares repository policy, and #2070 owns release readiness. “Source-backed” means the named source was inspected; it does **not** mean an external workflow has passed. No first-party end-to-end production user journey is accepted by this table.

## Classification

- **Executable (source-level):** deterministic documentation compilation or packaging behavior with a local test contract; still requires exact-head CI.
- **Guidance (incomplete):** accurate steps or constraints, but the task cannot be completed from the page alone or awaits integration/runtime evidence.
- **Requirement (blocked):** an intended behavior lacking full implemented or accepted evidence.
- **Operational claim (unverified):** implementation is present or advertised but the required live permissions, identity or browser/native results have not been observed.

## Every authored guide

| Guide | Classification | Missing acceptance or verified scope |
| --- | --- | --- |
| [Overview](../introduction/overview.md) | Guidance (incomplete) | #2070 final release/installed-product proof |
| [Installation](../getting-started/installation.md) | Requirement (blocked) | #2709 clean native/Node/container installer, update and digest |
| [First Request](../getting-started/first-request.md) | Requirement (blocked) | #2698/#2699/#2703 live App identity and governed end-to-end Request |
| [Request lifecycle](../operator/lifecycle.md) | Requirement (blocked) | #2698/#2699/#2706 state transitions and authorized merge receipts |
| [Recovery](../operator/recovery.md) | Requirement (blocked) | #2698/#2706 persisted event/effect replay fault-injection |
| [CLI/TUI](../cli/commands.md) | Guidance (incomplete) | Source help is extractable; #2702 installed-binary exits/interaction |
| [Repository configuration](../configuration/repository.md) | Guidance (incomplete) | Docs block parsed; #2696/#2701 full consumer policy and schema tests |
| [Provider credentials](../configuration/credentials.md) | Operational claim (unverified) | #2700 credential handling, routing, failover, quota and redaction |
| [Architecture](../architecture/system.md) | Guidance (incomplete) | #2696 package graph and #2698 runtime recovery acceptance |
| [Capabilities](../capabilities/extensions.md) | Requirement (blocked) | #2701 ABI manifest validation, adapters, effects, sandbox and consumer |
| [GitHub setup](../administration/github.md) | Operational claim (unverified) | #2699/#2700/#2488 App, broker, Projects and permission readback |
| [Fleet](../administration/fleet.md) | Requirement (blocked) | #2705/#2709 approved IDs, reconciled installation receipts |
| [Contributing](../development/contributing.md) | Guidance (incomplete) | Exact-head full quality CI and reviewed integration |
| [Site build](../development/site-build.md) | Executable (source-level) | Docs-only preview and manifest logic exist; DF-03 contract mismatch and live Pages gate |
| [Release](../release/publishing.md) | Requirement (blocked) | #2707/#2708/#2709 protected tag, candidate artifacts and approval |
| [Reference](contracts.md) | Guidance (incomplete) | Syntactic exports are not semantic APIs; state/event contracts need #2698 |
| [Security](../security/boundaries.md) | Requirement (blocked) | #2700/#2706 browser/auth and hostile-input acceptance |
| [This inventory](coverage.md) | Guidance (incomplete) | Update classification when exact-head evidence is attached to #2704 |

## Operational topic-to-evidence map

| Task | Entry point | Observable result expected before declaring complete | Gate |
| --- | --- | --- | --- |
| Install/update | [Installation](../getting-started/installation.md) | Native binary version, checksum, installed path and source-free execution | #2709 |
| Initial repo config | [Configuration](../configuration/repository.md) | Accepted single config, resolved identity/permissions and valid quality actions | #2696/#2697 |
| GitHub App/user auth | [GitHub setup](../administration/github.md) | Distinct App and browser-user identity readback; unauthorized operation denied | #2699/#2700/#2703 |
| Credentials/models | [Provider credentials](../configuration/credentials.md) | No static secrets; usable route, rejection, quota and failover receipts | #2700 |
| Intake/Planning | [First Request](../getting-started/first-request.md) | Issue and Planning revision linked to exact run/base | #2698 |
| Planning review/approval | [Request lifecycle](../operator/lifecycle.md) | Independent disposition; one fresh owner approval; stale revision rejected | #2698/#2706 |
| Execution/checks | [Request lifecycle](../operator/lifecycle.md) | Persisted node/effect transitions; real required checks on head SHA | #2697/#2698 |
| PR review/approval/merge | [Request lifecycle](../operator/lifecycle.md) | Bot-authored PR, independent human review, protected merge readback | #2699/#2706 |
| Recovery/quota | [Recovery](../operator/recovery.md) | Persisted restart and quota resumption without repeated remote effects | #2698/#2700/#2706 |
| Projects | [GitHub setup](../administration/github.md) | Stable IDs and read/write/readback within correct user/App scopes | #2488 |
| Capabilities | [Extensions](../capabilities/extensions.md) | Validated manifests and runnable adapter on real consumer | #2701 |
| Fleet | [Fleet](../administration/fleet.md) | Approved repository IDs and non-destructive receipt readback | #2705 |
| Production troubleshooting | [Recovery](../operator/recovery.md) | Recorded failing state and safe disposition, not repeated write | #2706 |
| Release/rollback | [Publishing](../release/publishing.md) | Exact-tag candidate, reviewed promotion, recoverable published digest | #2707/#2708/#2709 |

## Independent DF-03 integration blocker

At the inspected DF-03 SHA `68aa2c952c74da593b66e26e9f64d83aba7fb8b3`, `packages/web/scripts/build.ts` writes `web-manifest.json`, emits `index.html` without `<base href>`, and supplies `darkfactory-web.example.json`. DF-04's `stageWebBundle` instead requires `darkfactory-web-manifest.json` with schemaVersion 1, sourceSha, basePath, routeMode, complete SHA-256 asset list, and an exact `<base href>`. Those **interfaces are incompatible**. Do not reinterpret one as the other or weaken digest checks. The Web owner (#2703) must agree on and produce the secure manifest or explicitly request a reviewed cross-owner adapter. No synthetic fixture proves browser interoperability.

The publication workflow is configured to accept only successful run artifacts from `.github/workflows/build-web.yml` named `darkfactory-web-candidate`, on the same repository, source SHA and ref. That trusted producing workflow **does not yet exist** at the inspected source SHA. This is an intentional fail-closed dependency.

The `github-pages` deployment environment must be configured by a repository administrator with **required human reviewers**, prevention of self-approval where supported, and restricted deployment refs/tags. Release tags must be protected against non-reviewed creation or movement. Repository source cannot prove those external settings are active; an admin/API readback and a deliberately unauthorized-dispatch denial test are required before any live promotion.
