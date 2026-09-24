# ADR-0020 — Browser auth and machine keychain are separate trust boundaries

**Status**: Accepted

## Decision

`@darkfactory/keychain` owns machine credentials, provider accounts, token refresh, secure storage and GitHub App machine identity.

`@darkfactory/auth` owns human/browser GitHub authentication and session management.

Browser-safe packages cannot import machine-secret/private-key implementations.

## Consequences

Human authorization and machine automation authority remain distinct. Secret-bearing machine state never enters static/browser artifacts.
