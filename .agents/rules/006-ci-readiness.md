---
id: DF-RULE-006
title: CI readiness
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit]
---
# Rule 6 — CI readiness and verification

## Requirement

Every push MUST leave green status on GitHub Actions across every job in `ci.yml`. A red build is a
stop-the-line event: no further feature work proceeds until it is green. The set of required status
checks is declared by repository settings (`.github/scripts/repo_settings.py` against the manifest)
and enforced by branch protection.

## Rationale

CI is the single authoritative execution environment. Green status on the declared required checks
is what makes a merge safe; anything red invalidates the working tree as a review baseline.

## Enforcement

- `.github/workflows/ci.yml` required status checks, wired into branch protection by
  `repo_settings.py`.
- Hooks run before review continues; a red required check blocks merging branch protection.

## Exceptions

None.

## Change control

The job set and required checks are configured, not invented per session; owned with `system-audit`.