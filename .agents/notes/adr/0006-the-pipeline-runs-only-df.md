# ADR-0006 — The pipeline runs only df

**Status**: Accepted · 2026-09-15

## Context

ADR-0002 made the pipeline harness-agnostic: it ran whichever coding-agent CLI (agy, claude, codex, kimi, grok, cursor,
opencode) had quota and credentials. Each CLI brought its own login, quota surface and failure modes, and the pipeline
could not see or route across providers itself. df now embeds the agent runtime with config-driven providers, many
accounts per provider and a quota engine. The owner decided (2026-09-14):

> "we shouldnt be using external harnesses anymore at all"

> "at least not in the pipeline"

## Decision

All pipeline execution is performed via the `df` command. External CLI harnesses are no longer invoked directly in the CI pipeline. The `df` tool orchestrates model selection, credential management, and execution across providers, ensuring a unified interface and simplifying quota handling.

## Alternatives rejected

- Continue using individual CLI harnesses per provider, which fragments credential management and complicates quota monitoring.
- Wrap external harnesses in shell scripts, introducing injection risks and reducing testability.
- Build a custom abstraction layer separate from `df`, duplicating functionality and increasing maintenance overhead.

## Consequences

- Simplified pipeline configuration: a single entry point (`df`) replaces multiple harness-specific scripts.
- Unified error handling and quota failover across providers.
- Reduced surface area for security vulnerabilities associated with shell invocation.
- Existing ADR-0002 is now superseded by this ADR, and any references to the old pipeline approach must be updated.
- **Forecloses**: external CLI harnesses (agy, claude, gemini, codex, kimi, grok, cursor, opencode) running directly in the CI pipeline — the pipeline must go through `df` only.
