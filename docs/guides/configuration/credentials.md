# Credentials, models and quota

**Trust boundary:** the machine/runtime keychain and the authenticated Web user's browser session are separate owners. See [security](../security/boundaries.md) and ADR-0020.

The source CLI advertises `df login`, `df logout`, `df account set`, `df account import`, `df accounts`, `df models`, `df providers`, `df quota`, `df limits` and `df secrets`; consult the [generated command index](../../../packages/cli/src/cli.ts) for current syntax.

Provide provider keys through a supported secret store or explicit CLI secret-ingest mechanism. Do not put them in `repo.dfconfig`, commit them, expose them in static browser configuration or encode them in an artifact manifest.

Model routing must honor declared task kind, capability tier, sensitivity, availability and quota reservation. A provider rejection, missing credential, quota exhaustion and cancellation are distinct statuses. Quota recovery must not replay completed GitHub effects.

**Acceptance caveat:** exact provider capabilities and account import behavior vary with installed release and configured runtime; end-to-end authentication, quota and failover are gated by #2700.

## Nonsecret diagnostics procedure

For a developer checkout with an authorized local machine session, `df providers` lists the configured provider catalog, `df accounts` lists account identifiers and slots, `df models --provider <provider>` queries that provider's catalog, and `df quota --json` reports observed provider/account/model state. Model listing may use cached results; source logs distinguish live-refresh failure from cache. A missing credential must be reported explicitly, not treated as a working route.

The CLI source declares `df account set <account-id> <slot> --type <type>` (value from stdin or vault), `df account import <source> --account <label>` and `df login <provider> --account <label>`. These are **machine-scoped** operations; they do not grant a browser user any GitHub scope. Never include literal secrets in shell history, process arguments, guide examples, test artifacts, browser configuration or `repo.dfconfig`. Verify a credential by a suitably scoped provider request and check redacted failure output, not by printing a stored token.

## Routing, failures and quota boundaries

A successful route requires a usable account/model, supported task kind, sufficient capability and quota reservation. The user must distinguish missing credentials, provider rejection, timeouts, quota exhaustion, partial stream and cancellation. Inspect `df limits --json` and `df quota --json` as observations rather than guarantees of provider billing accuracy. `df resume` addresses only quota-blocked runs eligible after reset; it must preserve prior external effects. #2700 must attach real provider, failover, secret-leak and restart evidence before any of these procedures are called production-ready.
