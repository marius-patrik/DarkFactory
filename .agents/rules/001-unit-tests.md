---
id: DF-RULE-001
title: Tests prove invariants
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [ci]
---
# Rule 1 — Tests prove invariants

## Requirement

Every behavior or contract change MUST be covered at the owning package/capability boundary by tests
that prove observable invariants, state transitions, failure behavior or integration contracts.

Tests MUST survive valid refactors. They must not normally assert exact implementation filenames,
source-code substrings, function/class names, workflow step labels, copied command text, or the
presence/absence of an internal file merely because the current implementation happens to use it.

Static architecture/governance tests are appropriate only for real static contracts. They MUST inspect
semantic structure where practical: parsed manifests/configuration/YAML, schemas, dependency/import
graphs, package exports, generated artifacts or public interfaces rather than brittle source grep.

Concurrency-sensitive behavior MUST be tested concurrently. Idempotency/crash-safety claims MUST
exercise duplicate invocation and the relevant crash window, not only call the same function twice
after a successful journal write. Atomicity claims MUST test interruption/failure between transaction
steps.

Each final first-party package/capability MUST own or be explicitly covered by one canonical detected
test action. Coverage that happens only because a legacy aggregate/harness test imports the package is
not sufficient. Duplicate/shadowed test definitions and copied test blocks are forbidden.

Applicable test actions come from the canonical repository/package detection plus
capability-resolution contract. All applicable suites MUST pass before a head is considered green.

## Rationale

Invariant-based tests preserve correctness while allowing aggressive refactoring and deletion. Tests
that freeze source text or repository shape make cleanup harder without proving product behavior.
Concurrency, idempotency and atomicity only become credible when the failure/race windows themselves
are exercised.

## Enforcement

The detected quality contract executes package/capability-owned tests. Architecture tests consume
parsed semantic inputs or resolved dependency graphs where possible. CI fails on duplicate/shadowed
test definitions and on detected packages without an applicable required test contract unless that
action is explicitly declared not applicable by canonical configuration.

## Exceptions

Exact-byte or exact-path assertions are allowed when the bytes/path are themselves a public protocol,
packaged artifact, security boundary, generated projection, or externally required interface. The
test must state that invariant rather than treating an implementation detail as policy.

Documentation-only changes and deterministic generated-file updates need no new behavioral test when
they change no behavior.

## Change control

The canonical detection/capability contract owns test-command selection. Package/capability tests own
behavioral truth; CI remains the authoritative execution environment.
