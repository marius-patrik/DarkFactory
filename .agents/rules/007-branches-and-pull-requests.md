---
id: DF-RULE-007
title: Branches and pull requests
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [harness-auth]
---
# Rule 7 — Branch and pull request workflow

## Requirement

All normal product changes MUST use dedicated delivery branches and GitHub pull requests. Direct mutation of the protected canonical branch is prohibited outside an explicitly authorized bootstrap/emergency operation recorded by the completion plan.

- Branch names are lowercase, descriptive and do not depend on issue numbers.
- The repository's actual canonical/default branch is resolved dynamically; `main` is never assumed.
- Automation-authored PRs use the canonical DarkFactory GitHub App/bot identity so the human maintainer can independently review them.
- PRs remain draft while implementation/review is active and become merge-ready only through the governed gate.
- Required checks and current-base requirements must pass before merge.
- Branch protection remains enabled with the final detected/generated check contract.
- Rewrites/pushes use deterministic git owners and lease-safe expected-old-SHA semantics; blind force push is forbidden.

## Rationale

Topic branches preserve review traceability while dynamic base resolution and lease safety prevent automation from overwriting repository history.

## Enforcement

The final git/GitHub/hook capabilities and repository protection settings enforce this contract.

## Exceptions

The temporary bootstrap-authoring exception in `PLAN.md` changes who may author a repair, not the required PR/check/review/merge evidence.

## Change control

Concrete workflow/script owners may change while production ownership converges; this rule names behavior, not implementation file paths.
