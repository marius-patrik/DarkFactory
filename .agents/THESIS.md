# DarkFactory — Thesis

> **Status: orientation, not specification.** DF-RULE-003 makes `.agents/PRD.md` the single
> normative product requirements document and accepted ADRs the record of durable decisions.
> This document is **none of those things** and overrides nothing. It exists to say *why the
> shape is what it is* and *what we are deliberately not doing yet*, so that a proposal can be
> judged against a direction rather than re-argued from scratch every quarter.
>
> **Not the current release.** Nothing here commits the version in `VERSION`. Where this
> document and shipped behaviour disagree, shipped behaviour wins and this document is wrong
> until reconciled.
>
> Canonical: this file. Root `THESIS.md` is a symlink here, per DF-RULE-002's rule that
> discovery aliases remain links rather than copied authored documents.

## 1. The claim

DarkFactory is **one system** that is simultaneously a library, a framework, a pipeline, a
developer tool and a workspace manager. Those are not five features competing for the same
name. They are one capability — **act on a system through a declared interface** — observed at
five scales: a function call, a repository, a pipeline, a machine, a fleet.

Everything else in this document is a consequence of taking that seriously.

## 2. The fleet is the constraint nobody planned around

`.agents/PRD.md` §17 puts six repositories in one fleet, and **`omnis` is consumer #2**.
DarkFactory does not merely learn from `omnis`; it has to install, configure and evolve it.

That is a hard architectural constraint and it is the most consequential thing in this
document, because it rules out the obvious design. `omnis` is declared as a **Nix module**,
deliberately: it gets typed options, merge semantics, `mkDefault`/`mkForce`, imports and
nixpkgs for free rather than by owning a language. DarkFactory therefore cannot assume that
every system it governs is written in its own dialect.

So the systems layer needs a **foreign-declaration adapter** — the ability to read a
declaration authored in someone else's language and expose it as a composable capability. If
the systems layer is TypeScript-only, DarkFactory cannot govern its own sibling, and the
"universal" in universal SDK is aspirational.

This is also the honest answer to "should we own a language": for the *systems layer* we get
to choose the dialect, because we author it. For everything DarkFactory *binds*, we do not,
and must not.

## 3. Bind, never reimplement

DarkFactory is a kernel over systems that already exist and are better than ours. The `forge`
abstraction is the worked example. Version control is `git`, `gh`, `forgejo`, `gitlab`, or a
bare local directory. We implement none of them. We implement the *seam*:

```
forge.snapshot:   <target>            what the tree looks like now
forge.stage:      <target, paths, msg> the only way to change a tree
forge.publish:    <target, ref>       the only way to move a ref
```

What we own is that those verbs mean the same thing on every backend, compose with everything
else, and can be named in a declaration without a conditional. The same discipline binds
toolchains to Nix, and agent capabilities to Cordis service rows — an id, a package, a config
object, an optional `isolate` realm — rather than a hard-coded tool list. Nothing in the
framework knows what `gh` is; it knows what a *forge* is.

**Every line we write to replace a mature tool is a line worse than what it replaces, and one
we maintain forever.** DF-RULE-017 already forbids duplicate implementations and unreachable
code; this is the same discipline applied to whole categories of software.

## 4. Declarable by nature

**Anything config-shaped in nature must be declarable rather than coded.** If a competent
operator could reasonably want to vary it without reading our source, it is data. If only
someone who has read the implementation could want it, it is code and should be code.

This is not a new commitment. §5 of the PRD already requires that new project-specific
behaviour arrive as capabilities rather than core changes, and `harness/assets/graph.darkfactory.json`
is already a 17-node declared graph with edges, events and required checks. Declarability is
the shipped state, not the aspiration. What this section adds is the *reach* — the test above
— and the discipline that every resolution layer is inspectable, because "the user overrode the
default" and "the default is this" are different facts and an operator debugging a surprise
needs the difference.

## 5. Works with the repository in front of you

DarkFactory must work on a repository it did not create, without requiring that repository to
be reorganised to be understood.

Conventional formats are **inputs**. A `package.json` declaring `bun test` and `biome lint .`
is a repository whose quality actions are already declared, in its own vocabulary. A
`pyproject.toml` declaring `pytest` and `black` is the same fact in another.
`.github/workflows/*.yml` is a pipeline described in a format we did not invent.

