# DarkFactory — Thesis

> **Status: long-term direction, not the current release.** Nothing here is a commitment for
> the version in `VERSION`. It is the shape of the thing, recorded so that decisions made
> today can be judged against it. Where it contradicts a shipped behaviour, the shipped
> behaviour wins and this document is wrong until reconciled.

## 1. The claim

DarkFactory is **one system** that is simultaneously a library, a framework, a pipeline, a
developer tool and a workspace manager — and the reason those five can be one thing is that
all of them are *the same activity* observed at different scales. Sequencing a release,
linting a repository, resolving a credential and running a fleet of agents are not five
features. They are one capability — **act on a system through a declared interface** —
applied to a repository, to a machine, or to a fleet.

The corollary is the constraint everything else follows from: **anything that is
config-shaped in nature must be declarable rather than coded.** If a decision can be written
down, a person should be able to write it down. If it cannot, the system has a hard-coded
opinion it should not have.

## 2. Consequence: bind, never reimplement

DarkFactory is a **kernel over systems that already exist and are better than ours**.

The `forge` abstraction is the worked example. Version control is `git`, `gh`, `forgejo`,
`gitlab`, or a bare local directory. We do not implement any of them. We implement the
*seam* — the interface that makes them composable, interchangeable, and describable in a
declaration:

```
forge:            git · github · forgejo · gitlab · local
forge.snapshot:   <one call>              what the tree looks like now
forge.stage:      <paths, message>        the only way to change a tree
forge.publish:    <target, ref>           the only way to move a ref
```

What we own is that those three verbs exist, mean the same thing on every backend, and
compose with everything else. A repository that is a local directory and a repository that
is GitLab are the same object to the rest of the system, and a declaration can say which
without a single conditional.

The same discipline applies across the board. Toolchains bind to **Nix** rather than
pinning versions. Agent capabilities bind to **Cordis** service rows — an id, a package, a
config object, an optional `isolate` realm — rather than a hard-coded tool list. Nothing in
the framework knows what `gh` is; it knows what a *forge* is.

**A line we write to replace a mature tool is a line that is worse than what it replaces
and that we then maintain forever.** Every reimplementation is a future bug we chose.

## 3. Declarable by nature

This is the load-bearing principle, and it means more than "add a config file".

The test for whether something belongs in a declaration is: **would a competent operator
reasonably want to vary this without reading our source?** If yes, it is declarative. If the
answer is "only someone who has read the implementation could possibly want this", it is
code, and it should be code.

Applied honestly, that principle reaches further than expected:

- **Backends.** Which forge, which toolchain, which CI runner, which agent harness.
- **Composition.** What is in the tree, in what order, with which isolation.
- **Policy.** What the pipeline will and will not do unattended, and what requires a human.
- **Layout.** The mapping from a repository's existing conventions onto our model — see §5.

Declarations resolve in named layers, later winning, and **every layer is inspectable** —
the system can always answer *which layer set this value*, because "the user overrode the
project default" and "the project default is this" are different facts and an operator
debugging a surprise needs the difference.

## 4. One file per function, named for the feature

A file implements one capability and is named for that capability.

The naming rule is the part that matters and the part most often got wrong: **the name
states the feature, not the code.** `createWorktree.ts` is named for what it *does for a
caller*, not for the mechanism it happens to use. If the mechanism changes — because a
better library appeared, or because we swapped an implementation — the file does not
rename, because the feature did not change.

Two consequences worth stating:

- **The filename is the public API.** Renaming a file is a breaking change, so the name
  must be chosen as if it were, because it is.
- **A file that cannot be named has not been understood yet.** "utils", "helpers",
  "common" and "manager" are all symptoms of a capability that has not been identified.
  We should treat them as smells, not as conventions.

The current tree is already largely this shape — `createWorktree.ts`,
`openPullRequest.ts`, `protection.ts`, `doctor.ts`, `licensing.ts`. The claim is to hold the
line as the surface grows, not to introduce it.

## 5. No indices; everything composes dynamically

**No `index.ts` barrels.** Nothing is registered by being listed in a file someone has to
remember to edit.

The tree already violates this in six places (`ci/index.ts`, `graph/index.ts`,
`github/index.ts`, `identities/index.ts`, `router/index.ts`, `packages/auth/src/index.ts`),
and each one is a place where a new capability is invisible until a human adds a line. That
is the failure mode: the index becomes a second source of truth that must be kept in sync
with the filesystem, and the day it is not, something is silently missing.

Composition is therefore **discovery-based**: capability is found by what a directory
contains and what its files declare, not by an import list. Adding a function makes it
available; nothing else changes.

The obvious tension is that dynamic composition costs compile-time knowledge of what
exists. The resolution is that **composition is dynamic; typing is not.** Each file is
statically typed in full. What is discovered is the *set* of capabilities, and that set is
resolved at load time with a real error when a name does not exist — not an import that
fails to compile because a barrel was not updated. Indices trade a load-time error for a
build-time one and, worse, require a human to be the index.

## 6. Works with the repository in front of you

DarkFactory must work on a repository it did not create, and it must not require that
repository to be reorganised to be understood.

That means **conventional formats are inputs, not obstacles.** A `package.json` with
`bun test` and `biome lint .` is a repository whose quality actions are already declared —
in its own vocabulary. A `pyproject.toml` declaring `pytest` and `black` is the same fact
in another. `.github/workflows/*.yml` is a pipeline described in a format we did not invent.

So the resolution layer maps *what a repository already declares* onto our capability model,
and **absence of our configuration is a supported state, not an error.** A repository with
no `repo.dfconfig` has capabilities discovered from its conventional files and runs
normally. This is not a fallback path to be deprecated later — it is the primary path for
most repositories, and the one that must never regress.

