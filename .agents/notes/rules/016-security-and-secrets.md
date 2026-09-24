---
id: DF-RULE-016
title: Security and secrets
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [keychain, auth]
---
# Rule 16 — Security and secrets

## Requirement

No credential, access token, refresh token, cookie, client secret or private key may be committed, logged, written to issues/PRs, included in generated docs or embedded in static web assets.

`@darkfactory/keychain` is the sole machine/runtime credential-custody owner. Other packages/capabilities declare credential requirements and receive scoped access; they do not read raw credential files, secret environment variables or OS keychains directly.

`@darkfactory/auth` separately owns human/browser GitHub App authentication and sessions. Browser bundles cannot import keychain/private-key/server-confidential code.

The web auth broker may hold only credentials required for confidential user-token exchange/refresh and is not a DarkFactory state/execution backend.

GitHub user authority and GitHub App installation authority remain distinct.

Secret-bearing recovery material remains preserved locally and blocked from publication rather than leaked or discarded.

## Rationale

Centralized custody and explicit browser/machine trust boundaries minimize secret lifetime and prevent capability/plugin code from silently widening access.

## Enforcement

Keychain/auth import-boundary, redaction, secret-scan and credential-flow tests; workflow/browser artifact audits.

## Exceptions

None.

## Change control

Credential names/values are never copied into rule text. Provider-specific flows belong to keychain/provider capability contracts.
