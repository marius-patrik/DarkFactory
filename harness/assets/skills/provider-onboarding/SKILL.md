---
name: provider-onboarding
description: Adding a model provider or a new account key to df.
---

# Provider onboarding

This guide helps agents and operators add model providers or account keys to df.

## Adding a key for a configured provider

df accounts are `<provider>:<label>` (for example `google:default`, `google:work`). To add an API key for an existing provider:

```sh
df account set google:work api_key --type api_key
```

The key value is read from standard input; pipe it from a secure source:

```sh
printf '%s' "$KEY" | df account set google:work api_key --type api_key
```

Validate the credential by refreshing the model catalog and checking quotas:

```sh
df models --provider google --refresh
df quota --json --provider google
```

## Adding a provider

To add a provider that isn't built into df, add an entry to `providers.json` in the df home directory (`$DF_HOME`, default `~/.df`); it is merged over the built-in providers. Required fields:

- `id` - the provider identifier used in accounts and chains (`<provider>:<label>`, `<provider>/<model>@<label>`)
- `name` - display name
- `dialect` - one of `openai-completions`, `openai-responses`, `openai-codex-responses`, `anthropic-messages`, `google-generative-ai`, `cloudcode-agent`
- `baseUrl` - the API endpoint
- `auth` - how credentials are sent (API key placement or OAuth) and which named slots an account needs
- `models.static` - at least one declared model; `models.list` only overrides the dialect's default model-listing endpoint. `df models --provider <id> --usable` shows what df will actually route to from the live listing.
- `capabilities` - tools, reasoning, images

Optional: `limits` (declared rate limits and learned-limit rules), `free` (free-tier facts: `kind` is `permanent`, `renewable-credits`, `trial-credits` or `anonymous`, plus `keyUrl`, `card`, `verification`, `credits`), and `routing` (`enabled: false` removes the provider from automatic routing; `exclude` lists model id globs df must not route to).

## Data policy

Every provider declares what it does with request data: `free.data.collection` (or `data.collection`) is `none`, `logging`, `training` or `unknown`, with the source of that claim. df routes work only to providers whose collection is allowed for its sensitivity: the df config `router.dataCollection.normal` and `router.dataCollection.sensitive` list the allowed values (sensitive work defaults to `none` only), and a provider with no declaration counts as `unknown`. Check a provider with `df providers` (the data-collection column).

## Security notes

Never paste a key into a command argument, file, issue, or log. df never borrows logins from other tools. Account credentials live in df's credential store under the df home directory (file permissions restricted to the user) or in GitHub Actions secrets for the pipeline, and reach df only through standard input or environment variables.

## Checking

```sh
df doctor identities    # verify all providers have identity entries
df quota --json         # show state, limits, and usage for all providers
```
