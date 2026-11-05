---
name: agentic-plan
description: Create or revise a concise, evidence-based engineering implementation plan with exactly one Dependencies table and one TODO checklist. Use for technical architecture, implementation roadmaps, agent-executable plans, task sequencing, and recovery plans. Do not use to write a user-facing PRD or to begin implementation without authorization.
license: GPL-3.0
---

# Agentic Plan

Produce one self-contained engineering plan an agent can execute and verify. Planning does not authorize implementation, GitHub writes or deployment.

## Inputs and evidence

1. Confirm the product and repository identity, scope, current revision and mutation authority. Do not conflate similarly named or renamed repositories.
2. Inspect relevant source, configuration, tests and PRD when accessible. Distinguish verified facts, accepted decisions, candidates and unknowns.
3. Research only unsettled choices with material impact. Record sources and alternatives; do not invent paths, versions, benchmarks or tests.
4. Preserve existing verified progress when revising a plan. Never silently reset tasks.

## Output contract

Follow references/PLAN_TEMPLATE.md.

- Begin with outcome, status, repository and scope.
- Put one table titled exactly Dependencies near the beginning. Account for every named package, platform API, external service, protocol, build/test tool and reference-only project. Mark accepted, installed-verified, candidate, external integration or reference-only distinctly.
- Explain architecture once with ownership, interfaces, runtime boundaries and failure behavior.
- Specify phase gates and milestones with observable exit conditions.
- Include exactly one checklist titled TODO, with stable task IDs, prerequisites, deliverables and tests. No scattered checklists; unchecked means not verified.
- Keep accepted, deferred and unknown decisions distinct. Capture licensing and security risks, recovery steps and rollbacks.
- Include exact commands/paths only if inspected. Otherwise make discovery the first TODO item.

## Validation

1. Remove repeated requirements, technology names and checklists.
2. Map user-visible requirements to tasks, and describe observable proof for each task.
3. Verify no candidate was silently promoted to accepted and no external integration is presented as an embedded dependency.
4. Cover file data loss, credentials, authorization, concurrency, failure recovery, accessible UI and negative tests where applicable.
5. For substantial execution plans keep a self-contained change/progress log, record verified test evidence before checking off tasks, and ensure a fresh agent can continue without private chat history.
6. If asked only to plan, stop after the document; only perform implementation after explicit authorization and applicable repository governance.

## Companion skill

Use product-prd for what/why/who/acceptance, and agentic-plan for how/dependencies/order/verification. If both are requested, output two documents and keep the only implementation TODO checklist in the engineering plan.
