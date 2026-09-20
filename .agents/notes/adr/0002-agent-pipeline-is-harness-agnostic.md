# ADR-0002 — The agent pipeline is harness-agnostic

**Status**: Superseded by ADR-0006 · 2026-09-15

## Context

The delivery pipeline was hardcoded to Google Antigravity's `agy`, with fallback only *between
models within that one CLI*. During this repository's first real run, Antigravity exhausted both
fallback tiers mid-implementation and two approved plans stalled at `Blocked` with nothing else to
try — a single vendor's quota halted delivery entirely.

## Decision

Coding-agent CLIs are described declaratively in `.github/scripts/harnesses.py`: a binary, an argv
template, a model chain, and credential keys. Antigravity, Claude Code, Codex, Kimi, Grok, Cursor,
and opencode ship in the registry.

- Fallback escalates **across harnesses**, not only across models.
- Harnesses whose binary is absent from `PATH`, or whose credentials are unset, are **skipped, not
  failed**.
- `AGENT_HARNESS_CHAIN` and `AGENT_HARNESS_CONFIG` override order and every field at runtime.
- Prompts are passed as argv elements, never through a shell.

## Alternatives rejected

- **Stay single-vendor.** Demonstrated to halt delivery on one provider's quota. Not hypothetical —
  it happened during the run that motivated this ADR.
- **`if`/`elif` per CLI in the runner.** Every new CLI edits the core retry loop, and each upstream
  flag rename becomes a code change, a review, and a container rebuild.
- **A wrapper shell script per CLI in the image.** Moves invocation into shell — where prompt
  quoting becomes an injection risk — and puts it beyond the reach of unit tests.
- **An LLM API abstraction instead of CLIs.** These tools are agents, not completions endpoints:
  they carry their own tool loops, permissions, and repository awareness. Reimplementing that is the
  project, not a dependency.

## Consequences

- Invocation flags are a maintenance surface. Mitigated by making every field overridable from a
  repository variable, so upstream drift never requires a code change.
- The container is larger and its build tolerates per-CLI failure, printing a manifest of what
  actually landed rather than pretending.
- Harness behaviour differs — output verbosity, tool permissions, repository conventions. Prompts
  must not assume any one CLI's habits.