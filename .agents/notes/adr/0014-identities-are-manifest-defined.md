# ADR-0014 — Identities are manifest-defined

**Status**: Accepted · 2026-09-15

## Context

Commits, trailers and notes written by the pipeline carry the identity of the bot and of the models that contributed.
From the decision record of 2026-09-13 (prompts/_decisions.md, orchestrator workspace):

> "Identities MUST be manifest-defined (Patrik reiterated 2026-09-13): every provider identity (name, email/trailer, note text, account link) lives in the DarkFactory manifest; no hard-coded identities in code."

On 2026-09-14 the owner also approved the attribution shape: commits use the bot's user-id email, each contributing
verified provider gets a `Co-authored-by` trailer, and a footer note lists the models.

## Decision

- Every identity lives in the manifest's `identities` block and code reads it from there: the bot author and, for each
  provider, its name, email or trailer, note text and account link.
- Pipeline commits are authored by the bot with its user-id email.
- Verified providers that contributed get a canonical `Co-authored-by` trailer. Unverified providers get note-only
  attribution. A footer note lists the models used.

## Alternatives rejected

- **Identities hard-coded in code.** Renaming a provider, changing an email or adding a provider would need a code
  change and a release, and a repository adopting the pipeline could not declare its own identities.
- **A `Co-authored-by` trailer for every provider.** A trailer for an identity that is not verified credits an account
  nobody has confirmed, so unverified providers are named in the note only.

## Consequences

- Adding a provider identity is a manifest change.
- Tests and tooling that need an identity read it from the manifest rather than from constants.
