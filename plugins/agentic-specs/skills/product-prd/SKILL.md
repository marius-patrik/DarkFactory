---
name: product-prd
description: Research and write or revise a lean product requirements document (PRD) that separates user problems, personas, journeys, prioritized requirements, acceptance criteria, success metrics, non-goals, and unresolved design questions. Use for product definition, UX/product design specifications, feature briefs, and scope refinement. Do not substitute an implementation task checklist for product requirements.
license: GPL-3.0
---

# Product PRD

Deliver a readable, user-outcome-oriented product requirements document, not a technical implementation plan.

## Workflow

1. Confirm product identity, user audience, problem, goal, and release scope. Inspect existing files, designs, feedback and source when accessible.
2. Separate validated evidence from product hypotheses. Do not fabricate interviews, personas, baselines, numerical targets, release dates or technical capabilities.
3. Research competing flows, usability, accessibility and feasibility only where relevant; ground external claims in current primary sources.
4. Ask only about a decision that blocks useful work. Otherwise declare assumptions and produce a reviewable draft.
5. Follow references/PRD_TEMPLATE.md; write the sections in order.

## Required output

- Summary: product promise in a short paragraph.
- Problem and audience: verified versus hypothesized needs; jobs-to-be-done.
- Goals and non-goals: measurable outcomes and explicit scope boundaries.
- User journeys and UX: entry, actions, result, error/empty/loading states, accessibility.
- Requirements: ONE stable-ID table with priority P0/P1/P2 and observable user acceptance per row.
- Release boundaries: distinguish real, simulated, deferred, externally provided and unsupported features.
- Success signals: metric, baseline, target, collection method; mark unavailable values TBD.
- Risks and open decisions: identify unverified assumptions, blockers and dependencies.

## Review

- Every P0 requirement has observable acceptance behavior.
- Every feature serves an audience/job or is labeled experimental.
- Do not duplicate sections or hide uncertainty with generic prose.
- Do not turn the PRD into a package/dependency catalog or an engineering TODO list.
- Reference a separate engineering plan when detailed task sequencing or technical decisions are required.
- PRD creation does not authorize implementation or repository changes without a separate explicit request.
