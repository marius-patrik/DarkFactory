---
id: DF-RULE-014
title: Agent runtime and resilience
status: normative
applies_to: [agents, automation]
activation: always
owners: [rotation]
---
# Rule 14 — Harness-agnostic agent runtime and conversational lifecycle

## Requirement

An autonomous AI agent runs containerized in GitHub Actions (`docker/Dockerfile.agent`). It is
**harness-agnostic**: no pipeline code knows which coding-agent CLI is executing.

- **Harness registry**: `.github/scripts/harnesses.py` declares each CLI — Antigravity (`agy`),
  Claude Code (`claude`), OpenAI Codex (`codex`), Kimi (`kimi`), Grok (`grok`), Cursor
  (`cursor-agent`), and opencode (`opencode`) — as a binary, an argv template, the credentials it
  accepts, and its quota pools. Adding a harness is a data change; changing one is a configuration
  change.
- **No hardcoded invocation**: every field is overridable at runtime through the
  `AGENT_HARNESS_CONFIG` repository variable, and the order through `AGENT_HARNESS_CHAIN`, so an
  upstream flag rename never requires a code change or a container rebuild.
- **Graceful degradation**: harnesses whose binary is absent from `PATH`, or whose credentials are
  unset, are skipped rather than failed. An image carrying four of seven CLIs is a working image
  with a shorter fallback chain.
- **Resilience**: exhaustion moves to the next account, then the next pool, then the next harness.
  Only when every account of every pool of every harness is spent does the agent checkpoint and
  block. Authentication uses repository secrets only; the account being run is named in the log, its
  credential never is.
- **Conversational lifecycle**: incoming issues are auto-classified, the agent answers feedback and
  executes adjustments on Request issues and pull requests, bots are ignored to prevent
  self-reply loops, and on plan approval the agent opens a bot-authored Draft PR and self-reviews it
  in separate runs: each review run posts all findings and dispatches a fix run, which dispatches
  the next review, until a review finds nothing (identical findings twice block the PR). On quota
  exhaustion the agent saves a checkpoint, moves
  the item to `Blocked`, comments the resume instructions, and exits cleanly.

## Rationale

Outputs must be classified by their real outcome, not by exit code, and no provider's short-term
quota may idly sleep while an unused account still has capacity.

## Enforcement

- `docker/Dockerfile.agent` image; `.github/scripts/harnesses.py` registry.
- Runner/quota and review-cap tests in `tests/test_agent_runner.py`.
- PRD section 7 states runtime and continuity outcomes.

## Exceptions

None.

## Change control

Owner is `rotation` (outcome classification, cross-provider handoff, repository-variable quota
state, scheduled resume). Provider, model, and account details are manifest declarations, not rule
text. Checkpoint filenames and concrete mechanics are operational details, not product
requirements.