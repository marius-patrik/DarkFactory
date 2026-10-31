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

## Practical consumer configuration procedure

1. Inspect the consumer repository's current single config path and avoid changing unrelated files. Confirm exactly one source is discovered, not a root and `DF_CONFIG_DIR` duplicate.
2. Confirm the consumer's own stable identity/default branch, protection lane, App installation, allowed provider scopes and supported ecosystems. The producer's [configuration](../../../repo.dfconfig) is an example of **producer policy**, not a safe consumer template.
3. Keep `docs.home` pointing to an existing repository-relative Markdown page, and choose nonsecret `docs.site.name`. When TypeDoc is enabled, use actual exported entry points and a repository-local tsconfig.
4. Run `bun run docs` in a source checkout, observe a strict zero-error result, then execute the owning native config/quality validators. A docs pass validates the docs projection, **not** the entire runtime policy.

### Current parser guarantees and known gaps

The docs parser requires `version:1`, an object `site` with nonblank `name`, and nonblank `home`; optional TypeScript API configuration requires a nonblank `tsconfig` and nonempty entry-point strings. Malformed JSON or a wrong docs block must fail. The combined configuration is read through `packages/protocol/src/config-document.ts` and `packages/docs/src/config.ts`. The generated configuration index lists **types of values actually present**, not allowed ranges/enums for every policy field. Full consumer schema and cross-field validation requires #2696/#2701 acceptance; do not treat the key index as a schema.
