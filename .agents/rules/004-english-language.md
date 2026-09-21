---
enforced_by: [english-policy]
id: DF-RULE-004
title: English language consistency
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit]
---
# Rule 4 — English language consistency

## Requirement

All code, identifiers, comments, docstrings, commit messages, issues, and documentation MUST be
written in English.

## Rationale

A single written language keeps every artifact reviewable by the same audience and keeps generated
sites, logs, and issue threads internally consistent.

## Enforcement

Unenforced. No automated gate scans natural-language content today; review is the backstop.

## Exceptions

Quoted verbatim user input and content whose meaning depends on another language (for example
localization fixtures).

## Change control

Tracking owned by `system-audit`; do not claim total mechanical enforcement until a gate exists.