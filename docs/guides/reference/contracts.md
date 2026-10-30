# Reference index

The generated [CLI command index](../../../packages/cli/src/cli.ts) comes from the current CLI `usage()`. The generated [configuration field index](../../../repo.dfconfig) emits key paths and JSON value types, never config values. When TypeDoc extraction is configured, the docs compiler emits API symbols from actual public entry points.

The content graph also carries workflow job names, repository detection evidence and capability manifest metadata derived from the current source tree. A reference may be absent if the required source or declaration was not discovered; absence is not proof of support.

## Workflow states and recovery

The canonical graph and persisted state contracts live in the runtime source under `packages/harness/src/graph/`; see [architecture](../architecture/system.md). #2698 must demonstrate exact schema/version/state transitions and restart behavior before a normative generated state reference is claimed complete.

## Errors

Treat failed source parsing, missing docs, unresolved links, missing web bundle, manifest digest mismatch, unsafe path, unknown CLI option, auth failure and missing required check as **errors**. Do not reinterpret a failed build as a deployment success.

## Troubleshooting paths

For install/version issues use [installation](../getting-started/installation.md). For Web trust failures see [security](../security/boundaries.md). For a lost run or ambiguous write use [recovery](../operator/recovery.md). For missing approved consumers use [fleet](../administration/fleet.md).
