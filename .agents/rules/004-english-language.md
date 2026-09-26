---
id: DF-RULE-004
title: English language consistency
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [hooks]
---
# Rule 4 — English language consistency

## Requirement

All code, identifiers, comments, docstrings, commit messages, issues, and documentation MUST be
written in English.

## Rationale

A single written language keeps every artifact reviewable by the same audience and keeps generated
sites, logs, and issue threads internally consistent.

## Enforcement

Hooks/CI enforce machine-checkable language policy where deterministic (for example identifiers, generated metadata and commit conventions). Human/agent review remains the backstop for prose semantics; the repository does not claim a brittle natural-language scanner can prove every sentence is English.

## Exceptions

Quoted verbatim user input and content whose meaning depends on another language (for example
localization fixtures).

## Change control

Machine-checkable enforcement is owned by hooks/CI; prose-language consistency remains a review invariant.