Framed carefully, because DF-RULE-017 forbids fallback and alias layers: a repository's own
`package.json` is an **external supported contract explicitly required by the PRD**, so
reading it is required behaviour, not a compatibility shim. And a repository with no
`repo.dfconfig` is not in a degraded mode — that is the normal case, and the one that must
never regress. Our configuration is an *addition* to what a repository already says; where both
speak, ours wins for what we own and theirs wins for everything else.

## 6. One file per function, named for the feature

A file implements one capability and is named for that capability. The naming rule is the part
that matters: **the name states the feature, not the code.** `createWorktree.ts` is named for
what it does for a caller. If the mechanism changes — a better library, a swapped
implementation — the file does not rename, because the feature did not change.

**A file that cannot be named has not been understood yet.** `utils`, `helpers`, `common` and
`manager` are not categories of code; they are the absence of a decision about what a piece of
code is for. This is now a rule rather than a preference — see the Request for the check and
the two current violations it resolves.

**This applies everywhere, without exception.** The harness not meeting the standard is not a
reason the standard does not apply to the harness. A standard that holds for `capabilities/`
and is quietly waived for `harness/` is not a standard; it is a preference with a compliance
team. Where a violation exists, the violation is the work.

One consequence deserves its own care: because composition is discovery-based (§7), a rename
is *not* automatically a breaking change for importers, since nothing imports by path. So the
"filename is the public API" argument is weaker than it first appears, and the real discipline
is the naming one — the name must survive the mechanism changing.

## 7. No indices; everything composes dynamically

**No `index.ts` barrels.** Nothing is registered by being listed in a file a human has to
remember to edit. The tree has six today (`ci/`, `graph/`, `github/`, `identities/`,
`router/`, `packages/auth/`), and each is a place where a new capability is invisible until
someone adds a line — a second source of truth that must be kept in sync with the filesystem,
and the day it is not, something is silently missing.

Composition is therefore **discovery-based**: capability is found by what a directory contains
and what its files declare. Adding a function makes it available; nothing else changes.

The obvious tension is that dynamic composition costs compile-time knowledge of what exists.
The resolution is that **composition is dynamic; typing is not.** Each file is statically
typed in full. What is discovered is the *set* of capabilities, and an unknown name fails at
load with a real error — not at build because a barrel was not updated.

## 8. The language: `.df`

DarkFactory has a language for the systems layer. It is **TypeScript with a different
extension and a framework-provided standard library**.

The obvious objection is well-founded, and `omnis` rejected a declaration language for good
reason:

> *It is a Nix module. Not a format of our own that compiles to Nix: that means owning a
> language, a parser, a type system, an error-reporting story, and a compiler, to arrive where
> the Nix module system already is.*
> — `omnis` ARCHITECTURE §4

That reasoning is correct for a format that compiles to something else, and §2 above is the
consequence: for anything DarkFactory *binds*, we do not own the dialect. But for the systems
layer — which we author — the argument does not apply, because:

- **The TypeScript compiler, unchanged.** No new parser, no new type checker, no new error
  reporting, no compiler to build. Every editor, language server, `@types` package and
  published library works, because the files *are* TypeScript.
- **`.df` means one thing: this file participates in system composition.** The forge, pipeline,
  workspace, credential and quota capabilities are ordinary modules a `.df` file imports.
- **We invent no syntax.** If a construct cannot be expressed in TypeScript, it does not go in
  `.df`. The only addition is the extension and the loader.

The property this buys is the migration story: **a capability starts life as ordinary
TypeScript and joins the system by being renamed, not rewritten.** An experiment that does not
work is a deleted file rather than a reverted design, and nothing is committed to the system
until it has survived being ordinary code.

### 8.1 `.df` is freed for this, and the old meaning moves to `.dfa`

`.df` already means something here, and the two uses cannot coexist. PRD §7.3 gives it to
df-owned state and result artifacts, and it is live in `~/.df/`:

