# df agent harness

`df` is a Bun CLI around pi's coding-agent SDK. It provides durable multi-turn sessions,
pi's `read`, `write`, `edit`, and `bash` tools, deterministic tool policy, live model
catalogs, and ordered account/provider failover.

Providers are interpreted from `assets/providers.defaults.json` and `assets/providers.free.json`
(every researched free LLM API provider, with its free-tier kind, key page, and transport), then
replaced by same-id entries in `$DF_HOME/providers.json`. The default route starts with
`google/gemini-3.8-flash@default`, tries two other free Gemini models on the same
key, then crosses to configured free/fast providers. Antigravity is declared but
disabled by default.

Credentials live only in `$DF_HOME/credentials.json` (default `~/.df/credentials.json`).
Each account is `<provider>:<label>` with typed `oauth`, `api_key`, `header`, `cookie`,
or provider-specific `other` slots. Pi receives a rebindable one-account
`CredentialStore`; it is explicitly pointed at `$DF_HOME/pi-agent` and never uses pi's
`auth.json`. OAuth logins are df-owned, isolated by account label, and marked machine-local;
imports are one-time adoptions into df-owned accounts. Sessions are JSONL under `$DF_HOME/sessions`, the first-class limit ledger is
`$DF_HOME/limits.json`, and model catalogs are in `$DF_HOME/models`. Legacy `quota.json`
records migrate automatically. Credential and limit updates use atomic replacement plus cross-process lockfiles; stale
locks left by dead processes are recovered. Changing or successfully refreshing an
account clears that account's cooldowns.

## Develop

```powershell
$env:BUN_INSTALL_CACHE_DIR = "$PWD/.bun-cache"
C:/Users/patrik/.bun/bin/bun install
C:/Users/patrik/.bun/bin/bun run typecheck
C:/Users/patrik/.bun/bin/bun test
bun run build
```

All three pi packages are pinned to `0.85.1`.

## Use

```powershell
df providers
df models --provider google --refresh
df accounts
df limits
df limits --json
df limits clear google:default
df quota
df quota --json --provider groq
df chat
df chat --resume <session-id> --chain ...
df run --json --size large --max-turns 50 "Fix the failing test"
df run --reasoning hard "Prove the invariant"
df run --chain ... --prompt-file task.md
df route "Review this patch" --json
```

`df` with no arguments starts the readline chat; press Enter at the model prompt to
use policy routing, or enter a model/chain to override it. `--allow` and
`--deny` accept glob rules, optionally prefixed with `path:` or `command:`. Deny wins;
paths are workspace-confined by default, and headless mode never asks for approval.
Path checks resolve symlinks and, for new files, the nearest existing parent. Shell
inspection catches common absolute, parent, home, quoted `cd`, and `pushd` escapes, but
is intentionally best-effort: it is a policy guard, not a shell parser or OS sandbox.

Live model results use a six-hour TTL. Every direct discovery endpoint, method,
JSON-path mapping, pagination token, request body, and auth/header rule comes from
provider config. Set
`DF_OFFLINE=1` to use a cached catalog, or pi's built-in catalog when no cache exists.
Online failures may use an existing stale cache but never silently fall back to built-ins.

Configure routing in `$DF_HOME/config.df`; relative key paths resolve from
`$DF_HOME`:

```json
{
  "defaultChain": "google/gemini-3.8-flash@default",
  "hardReasoningChain": "anthropic/claude-opus@work,google/gemini-3.8-flash@default",
  "sensitiveChain": "local/private@default,anthropic/claude-safe@work",
  "credentialFiles": { "google:default": "secrets/gemini_api_key" },
  "cooldownTtlMs": 900000,
  "maxWaitMs": 300000
}
```

`router.policies` is an ordered rule list. A rule matches task `kind`, `size`, required
capabilities, and sensitivity, then prefers configured candidates, limit tiers, or a
per-kind quality score. Model metadata starts with the live/cached provider catalog and
provider declarations; `router.models` supplies per-model capability or quality
overrides. Candidate values are always `provider/model@account`:

```json
{
  "router": {
    "classifier": "cheap/classifier@default",
    "candidates": ["limited/reviewer@work", "capacity/coder@work"],
    "models": {
      "limited/reviewer": { "limitTier": "tight", "quality": { "review": 5 } },
      "capacity/coder": { "limitTier": "bulk", "tools": true, "contextWindow": 200000 }
    },
    "policies": [
      { "id": "small-review", "match": { "kind": ["review"], "size": ["small"] }, "prefer": { "tiers": ["tight", "standard", "bulk"], "quality": "review" } },
      { "id": "large-code", "match": { "kind": ["implement", "fix"], "size": ["large"], "needs": ["tools", "long_context"] }, "prefer": { "tiers": ["bulk", "standard"] } }
    ],
    "learning": { "enabled": true, "windowMs": 604800000, "maxPenalty": 20, "maxRecords": 1000 }
  }
}
```

