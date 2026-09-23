---
id: DF-RULE-007
title: Branches and pull requests
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [git, github]
---
# Rule 7 — Branch and pull request workflow

## Requirement

All product changes MUST reach the protected canonical branch through a reviewed delivery branch and GitHub pull request. Direct mutation of canonical is prohibited. A bootstrap/emergency exception may change who authors the delivery branch when df itself is unavailable, but it never bypasses the PR, checks, review or merge gate.

- Branch names are lowercase, descriptive and do not depend on issue numbers.
- The repository's actual canonical/default branch is resolved dynamically; `main` is never assumed.
- Automation-authored PRs use the canonical DarkFactory GitHub App/bot identity so the human maintainer can independently review them.
- PRs remain draft while implementation/review is active and become merge-ready only through the governed gate.
- Required checks and current-base requirements must pass before merge.
- Branch protection remains enabled with the final detected/generated check contract.
- Rewrites/pushes use deterministic git owners and lease-safe expected-old-SHA semantics; blind force push is forbidden.

## Rationale

Topic branches preserve review traceability while dynamic base resolution and lease safety prevent
automation from overwriting repository history.

## Enforcement

The final git/GitHub/hook capabilities and repository protection settings enforce this contract.

## Exceptions

When the governed df delivery path itself is unavailable or is the component under repair, an
owner-authorized bootstrap/completion Request may permit a coordinator to author directly on one
dedicated PR branch. This never permits direct canonical mutation, skipping required checks/review,
or self-merging. The exception ends as soon as the governed path can represent and execute the work.

## Change control

Concrete workflow/script owners may change while production ownership converges; this rule names
behavior, not implementation file paths.
