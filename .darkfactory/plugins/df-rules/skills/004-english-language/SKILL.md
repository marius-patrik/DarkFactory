---
name: 004-english-language
description: Use when a change to DarkFactory must satisfy DF-RULE-004, English language consistency.
id: DF-RULE-004
title: English language consistency
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [hooks]
license: MIT
---

# Rule 4 — English language consistency

## Requirement

All code, identifiers, comments, docstrings, commit messages, issues, and documentation MUST be
written in English.

## Rationale

A single written language keeps every artifact reviewable by the same audience and keeps generated
sites, logs, and issue threads internally consistent.

## Enforcement

The `hooks` capability registers three checks - `tests-touched`, `conventional-commit` and
`branch-name` - and none of them inspects language. No CI step does either, so the machine-checkable
half of this rule is currently unenforced. Human and agent review is the only enforcement that exists.

## Exceptions

Quoted verbatim user input and content whose meaning depends on another language (for example
localization fixtures).

## Change control

Machine-checkable enforcement is owned by hooks/CI; prose-language consistency remains a review invariant.