# 1. Domains sit above environments

**Status:** Accepted — 2026-09-08

## Context

`environment.py` answers one question for the whole pipeline: what is this repository made of.
It answered it with a single level, the *ecosystem* — `python`, `node`, `rust`, `go`, `deno` —
where each ecosystem is a row across the command and artifact tables plus a guarded job in CI.

That level was enough while every repository held code. It stopped being enough when written work
came under the pipeline: a thesis typeset with Typst, whose practical part is a working codebase.
Installed as it was, the pipeline would run a Python job against a repository containing no Python
and package no artifact for a repository whose entire output is one PDF.

Adding `typst` as one more ecosystem row would have made that repository build. It would not have
expressed the thing that actually differs. Python and Rust are not two kinds of work; they are two
toolchains for the same kind. Typst and LaTeX are likewise two toolchains — for a different kind.

## Decision

Introduce a level above the ecosystem: the **domain**.

- An **environment** (the existing ecosystem) says which toolchain a package needs.
- A **domain** says what kind of governance it answers to: code is tested and packaged, a paper is
  typeset and published, math is proved.

`DOMAINS` maps each ecosystem to its domain, and `DEFAULT_DOMAIN` covers an ecosystem a repository
invented for itself, so declaring one never crashes for want of a mapping.

`Environment` gains `domains`, `packages_in`, `has_domain` and `is_multi_domain`, mirroring the
existing `ecosystems`, `packages_for` and `has` exactly — the new level is navigated the same way
as the old one, so there is nothing extra to learn.

Environments keep their own rows. `typst` and `latex` are separate entries in the command tables,
not one `paper` entry with an engine argument, because they are genuinely different toolchains.
The alternative considered was carrying the engine in the existing `package_manager` slot; it was
rejected because a typesetting engine is not a package manager and no lockfile identifies one, so
the slot would have meant two different things depending on the row.

## Consequences

Repositories become **multi-domain** as well as polyglot. Polyglot means several environments
inside one domain and already worked; multi-domain means several kinds of work at once, and is what
lets a thesis and the software it documents live in one repository with both governed properly.

CI gains one guarded job per new domain rather than per environment, so a repository using both
Typst and LaTeX does not accumulate a required check per engine.

Existing repositories are unaffected: every ecosystem they use maps to `code`, and every table row
they rely on is untouched.
