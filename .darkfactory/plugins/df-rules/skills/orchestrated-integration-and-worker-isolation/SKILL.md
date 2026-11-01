---
name: orchestrated-integration-and-worker-isolation
description: Use when running parallel or externally dispatched agents: maintain one integration authority, isolate worker ownership, treat independent agent reports as terminal handoffs, dispatch any successor as a new fully self-contained assignment, and verify exact-head evidence before integrating.
title: Orchestrated integration and worker isolation
status: normative
applies_to: [agents, automation]
activation: always
owners: [planning, git, ci]
license: MIT
---

# Orchestrated integration and worker isolation

## Requirement

Parallel implementation has one integration authority per delivery branch.

- The orchestrator alone advances the authoritative remote delivery branch and owns integration.
- Parallel workers use isolated local worktrees/branches with explicit prerequisites and disjoint
  subsystem/path ownership. They do not mutate the integration branch or create competing
  authoritative delivery branches/PRs. Where a human explicitly dispatches independent external
  agents, each may produce a separate non-authoritative handoff branch/PR for review.
- Shared integration surfaces (root manifests/lockfiles, package export maps, workflow/config,
  PRD/PLAN/rules/docs and generated projections) stay orchestrator-owned unless one non-overlapping
  edit is explicitly delegated.
- Workers return a coherent commit SHA, changed-file set, targeted verification and assumptions.
  The orchestrator integrates those commits in dependency order, resolves shared files semantically
  and re-runs affected gates.
- A dependent lane starts only after the interface it consumes is integrated and verified on the
  authoritative branch. Do not parallelize across unsettled shared interfaces.
- Keep coherent Conventional Commit boundaries. One delivery PR does not justify one opaque commit.
- CI is read-only on delivery branches; background automation does not race the orchestrator by
  pushing formatter/fix commits.
- Each implementation gate records exact-head evidence before downstream work treats it as satisfied.

## Ephemeral external-agent dispatch and terminal handoffs

When agents are dispatched through separate chats, manual prompts or otherwise independently
scoped sessions, **treat every dispatch as a one-shot assignment by default**.

- A worker's final report is a **terminal handoff**. Do not assume its chat, runtime, worktree or
  identity remains available for another turn. Never tell the owner to ask the completed worker to
  continue, amend a PR or run more tests unless the owner has explicitly established a currently
  available continuing worker.
- **Worker lifecycle and workstream lifecycle are distinct.** A worker may be finished while its
  deliverable is awaiting review, integration, correction or rejection. Preserve that handoff as
  evidence; do not label the completed assignment "still running" or "pending agent output".
- Before proposing the next action, consume **all reports already provided** in the conversation or
  durable handoff record. Do not ask the owner to resend an existing report or claim its contents are
  unavailable without checking the accessible context. Distinguish worker-reported outcomes from
  independently verified repository, PR and CI state.
- If a submitted result requires a fix, continuation, audit or integration step, **dispatch a new
  independent agent with a new assignment**. Do not address follow-up instructions to the prior
  worker or rely on its private memory, environment, tools or unwritten assumptions.
- A successor prompt MUST be self-contained: purpose and acceptance criteria; repository; exact
  verified starting SHA and base/target branch; any predecessor commit/PR/issue references; relevant
  findings and known limitations; prerequisite context and affected interfaces; owned and forbidden
  paths; implementation versus read-only authority; test/CI requirements; required final evidence;
  and explicit no-merge/no-release constraints as applicable.
- The successor MUST refresh all cited refs before acting and report any drift. For corrections to
  delivered code, start a **new isolated branch** from the verified predecessor commit when
  appropriate; never assume authorization to push to the departed worker's branch or overwrite its
  handoff PR. The orchestrator reconciles replacement/superseded candidate PRs.
- Dispatch only work not already completed by the handoff. A missing active worker is not evidence
  of missing implementation, tests or reports. Review the delivered evidence first, then scope the
  smallest justified successor assignment.
- Where multiple successor agents run in parallel, give each an independent complete prompt,
  disjoint mutation ownership, explicit dependency gates and an unambiguous final report contract.
  The orchestrator owns durable status, reviews and dependency decisions across those sessions.

These rules apply even when a particular host can sometimes resume an agent: continuity must be
explicitly established, never inferred from a remembered agent name, branch or PR.

## Rationale

Parallelism is useful only when ownership and integration are deterministic. A single remote writer
plus isolated workers prevents lost updates, shared-file races and evidence attached to obsolete
heads. Terminal handoffs prevent manual, ephemeral subagent work from being mistaken for a
persistent worker that can be reactivated; self-contained successor prompts prevent lost context,
repeated work and unauthorized mutation of earlier submissions.

## Enforcement

Worktree/branch ownership, lease-safe git mutation, commit/evidence handoff, exact-head CI and final
alignment enforce the integration model. The orchestration ledger distinguishes **dispatched**,
**reported**, **verified**, **accepted**, **integrated**, **blocked** and **superseded** work, without
equating a worker's availability with its deliverable status. Successor prompts are checked for
independence and complete context before dispatch.

## Exceptions

A human may explicitly transfer integration authority, but there is still only one active integration
owner for a delivery branch at a time. An explicitly verified persistent worker may receive further
instructions when the owner intends that continuity; independent chat-dispatched workers remain
one-shot by default.

## Change control

The concrete worker implementation may change; single integration authority, isolation, terminal
handoff correctness, self-contained successor dispatch and exact-head evidence are invariants.
