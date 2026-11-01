# Contributing to DarkFactory

Use an isolated feature branch, retain exclusive file ownership and keep `main` protected. The active [finish master](https://github.com/marius-patrik/DarkFactory/issues/2070) tracks current release dependencies. Historical merged PRs are provenance, not active implementation plans.

## Repository checks

Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` and strict documentation validation. Tests must live under `.github/tests/`; required checks cannot be replaced by skipped or source-text-only checks.

## Documentation changes

Update the source with the authority for its claim: README for requirements, one accepted ADR for a decision, `repo.dfconfig` for executable declarations, and the owned TS implementation for behavior. Reader-oriented pages under `docs/guides/` explain those sources; they are **not** another PRD. Add the page to `packages/docs/src/guides.ts` and ensure links, anchors and generated CLI/config references pass validation.

## Review and merge

Record exact base and head SHA, external check conclusions and reviewer disposition. Significant new changes invalidate exact-head verification; fix first, then rerun. The first accepted release requires a final bot-authored reviewed PR and explicit promotion.
