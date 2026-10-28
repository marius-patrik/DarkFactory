# Combined configuration

**Executable declaration:** [repo.dfconfig](../../../repo.dfconfig). **Normative rule:** [README](../../../README.md) §7. These are not alternate configuration authorities.

## Discovery and aliases

Use exactly one JSON document: root `repo.dfconfig` or accepted root `config.dfconfig` or `.dfconfig`. If none exists at root, the corresponding candidate under `DF_CONFIG_DIR` (default `.darkfactory`) is considered. Multiple candidates in one scope, or candidates in both root and alternate scope, fail closed; values are never merged across files.

## Blocks

- `repo`: repository identity/policy, default branch, installation scope, protection, versioning and quality declarations.
- `docs`: documentation site metadata and optional TypeScript reference extraction configuration.
- `providers`: provider/routing settings.
- `plugins`: optional plugin declarations where supported by a consumer.

Do not copy DarkFactory's owner, app ID, installation ID or fleet selections into a different repository unchanged.

## Example: minimal docs block

```json
{"docs":{"version":1,"site":{"name":"Example Repository"},"home":"README.md"}}
```

This is a fragment illustrating the `docs` block, not a stand-alone complete consumer configuration. The site builder validates the block with `parseDocsConfig`, not this prose.

## Validation

Use the strict docs build to check the docs block. The [generated configuration field index](../../../repo.dfconfig) enumerates present property paths/types without printing credential values. Policies beyond docs are validated by their owning runtime/schema.