The corollary: our configuration is an *addition* to what a repository already says, and
where both speak, ours wins for the things we own and theirs wins for everything else.

## 7. The language: `.df`

DarkFactory has a language of its own. It is **TypeScript**, with a different extension and
a framework-provided standard library.

This distinction is the whole argument, so it is worth being explicit, because the obvious
objection is well-founded. `omnis` considered exactly this and rejected it, for good
reasons:

> *It is a **Nix module**. Not a format of our own that compiles to Nix: that means owning a
> language, a parser, a type system, an error-reporting story, and a compiler, to arrive
> where the Nix module system already is.*
> — `omnis` ARCHITECTURE §4

That reasoning is correct *for a format that compiles to something else*, and the
conclusion `omnis` drew from it — do not own a language — is right. But DarkFactory is not
proposing a new language that compiles to an existing one. It is proposing:

- **The TypeScript compiler, unchanged.** `tsc` is the type system. There is no new parser,
  no new type checker, no new error-reporting story, no compiler to build. Every editor,
  every language server, every existing `@types` package and every published library works
  unchanged, because the files *are* TypeScript.
- **`.df` as the extension** for files that are part of the system rather than part of a
  library API. The extension carries one piece of meaning: *this file participates in
  system composition.* Everything else is ordinary TypeScript.
- **The standard library** — the forge, the pipeline, the workspace, the credentials, the
  quota engine — as ordinary modules that `.df` files import.

The payoff is the migration property, and it is a real one: **a capability starts life as
ordinary TypeScript and becomes part of the system by being renamed, not rewritten.** An
experiment that does not work is a deleted file rather than a reverted design. Nothing is
committed to the system until it has survived being ordinary code.

This is also why a language is not premature here. `omnis` owns a machine; the declaration
*is* the product, so getting the language wrong is catastrophic. DarkFactory owns a
framework whose declaration is a *composition* of capabilities. The language describes how
capabilities are wired, and getting the wiring slightly wrong is a bug in a file, not a
misstatement of what the system is.

**We do not invent syntax.** If a construct cannot be expressed in TypeScript, it does not
go in `.df`. The only addition is the extension and the loader.

## 8. Two configuration surfaces, deliberately

The instinct to have one format is usually right and is wrong here, because the two things
have genuinely different jobs.

| | `.dfconfig` | `.df` |
|---|---|---|
| **Declares** | the *layer* — quality gates, docs, release, licensing, what this repository is | the *system* — which capabilities are composed, and how |
| **Audience** | someone configuring a repository | someone extending the framework |
| **Shape** | JSON-ish, no code, statically known keys | TypeScript, evaluated, dynamically discovered |
| **Cost of a wrong value** | a build failure | a runtime composition error |

`.dfconfig` stays declarative data because it is read by the pipeline in environments where
running code is a liability and where a human needs to read the whole file to know what
happens. It is the layer where *no* code is the right answer.

`.df` is code because the systems layer genuinely is code: choosing a backend, composing
capabilities, wiring a secret to a consumer — those are programs, and pretending otherwise
produces a configuration language that grows a Turing machine one workaround at a time.

Both are resolved by the same loader, from the same discovery, with the same layering rules
as §3. The split is in what they are *for*, not in how they are found.

## 9. What this implies for the tree as it is

Stated as directions, not tasks, and deliberately not a roadmap:

- **`capabilities/`** is the shape §2 and §3 already gesture at. A capability is a bound
  system with a declared interface and swappable backends. The existing
  `capabilities/{code,paper,math}` are early instances of the right idea.
- **The seam, not the organ**, applies to the pipeline as much as to the forge. `gh`,
  `git`, `nix` and `cordis` are bound. What we own is that a declaration can name them.
- **Provider, forge, host and runner are the same kind of thing** — a concern with a small
  vocabulary, several backends, and a declaration that picks one. If a new concern does not
  fit that shape, it probably wants to be code.
- **Every "one line to register it" is a future omission.** Discovery replaces it.

## 10. How to tell if this is wrong

A thesis that cannot be falsified is a mood. These are the claims that would sink it:

- **Dynamic composition turns out to be unaffordable in practice.** If a repository's
  capability set cannot be resolved reliably at load time, or the error messages are worse
  than the indices it removed, §5 is wrong and barrels are the lesser evil.
- **The two config surfaces diverge in practice.** If `.df` files end up expressing things
  that belong in `.dfconfig`, the split in §8 has failed and there should be one format.
- **Binding costs more than owning.** If shelling out to `git` through an abstraction is
  measurably worse than calling `git` directly — in latency, in error fidelity, or in
  capability — then the seam is not paying for itself and we should own more organs.
- **The tree keeps needing a barrel.** If `index.ts` files keep reappearing because discovery
  genuinely cannot express what they express, that is evidence against §5, not a lapse.

## 11. Relationship to the paper

Unrelated. `paper/` and everything scholarly about it is a consumer of this system, not a
part of it. A thesis that cannot be separated from its first application is a specification.
This one is a direction, and it is allowed to outlive the thing that prompted it.

## Provenance

Synthesised from the scoping in `marius-patrik/omnis` — in particular ADR-0011 (*bind
existing services rather than reimplement them*), ADR-0012 (*the system is one declarative
configuration applied as generations*), §4 (*the declaration*) and §7 (*the modification
surface*) — together with the service-row composition already used by Cordis in the dsh
profiles, and the one-file-per-function tendency already present in `harness/src/`.

Where this document departs from `omnis` it departs deliberately and says so: `omnis` binds
Nix as its declaration language to avoid owning one, and this thesis proposes owning
`.df`. §7 is the argument for why that is not the same decision.
