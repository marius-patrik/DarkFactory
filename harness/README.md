# df agent harness

`df` is a Bun CLI around pi's coding-agent SDK. It provides durable multi-turn sessions,
pi's `read`, `write`, `edit`, and `bash` tools, deterministic tool policy, live model
catalogs, and ordered account/provider failover.

Providers are interpreted from `assets/providers.defaults.json`, then replaced by
same-id entries in `$DF_HOME/providers.json`. The default route starts with
`google/gemini-3.8-flash@default`, tries two other free Gemini models on the same
key, then crosses to configured free/fast providers. Antigravity is declared but
disabled by default.

Credentials live only in `$DF_HOME/credentials.json` (default `~/.df/credentials.json`).
Each account is `<provider>:<label>` with typed `oauth`, `api_key`, `header`, `cookie`,
or provider-specific `other` slots. Pi receives a rebindable one-account
`CredentialStore`; it is explicitly pointed at `$DF_HOME/pi-agent` and never uses pi's
`auth.json`. OAuth logins are df-owned, isolated by account label, and marked machine-local;
borrowed CLI credentials remain an explicit reimport-first fallback. Sessions are JSONL under `$DF_HOME/sessions`, quota cooldowns are in
`$DF_HOME/quota.json`, and model catalogs are in `$DF_HOME/models`.
Credential and quota updates use atomic replacement plus cross-process lockfiles; stale
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
df chat
df chat --resume <session-id> --chain ...
df run --json --max-turns 50 "Fix the failing test"
df run --reasoning hard "Prove the invariant"
df run --chain ... --prompt-file task.md
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

Configure routing in `$DF_HOME/config.json`; relative key paths resolve from
`$DF_HOME`:

```json
{
  "defaultChain": "google/gemini-3.8-flash@default",
  "hardReasoningChain": "anthropic/claude-opus@work,google/gemini-3.8-flash@default",
  "sensitiveChain": "local/private@default,anthropic/claude-safe@work",
  "credentialFiles": { "google:default": "secrets/gemini_api_key" },
  "cooldownTtlMs": 900000
}
```

Credential precedence is a saved account slot, then (only for the `default` account)
the provider entry's environment variables, then that account's `credentialFiles` path.
Undated cooldowns expire after `cooldownTtlMs` (15 minutes by default). Save the key from
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
