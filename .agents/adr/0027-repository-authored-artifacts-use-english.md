# ADR-0027 — Repository-authored artifacts use English

**Status**: Accepted

**Related rules**: `DF-RULE-004`

## Decision

Repository-authored code, identifiers, comments, docstrings, commit messages, issues, pull-request text and documentation use English as the common written language.

Quoted verbatim user input and fixtures/content whose meaning depends on another language are explicit exceptions.

Machine enforcement is limited to surfaces that can be checked deterministically. Natural-language prose remains a review invariant rather than being protected by a brittle heuristic language detector.

## Consequences

Human and agent contributors share one review language across source, GitHub and generated documentation without pretending that unreliable natural-language classification is a correctness gate.
