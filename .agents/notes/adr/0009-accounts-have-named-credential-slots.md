# ADR-0009 — Many accounts per provider with named credential slots

**Status**: Accepted · 2026-09-15

## Context

From the decision record of 2026-09-13 (prompts/_decisions.md, orchestrator workspace):

> "Credentials (Patrik, 2026-09-13): df supports MANY accounts per provider, and an account may need SEVERAL credentials (e.g. OAuth token + refresh + project id header, API key + org id, cookie + bearer). Model: provider → accounts[] → credential set (named slots). pi-ai's one-credential-per-provider CredentialStore is only an adapter view of one selected account." — 2026-09-13

## Decision
Support multiple accounts per provider, each with named credential slots, allowing flexible credential management.

## Alternatives rejected
- Single account per provider with a single credential slot.
- Anonymous credential handling – loses ability to address per‑account quota and permissions.

## Consequences
- The credential model is provider → accounts[] → credential set (named slots).
- pi‑ai's one‑credential‑per‑provider CredentialStore is only an adapter view of a selected account.
