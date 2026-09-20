# ADR-0003 — Repository identity is data, not code

**Status**: Superseded by ADR-0021 · 2026-09-20

## Context

This repository was seeded from omnis, and inherited its identity wholesale. The area labels
described a terminal cell-grid renderer and an embedded browser engine; the ADR file recorded
omnis's decisions about scene trees and PGlite; a docstring looked up "the Omnis project number";
the argument parser announced itself as omnis's. None of it was detectable by review, because each
string was individually plausible.

The pipeline is meant to be distributed to many repositories. Anything hardcoded is either wrong in
every repository but one, or becomes a merge conflict on every update.

## Decision

Everything repository-specific lives in `.darkfactory/manifest.json` and is read through
`.github/scripts/manifest.py`. The shared workflows and scripts are then byte-identical across
every consumer, so a pipeline update is a fast-forward rather than a merge.

The area taxonomy is the clearest case: labels, permitted commit scopes, and the agent's request
classifier all read the one declaration, so the three cannot drift apart.

## Alternatives rejected

- **Environment variables per repository.** Invisible to review, unversioned, and absent when a
  script is run locally.
- **A Python module of constants.** What exists today. It is code, so consumers must edit a shared
  file, which guarantees a conflict on the next update.
- **Template substitution at adoption time.** Produces a copy that has forked on day one; there is
  no path back to receiving upstream fixes.

## Consequences

- A manifest key added later must default, or it breaks repositories that have not adopted it. Every
  accessor in `manifest.py` therefore has a fallback, and a missing or malformed manifest still
  yields a working object rather than an import error.
- Identity leaks are now a test failure rather than a discovery: `tests/test_manifest.py` asserts
  that no other project's identifiers appear in the shared scripts.