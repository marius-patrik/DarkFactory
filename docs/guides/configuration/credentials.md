# Credentials, models and quota

**Trust boundary:** the machine/runtime keychain and the authenticated Web user's browser session are separate owners. See [security](../security/boundaries.md) and ADR-0020.

The source CLI advertises `df login`, `df logout`, `df account set`, `df account import`, `df accounts`, `df models`, `df providers`, `df quota`, `df limits` and `df secrets`; consult the [generated command index](../../../packages/cli/src/cli.ts) for current syntax.

Provide provider keys through a supported secret store or explicit CLI secret-ingest mechanism. Do not put them in `repo.dfconfig`, commit them, expose them in static browser configuration or encode them in an artifact manifest.

Model routing must honor declared task kind, capability tier, sensitivity, availability and quota reservation. A provider rejection, missing credential, quota exhaustion and cancellation are distinct statuses. Quota recovery must not replay completed GitHub effects.

**Acceptance caveat:** exact provider capabilities and account import behavior vary with installed release and configured runtime; end-to-end authentication, quota and failover are gated by #2700.