| today | is | becomes |
| --- | --- | --- |
| `credentials.df` | credential store — **plaintext OAuth, see §10** | `credentials.dfa` |
| `limits.df`, `limits-audit.df` | quota limit ledger | `.dfa` |
| `usage.df` | usage event log | `.dfa` |
| `router-outcomes.df` | learned router outcomes | `.dfa` |
| `models/<provider>.df` | model catalogue cache | `.dfa` |

All of them are **versioned JSON documents that df writes about the world** — machine-written,
machine-owned, never hand-authored. That is a coherent category and it deserves its own
extension, because "an artifact df owns" and "source that participates in composition" are
opposite intentions. `.dfa` keeps the `df` prefix so it stays greppable and grouped.

## 9. Two configuration surfaces, deliberately

The instinct to have one format is usually right and is wrong here, because the two things
have genuinely different jobs.

| | `.dfconfig` | `.df` |
| --- | --- | --- |
| **Declares** | the *layer* — quality gates, docs, release, licensing, what this repository is | the *system* — which capabilities are composed, and how |
| **Audience** | someone configuring a repository | someone extending the framework |
| **Shape** | JSON-ish, no code, statically known keys | TypeScript, evaluated, dynamically discovered |
| **Failure** | a build failure | a load-time composition error |

`.dfconfig` stays declarative data because the pipeline reads it in environments where running
code is a liability, and because a human must be able to read the whole file to know what
happens. `.df` is code because choosing a backend and composing capabilities is genuinely a
program, and pretending otherwise grows a Turing machine one workaround at a time.

Both are found by the same loader, from the same discovery, under the same layering rules as
§4. The split is in what they are *for*, not in how they are found.

## 10. What this implies, and one thing that is wrong now

Stated as directions, not tasks:

- **The seam, not the organ**, applies to the pipeline as much as to the forge. `git`, `gh`,
  `nix` and `cordis` are bound. What we own is that a declaration can name them.
- **Provider, forge, host and runner are the same kind of thing** — a concern with a small
  vocabulary, several backends, and a declaration that picks one. A new concern that does not
  fit that shape probably wants to be code.
- **Every "one line to register it" is a future omission.**

And one finding that is not a direction but a live defect: **`credentials.df` stores OAuth
access and refresh tokens as plaintext JSON.** PRD §11 makes `@darkfactory/keychain` the sole
credential-custody owner and commits to OS-native secure storage with encrypted fallback; a
plaintext token file is not that. It is worth fixing on its own merits, independently of
whether `.df` ever means anything new.

## 11. How to tell if this is wrong

A thesis that cannot be falsified is a mood. These are the claims that would sink it:

- **Dynamic composition proves unaffordable.** If capability sets cannot be resolved reliably
  at load time, or the errors are worse than the barrels they removed, §7 is wrong.
- **The foreign-declaration adapter is not enough.** If reading a Nix module cannot be made a
  first-class capability, the fleet in §2 is unreachable and the systems layer has to be
  something other than what §8 describes.
- **The two config surfaces diverge.** If `.df` ends up expressing things that belong in
  `.dfconfig`, §9 has failed and there should be one format.
- **Binding costs more than owning.** If the seam is measurably worse than calling `git`
  directly — latency, error fidelity, capability — we should own more organs.
- **The tree keeps needing a barrel.** If `index.ts` keeps reappearing because discovery
  cannot express what it expresses, that is evidence against §7, not a lapse.

## 12. Relationship to the paper

Unrelated. `paper/index.typ` and everything scholarly about it is a consumer of this system,
not a part of it (DF-RULE-020). A thesis that cannot be separated from its first application
is a specification. This one is a direction, and it is allowed to outlive whatever prompted
it.

## Provenance

Synthesised from the scoping in `marius-patrik/omnis` — ADR-0011 (*bind existing services
rather than reimplement them*), ADR-0012 (*one declarative configuration applied as
generations*), §4 (*the declaration*) and §7 (*the modification surface*) — together with the
Cordis service-row composition already used in the dsh profiles, and the one-file-per-function
tendency already present in `harness/src/`.

Departures from `omnis` are deliberate and marked where they occur: §2 and §8 argue that
owning `.df` is not the same decision as owning a declaration language, because DarkFactory
authors its own systems layer and binds everyone else's.
