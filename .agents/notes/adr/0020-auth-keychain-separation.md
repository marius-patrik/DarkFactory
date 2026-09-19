# ADR-0020 — Separate human web authentication from machine credential custody

**Status**: Accepted  
**Date**: 2026-09-19  
**Resolves**: Credential/auth ownership across browser, harness and automation

## Context

DarkFactory handles many credential forms: provider API keys, OAuth refresh/access tokens, multiple provider accounts, imported CLI credentials, GitHub App private keys and installation tokens, local user credentials and browser GitHub sessions.

Combining all of these behind one browser-visible auth package would weaken security boundaries, while leaving credential handling scattered across providers and capabilities causes duplicated refresh/storage/redaction behavior.

## Decision

Two first-class packages own all authentication concerns:

### `@darkfactory/keychain`

The sole machine/harness credential-custody and authentication subsystem. It owns secure storage, encrypted fallback, environment/import sources, provider login/OAuth/device flows, multi-account slots, refresh/rotation, borrowed credentials, GitHub App private-key/JWT/installation-token flows, CLI-side user credentials, redaction, secret scanning, diagnostics and scoped credential access.

Capabilities and other packages declare credential requirements and request scoped handles. They do not read raw environment variables, credential files or OS keychains directly.

### `@darkfactory/auth`

The human/browser session layer used by DarkFactory Web. It owns GitHub App user login, PKCE/state, token exchange/refresh broker integration, session restoration and logout/revocation. It cannot import keychain/private-key machinery into browser artifacts.

The same GitHub identity ecosystem may be used in both environments, but custody models remain distinct.

## Rejected alternatives

### One universal auth package

Rejected because browser code and machine secret custody have fundamentally different trust boundaries.

### Provider-owned credential storage

Rejected because every provider would reimplement storage, refresh, multi-account behavior and redaction.

### Give capabilities raw secrets by default

Rejected because it expands secret lifetime and makes third-party capabilities unnecessarily trusted.

## Consequences

- F14/#248 and existing credential/secrets/login code converge into keychain.
- Browser/auth tests must prove private-key/keychain code is unreachable from web bundles.
- The capability ABI includes credential requirements rather than storage APIs.
