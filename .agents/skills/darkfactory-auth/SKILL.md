---
name: darkfactory-auth
description: Configure DarkFactory provider accounts, machine credentials, GitHub authority, and repository secrets without exposing secret values.
---

# DarkFactory authentication

DarkFactory keeps machine/provider credentials behind `@darkfactory/keychain` and human/browser GitHub authentication behind `@darkfactory/auth`. Provider code, capabilities, web code, issues, logs and generated artifacts never become credential stores.

## Provider accounts

Accounts are provider-scoped named identities. Use the current df command registry/help for the exact provider-supported login flow:

```sh
df login <provider> --account <label>
df logout <provider> --account <label>
df account set <provider>:<label> <slot> --type <type>
df models --provider <provider> --refresh
```

Credential values enter through standard input, a supported secure import, or the provider's declared OAuth/device/PKCE flow. Do not place values in command arguments, source, config, issues or logs.

A supported borrowed/imported credential is explicitly marked as borrowed and DarkFactory never mutates the source tool/account store.

## CI and machine execution

The final agent entrypoint is `df`. CI/runtime credential requirements come from provider/capability declarations and the keychain contract; there is no Python runner secret map or second credential registry.

Repository/GitHub credentials are scoped to the operation and identity that needs them. Human GitHub authority and GitHub App installation authority remain separate.

## Repository secrets

Repository secret synchronization is performed through the final keychain/GitHub capability boundary. Inspect names and planned mutations without printing values, then apply only the intended subset. Secret-bearing recovery state remains local and blocked from publication until safe.

## Verify

Use canonical operator surfaces rather than probing providers manually:

```sh
df doctor
df status
df models --provider <provider> --refresh
df quota --json
```

If an account is unavailable, fix the declared credential/account state; do not bypass df by copying tokens into another tool or workflow.
