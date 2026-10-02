---
name: 011-review-approval-and-governed-merge
description: Use when deciding whether a pull request may merge: require valid current base and stack, green required checks, clean implementation review, final Planning alignment, any required scope amendment and official final authorization from an authorized actor, then reconcile bound Requests, PR state and safe branch cleanup after merge.
id: DF-RULE-011
title: Pull request review approval and governed merge
status: normative
applies_to: [agents, automation]
activation: always
owners: [review, github]
license: MIT
---

# Rule 11 — Pull request review approval and governed merge

## Requirement

Pull requests require the final repository protection/review contract before merge.

Native GitHub review approval and the canonical authorized DarkFactory approval command grammar are both valid only when the current actor is authorized. Free-text that merely resembles approval cannot advance a gate.

Merge readiness requires:

- current-base/stack validity;
- required checks green;
- implementation review/fix clean;
- final Planning alignment;
- any required scope-amendment approval;
- official final review/merge authorization.

After merge, df deterministically reconciles bound Requests/PRs/project state and safe branch cleanup.

## Rationale

Review state and merge authority must be based on GitHub/df evidence, not model prose or workflow-specific shortcuts.

## Enforcement

GitHub/graph/Request capabilities and branch protection own this behavior.

## Exceptions

None.

## Change control

The final command registry and GitHub App identity may evolve without changing these authorization invariants.
