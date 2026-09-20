# ADR-0017 — Modular packages and first-class capabilities

**Status**: Accepted

## Decision

DarkFactory is a root Bun workspace with stable first-party package boundaries:

- `@darkfactory/protocol`
- `@darkfactory/core`
- `@darkfactory/capability`
- `@darkfactory/github`
- `@darkfactory/keychain`
- `@darkfactory/auth`
- `@darkfactory/docs`
- `@darkfactory/cli`
- `@darkfactory/web`

Agentic/product behavior is implemented as versioned capabilities under root `capabilities/`. Core owns execution mechanisms; capabilities own behavior.

## Consequences

Package dependencies remain acyclic and browser-safe boundaries are explicit. Official and third-party capabilities use the same ABI/loader. No monolithic harness package is part of the public architecture.
