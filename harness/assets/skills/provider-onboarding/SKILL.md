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

To add a provider that isn't built into df, create a minimal entry in your user provider override file (the file read by the provider registry, named `providers.json` under `$DF_HOME`). The entry must include:

- `id` (the provider identifier)
- `dialect` (one of: `openai-completions`, `openai-responses`, `openai-codex-responses`, `anthropic-messages`, `google-generative-ai`, `cloudcode-agent`)
- `baseUrl` (the API endpoint)
- `auth` (array of auth configs for API key or OAuth)
- `models` (static list or dynamic catalog)

The user `providers.json` file is merged on top of built-in providers and is where you place overrides or new definitions.

You may also define a `free` tier block to describe free access:

```json
{
  "kind": "permanent",
  "keyUrl": "https://example.com/apikey",
  "card": false,
  "verification": "Email verification required",
  "credits": "Unlimited"
}
```

Fields in the `free` object:
- `kind`: `permanent`, `renewable-credits`, `trial-credits`, or `anonymous`
- `keyUrl`: URL to obtain access (required)
- `signupUrl`: URL to sign up (optional)
- `card`: whether card payment is required
- `verification`: description of verification needed
- `credits`: description of credits provided

## Data policy

The current schema does not define explicit data-handling fields. Sensitive work routing is configured per provider in the routing design (`plans/provider-derived-routing.md`). Planned fields include:

- `dataPolicy` - defines whether input/output is used for model training or telemetry
- `sensitive` - flags provider as handling sensitive or regulated content

Until these are implemented, df treats all provider inputs as private and never logs or transmits credential values.

## Security notes

Never paste a key into a command argument, file, issue, or log. df never borrows logins from other tools. Credentials are stored encrypted on disk or in GitHub Actions secrets and are only passed via standard input or environment variables.

## Checking

```sh
df doctor identities    # verify all providers have identity entries
df quota --json         # show state, limits, and usage for all providers
```
