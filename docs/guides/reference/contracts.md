# Reference index

The generated [CLI command index](../../../packages/cli/src/cli.ts) comes from the current CLI `usage()`. The generated [configuration field index](../../../repo.dfconfig) emits key paths and JSON value types, never config values. When TypeDoc extraction is configured, the docs compiler emits API symbols from actual public entry points.

The content graph also carries workflow job names, repository detection evidence and capability manifest metadata derived from the current source tree. A reference may be absent if the required source or declaration was not discovered; absence is not proof of support.

## Workflow states and recovery

The canonical graph and persisted state contracts live in the runtime source under `packages/harness/src/graph/`; see [architecture](../architecture/system.md). #2698 must demonstrate exact schema/version/state transitions and restart behavior before a normative generated state reference is claimed complete.

## Errors

Treat failed source parsing, missing docs, unresolved links, missing web bundle, manifest digest mismatch, unsafe path, unknown CLI option, auth failure and missing required check as **errors**. Do not reinterpret a failed build as a deployment success.

## Troubleshooting paths

For install/version issues use [installation](../getting-started/installation.md). For Web trust failures see [security](../security/boundaries.md). For a lost run or ambiguous write use [recovery](../operator/recovery.md). For missing approved consumers use [fleet](../administration/fleet.md).

## Generated-reference inventory and limits

The compiler currently generates four independent reference pages: `reference-cli` (literal CLI usage declaration), `reference-config` (observed producer JSON property paths and basic JSON types), `reference-typescript-exports` (syntactic first-party `src/index.ts` exports), and `reference-runtime-contracts` (exported declarations from the protocol, graph event/state, auth, GitHub and capability sources). A configured TypeDoc pass can also contribute typed API metadata to `content.json`; the current `repo.dfconfig` docs block **does not configure `api.typescript`**, so no semantic TypeDoc report can be claimed from this build. None of the four generated indexes substitutes for comprehensive API signatures, serialized event/schema guarantees or behavior tests.

For run-state and event fields, inspect `packages/protocol/src/workflow.ts` (including `GraphEvent`, `RunState`, node and edge types), `packages/harness/src/graph/events.ts` (translation rules), and `packages/harness/src/graph/run-state.ts` (state persistence). For Planning and review, inspect `packages/protocol/src/planning.ts` and `packages/protocol/src/review.ts`. For capabilities use `packages/capability/src/abi.ts`. For GitHub approval effects inspect `packages/github/src/approvals/`. These declarations identify shapes and responsibilities; #2698/#2699/#2701 must still prove authorized replay/approval behavior, and #2702 must prove native CLI JSON/error compatibility.
