# ADR-0005 — The versioning scheme is a per-repository choice

**Status**: Accepted · 2026-09-07

## Context

Releases are automated on merge to `main`, but what a version number *means* is not a property of
the pipeline. A library makes compatibility promises; a continuously-delivered application does
not; some projects deliberately never leave `0.x`.

## Decision

`.github/scripts/versioning.py` implements five modes, selected in the manifest: `semver`,
`zerover` (the major never leaves zero), `pridever` (`PROUD.DEFAULT.SHAME`), `calver`
(`YYYY.MM.PATCH`), and `manual` (a `VERSION` file is the decision).

Automatic modes derive the bump from Conventional Commits, which
`.agents/rules/015-repository-taxonomy.md` (DF-RULE-015) already mandates and CI
already enforces, so the metadata is present without new ceremony. An explicit request always
overrides the derivation — necessary for PrideVer, where PROUD is a human judgement no commit log
can express, and useful everywhere else.

## Alternatives rejected

- **SemVer for everything.** Imposes a compatibility promise on projects that do not make one.
- **A version file per repository, bumped by hand.** Retained as `manual` mode rather than made
  universal; as a default it drifts from the tags and forgets releases.
- **Deriving the mode from the ecosystem.** Cargo and npm both expect SemVer-shaped strings, but
  the shape is not the policy, and one repository can be both.

## Consequences

- Five modes is five behaviours to keep tested; the suite asserts that the same commit log produces
  genuinely different versions under each.
- ZeroVer and PrideVer produce version strings that SemVer-consuming registries will parse but
  misinterpret. That is inherent to those schemes, and is the repository's choice to make.