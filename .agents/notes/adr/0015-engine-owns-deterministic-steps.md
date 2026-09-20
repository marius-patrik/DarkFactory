# ADR-0015 — The engine owns every deterministic step

**Status**: Accepted · 2026-09-15

## Context

Agent runs failed on steps that needed no judgement: checkouts, commits, and results printed as JSON by models that
were misconfigured or too weak to keep the format. The owner decided (2026-09-15):

> "we should make everything rhat can be deterministic so eg checkouts should be engine managed and we shouldnt require models to output json"

> "commits as well dont require models to commit at all just commit each chunk"

The first design had models return structured results through a typed `submit_*` tool. The owner revised it the same
day:

> "ideally models shouldnt need to call a tool at all to submit just do it when they stop working"

## Decision

- The df engine owns every deterministic step: worktrees and checkouts, branch updates, commits (one per chunk, made
  by the engine), pushes, pull requests, verification runs and file-scope checks.
- Models only edit files and answer. No model is asked to print JSON, run git, or call a tool to submit.
- When a model stops, code results are taken deterministically: the diff is verified, scope-checked and committed.
  Judgement answers such as review verdicts are extracted afterwards by a light model with provider-enforced
  structured output.
- Anything that can be checked by code is checked by code.

## Alternatives rejected

- **Models print JSON results.** Misconfigured and weak models break the format, and the run fails on formatting
  rather than on the work.
- **Models call a typed `submit_*` tool.** Invalid arguments can be rejected and retried, but every model still has to
  call the tool correctly. Superseded by capture after the model stops.
- **Models run git.** Checkout, commit shape, identity and scope would vary by model.

## Consequences

- A model that can edit files is enough for code work, which lets weaker models take part (ADR-0012).
- Judgement answers cost one extra light-model call for extraction.
- The engine, not the prompt, is where a step's correctness is enforced, so prompts need not describe git or output
  formats.
