---
name: darkfactory-auth
description: Give DarkFactory's df agent the model accounts and repository secrets it needs. Use when an agent run is unauthenticated, a key was rotated, or a newly installed repository has no secrets yet.
---

# DarkFactory authentication

df owns every model login it uses. It never borrows a login from another tool, and a credential value is never
printed, logged, committed or written into an issue. Values go in on standard input or from an environment variable.

## Accounts on this machine

An account is `<provider>:<label>`; one provider can hold several accounts (for example `google:default`,
`google:key2`).

```sh
df accounts                                                    # list stored accounts
printf '%s' "$KEY" | df account set google:work api_key --type api_key   # API key from stdin
df login anthropic --account work                             # OAuth providers: browser login owned by df
df logout anthropic --account work
df models --provider google --refresh                          # confirm the key works: live model catalog
```

`df account set <account-id> <slot> --type <api_key|header|cookie|other>` reads the value from stdin (or
`--from-vault NAME`). Providers that need more than one slot (a project id next to an OAuth token) get one
`df account set` per slot.

## Moving an account into CI

```sh
df account export openai-codex:work          # prints a portable account record - treat it as a secret
df account load openai-codex:pipeline --from-env DF_ACCOUNT_OPENAI_CODEX
```

`df account set` and `df account load` are the only steps that move a credential into the pipeline container.
There is no second credential registry: no Python secret map and no script-side table of secret-to-account
bindings. The secret names the pipeline consumes are declared as workflow inputs in
`.github/workflows/agent.yml`, and each one names the `df` command that consumes it:

| Secret | Becomes | How |
|---|---|---|
| `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` | `google:default`, `google:key2`, `google:key3` | `df account set` |
| `OPENROUTER_API_KEY`, `OPENROUTER_API_KEY_2` | `openrouter:default`, `openrouter:acct2` | `df account set` |
| `GROQ_API_KEY` | `groq:default` | `df account set` |
| `DF_ACCOUNT_OPENAI_CODEX` | `openai-codex:pipeline` | `df account load` of an exported record |
| `DF_ACCOUNT_GROK_SUB` | `grok-sub:pipeline` | `df account load` of an exported record |

A workflow that does not forward one of these secrets does not fail - it silently runs without that account, so
check the list when a provider never appears in a run.

## Repository secrets

df keeps secrets in a local encrypted vault and pushes them to repositories:

```sh
df secrets init                                        # once per machine
printf '%s' "$VALUE" | df secrets set GEMINI_API_KEY --from-stdin
df secrets list                                        # names only
df secrets push owner/repo --dry-run                   # what would change
df secrets push owner/repo --only GEMINI_API_KEY
df secrets doctor
```

## Turning the agent on

The agent workflow runs only when the repository variable `AGENT_ENABLED` is `true` (or a caller passes
`agent-enabled: true`), and never for comments written by bots:

```yaml
if: (vars.AGENT_ENABLED == 'true' || inputs.agent-enabled == 'true') && !endsWith(github.event.comment.user.login, '[bot]')
```

## Checking

```sh
df doctor identities    # every provider in the default chain has an identity entry
df quota --json         # every provider, account and model: state, limits, usage and the source of each number
```

An account that is configured but never used shows up in `df quota --json` as unavailable or without usage; fix
the credential rather than probing the provider by hand.
