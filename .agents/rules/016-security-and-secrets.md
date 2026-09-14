---
id: DF-RULE-016
title: Security and secrets
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [harness-auth]
---
# Rule 16 — Security and secrets

## Requirement

No credential, token, refresh token, cookie, or private key is ever committed, echoed into workflow
logs, or written into issue or PR bodies. All secrets live in GitHub repository secrets or the local
OS keychain. Workflow logs must be assumed public. Credentials exist only in DarkFactory's own
environment and are never propagated to consumer repositories; consumers authenticate through their
own secrets. No secret value is ever named in a rule or a rule reference.

## Rationale

Mistakenly captured credentials are permanent: logs and issues outlive rotations. Keeping the
system's own credentials private to DarkFactory keeps the fleet secure by construction.

## Enforcement

- Secret-backed workflows and repository settings; credential-focused tests in the test suite.
- No repository-wide secret scanning gate exists today — any claims of one must not be made.

## Exceptions

None.

## Change control

Owned by `harness-auth`: provider identities, vault access, and secret flows. Rules never list
credential variable names; the manifest declares identities.