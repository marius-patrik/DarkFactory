# ADR-0020 — Browser auth and machine keychain are separate trust boundaries

**Status**: Accepted

## Decision

`@darkfactory/keychain` owns machine credentials, provider accounts, token refresh, secure storage and GitHub App machine identity.

`@darkfactory/auth` owns human/browser GitHub authentication and session management.

Browser-safe packages cannot import machine-secret/private-key implementations.

Credential/account updates are transactionally serialized. Multi-file logical credential state cannot expose mixed generations after interruption. Replicated vault state converges deterministically, represents deletion explicitly until safe compaction, and does not resolve equal-version conflicts by caller-local preference. Browser-session refresh/revoke also uses atomic state transitions so rotating refresh tokens cannot race a concurrent revocation.

## Consequences

Human authorization and machine automation authority remain distinct. Secret-bearing machine state never enters static/browser artifacts, and concurrent/replicated credential operations converge without resurrecting stale secrets.