The deterministic classifier uses prompt intent, attached context, graph-node hints,
and CLI flags (`--kind`, `--size`, repeatable `--need`, `--context-tokens`, and
`--sensitive`). The optional classifier candidate is invoked only through the router's
cheap-classification hook when heuristics are ambiguous. Explicit CLI and graph routes
keep their order; capacity checks still prevent impossible calls. Sensitive automatic
routing is restricted to `sensitiveChain`. Outcomes are stored in
`$DF_HOME/router-outcomes.jsonl`; recent per-kind failures add a capped, decaying
ranking penalty.

Credential precedence is a saved account slot, then (only for the `default` account)
the provider entry's environment variables, then that account's `credentialFiles` path.
Every limit entry has a numeric recovery time. Signals without one use `cooldownTtlMs`
(15 minutes by default). `df run` infers `small`, `medium`, or `large`; `--size` overrides
that estimate. Learned request/token remaining values, reserves, context windows, and
model tiers make routing preserve bulk capacity while keeping tight models useful. Save the key from
stdin and run the default model without a model flag:

```powershell
$env:GEMINI_API_KEY | df account set google:default api_key --type api_key
df run "Summarize this repository"
```

Provider entries declare API dialect, base URL, auth, credential/header slots,
model discovery/static models, quota rules, capabilities, and optional CLI importers.
A complete custom OpenAI-compatible provider is one entry in `$DF_HOME/providers.json`:

```json
{"version":1,"providers":[{"id":"acme","name":"Acme","dialect":"openai-completions","baseUrl":"https://api.acme.test/v1","auth":[{"kind":"api_key","slot":"api_key","placement":"bearer","env":["ACME_API_KEY"]}],"requiredCredentialSlots":["api_key"],"models":{"static":[{"id":"acme-free"}],"list":{"path":"/models","itemsPath":"data","idPath":"id","namePath":"name"}},"quota":{"rules":[{"kind":"rate_limited","statuses":[429]}]},"capabilities":{"tools":true,"reasoning":false,"images":false}}]}
```

## Quota engine

Before every model call the supervisor asks the quota engine whether the candidate may run now.
Each provider declares its limits per model or model glob in `limits.declared`: requests or tokens
per minute, hour, day, or month, rolling or fixed (daily windows follow `limits.dailyReset`),
optionally pooled across the models of one account. Every declared number records its `source`
(`docs`, `community`, or `observed`), a `sourceUrl`, and the `checkedAt` date. df counts every
request it sends in `$DF_HOME/usage.json` (shared safely across processes) and combines that with
limits learned from real responses in `limits.json`. A blocked candidate is admitted again only
once all of its blocking limits have cleared; it is waited for when that is within `maxWaitMs`,
otherwise skipped, and no request is sent to it. Usage and concurrency limits (credits, neurons)
are reported but not enforced. `DF_QUOTA=off` disables admission and keeps learned limits only.

`df quota --json` is the single status surface: every provider (including those without an
account, with the page to get a key), every account and model, its state (`available`, `waiting`,
`exhausted`, `unknown`, `no-account`), when it is usable again, and the source of each number. It
never sends a model request.

Adding a key for a free provider is one command; the key comes from stdin:

```powershell
$env:MISTRAL_API_KEY | df account set mistral:default api_key --type api_key
```

Cloudflare Workers AI needs the account id in its base URL: copy its entry into
`$DF_HOME/providers.json`, replace `ACCOUNT_ID`, and set `"enabled": true`.

Existing account commands remain available:

```powershell
df login google-antigravity --account personal
df account import antigravity --account personal
df account import claude --account work
df account import codex --account work
df account import grok --account personal
df account set anthropic:work api_key --type api_key  # value is read from stdin
df ask --chain google-antigravity/default-chat@personal "Hello"
```

On macOS/Linux, install `scripts/df-wrapper.sh` as the user-facing `df` and point
`DF_BIN` at the DarkFactory executable. Bare interactive `df` opens `df chat`;
DarkFactory subcommands go to `DF_BIN`; flags, paths, and non-interactive bare calls
go to the next system `df` on `PATH` (or `/bin/df`).

## Standalone test switch and packaging

`DF_FAUX=1` or hidden `--faux` registers `faux/echo` and forces offline catalog use;
it exists only for tests and smoke checks and performs no provider request:

```powershell
$env:DF_HOME = "$PWD/.smoke-home"
$env:DF_FAUX = "1"
./dist/df run --faux --json --chain faux/echo@test "smoke"       # macOS/Linux
./dist/df.exe run --faux --json --chain faux/echo@test "smoke"   # Windows
```

Ship these together, preserving the native subdirectory:

- `dist/df` on macOS/Linux, or `dist/df.exe` on Windows
- `dist/photon_rs_bg.wasm`
- any platform-native assets emitted alongside the binary for the selected target

The image resize worker is supplied as an additional Bun compile entrypoint and is
embedded in the executable. The config-driven OAuth implementation is used only when
the user explicitly runs `df login`.

After building, `./dist/df __packaging-smoke` loads the selected pi-tui native module
and executes the embedded image worker. It performs no provider request.
