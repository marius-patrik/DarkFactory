# Developing capabilities

**Authoritative ABI:** `packages/capability/src/abi.ts` and its exports; plugin declarations reside under `.darkfactory/plugins/`. Do not create a second capability schema in documentation.

## Development sequence

1. Identify ecosystem, package and work domain. Do not confuse a domain such as `paper` with a build ecosystem such as Typst.
2. Define a versioned capability with validated identity, detectors, commands, graph contributions, hooks, quality actions and documentation surfaces when needed.
3. Resolve verification actions through `@darkfactory/capability` rather than constructing another command table in the harness.
4. Generate supported host forms from the single canonical definition. Do not hand-maintain distinct behavior for native Pi, MCP, or agent skill integrations.
5. Test manifest validation, detector selection, action support, sandbox boundaries, host adapter output and a real consumer package. A claimed action that does nothing must fail acceptance.

The configured TypeDoc API route (when extraction is enabled) reflects configured TypeDoc entry points when present; capability summaries are included in the content graph when discoverable.

## Security

Capabilities declare needed secrets but do not own raw credential custody. Host adapters must not broaden permissions beyond approved capability contracts. Filesystem and network effects must be examined under runtime policy.

**Status:** comprehensive executable ABI/generator acceptance is owned by #2701; supported target adapters must be verified from actual generated artifacts.

## Source-backed ABI inspection and acceptance

The active ABI version is declared by `CAPABILITY_ABI_VERSION` in `packages/capability/src/abi.ts`; capability definitions include runtime context, tool input JSON Schema, task-kind restrictions, credential requirements, commands, detectors, graph contributions, deterministic verification actions and hooks. Do not derive semver compatibility from the ABI version string alone.

An author should locate a canonical capability manifest under `.darkfactory/plugins/`, examine its actual loader/parser support, and run the source-advertised `df plugin list`, `df plugin describe` or `df plugin validate` only with the intended release installed. Before calling the plugin active, verify the resolver selects it on a real package, its declared command runs with scoped credentials, a disallowed secret/filesystem capability is denied, its quality action actually executes and its generated host adapter preserves the same declared input/output. An empty manifest or a command-only stub is not an accepted implementation.

The generated runtime/capability declarations index is a source AST inventory, **not** a full manifest schema or proven plugin ABI. #2701 owns adapter generation, isolation and external host verification; untested host variants are unsupported rather than automatically compatible.
