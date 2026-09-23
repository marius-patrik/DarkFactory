---
name: provider-onboarding
description: Add or configure a DarkFactory provider/account through the canonical config, keychain, catalog, quota, and routing contracts.
---

# Provider onboarding

Providers are configuration/data plus shared runtime mechanisms, not provider-specific orchestration subsystems.

## Add an account

Use the provider-declared login/credential-slot flow:

```sh
df login <provider> --account <label>
df account set <provider>:<label> <slot> --type <type>
df models --provider <provider> --refresh
df quota --json
```

Never place secret values in `config.df`, source, command arguments, issues or logs. Machine credentials belong to `@darkfactory/keychain`.

## Add or change a provider

Provider/runtime configuration belongs to the current `config.df` contract and first-party/installed capability data. Do not create a second `providers.json`, hard-coded provider registry or provider-specific harness.

A provider declaration supplies the data required by the shared runtime, such as:

- stable provider identity and API dialect/endpoint;
- authentication flow and named credential slots;
- model discovery/static fallback data;
- capabilities required for routing;
- declared/observed quota and error mapping;
- data-collection/sensitivity policy;
- optional routing eligibility/defaults.

The live model catalog is authoritative for current usable models; hand-maintained model inventories are not.

## Routing and quota

Provider eligibility is evaluated before model strength. Routing uses task requirements, sensitivity/data policy, live catalog/account state, atomic quota/capacity admission and configured capability tiers.

Unknown quota/data-policy state remains explicit and fails closed where the policy requires known eligibility.

## Verify

Run the canonical diagnostics and package/capability tests. Provider changes are complete only when config parsing, credential boundaries, catalog refresh, quota mapping and routing invariants are covered without network-dependent tests.
