---
id: DF-RULE-012
title: Request capture and confirmation
status: normative
applies_to: [agents, automation]
activation: always
owners: [merge-gates]
---
# Rule 12 — User request decomposition, verbatim prompting, and confirmation gate

## Requirement

Every incoming user prompt or task MUST immediately be converted into one or more tracked GitHub
issues labeled `Request` before any planning, branching, or code changes begin.

- **Issue Template**: Use `.github/ISSUE_TEMPLATE/request.yml` for structured request filing.
- **Decomposition**: A single user message containing multiple distinct tasks MUST be decomposed
  into multiple focused `Request` issues.
- **Verbatim Wording**: Each `Request` issue body MUST contain the exact, verbatim wording of the
  user request.
- **Interpretation Section**: Below the verbatim wording, each `Request` issue MUST include an
  `### Interpretation` section specifying how the request is understood, the architectural scope,
  and the proposed verification.
- **Confirmation Gate**: The interpretation requires explicit user confirmation (commenting
  `approve`) before any implementation plan is made.
- **Two gates, one issue**: Once the interpretation is approved, the plan is posted as a comment on
  the same issue and approved there. All subsequent branches and pull requests bind to that issue.

## Rationale

Verbatim capture stops the agent from rewriting intent at ingestion; the confirmation gate stops it
from planning against a misreading.

## Enforcement

- `.github/ISSUE_TEMPLATE/request.yml` encodes the verbatim-wording requirement for issue filing.
- `tests/test_pipeline_config.py` checks the template demands the unedited request and the
  `### Interpretation` section.

## Exceptions

None.

## Change control

Wording converges with `merge-gates`; the single-gate flow, when approved, supersedes the gate
naming here without splitting the issue.