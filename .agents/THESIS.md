# DarkFactory — Thesis

> **Status: orientation, not specification.** DF-RULE-003 makes `.agents/PRD.md` the single
> normative product requirements document and accepted ADRs the record of durable decisions.
> This document is **none of those things** and overrides nothing. It exists to say *why the
> system is shaped this way* and *what we are deliberately not building yet*, so a proposal can
> be judged against a direction instead of re-argued from first principles every quarter.
>
> **Not the current release.** Nothing here commits the version in `VERSION`. Where this
> document and shipped behaviour disagree, shipped behaviour wins and this document is wrong
> until reconciled.
>
> Canonical: this file. Root `THESIS.md` is a symlink here, per DF-RULE-002 — discovery
> aliases remain links, never copied authored documents.

## 1. The claim

DarkFactory is **one system** that is at once a library, a framework, a pipeline, a
developer tool, a workspace manager and an operator of machines. Those are not six products
sharing a name. They are one capability — **act on a system through a declared interface** —
observed at six scales: a function call, a file, a repository, a pipeline, a machine, a fleet.

Everything below is a consequence of taking that literally, including the parts that are
uncomfortable.

**It is both a tool and a platform, and that is not a compromise.** A tool you use; a platform
others build on. DarkFactory is the second *and* the first, because a platform nobody can
extend is a tool with opinions, and a tool nobody can trust with a machine is a script. The
consequence is a real obligation: `.df` and the capability surface are published contracts, so
they carry a compatibility promise that internal refactors do not.

## 2. Self-hosting is the engine, not a milestone

**DarkFactory is implemented in DarkFactory, and maintained by DarkFactory via DarkFactory.**

This is the load-bearing commitment and the reason the rest of the system is shaped the way it
is. Two things follow, and they are not optional extras.

**The abstractions are construction material.** Every abstraction in this document has to be
sufficient to *build the system that defines it*. If `forge` and the capability model cannot
construct the interpreter, then "implemented in df" quietly degrades into "ships binaries,
maintains itself later", and the claim is marketing. An abstraction that cannot build the
system is not yet an abstraction — it is a local convenience that will not survive contact with
the thing it is supposed to be a part of.

**There is a bootstrap, and it should be named.** Something has to execute the first `.df`
file. Either that something is itself expressible in `.df`, or there is a seed, and seeds rot
**The bootstrap is TypeScript, and that is the whole answer.** `.df` is TypeScript (§11), so
there is no foreign seed to grow out of and no fixed point to bootstrap through. The base
language and the interpreter are already a language we did not have to invent, with a compiler
and an ecosystem behind it, and **the interpreter is the bridge**: it is simultaneously what
executes a `.df` file, what makes a `.df` file composable rather than merely typed, and what
turns a declaration into state. Compositability, declaration and execution are the same
mechanism seen from three sides, which is why the systems layer can be a bridge instead of a
wall.

This is the concrete form of §3's bind-don't-reimplement applied to ourselves. We did not
write the base language or the type checker, and by not writing them we get editors, language
servers and every published `@types` package for free. The one thing we do own — the loader,
the capability discovery, the composition — is the part no existing system provides, because
it is specific to what we are.

**The residual risk is not a foreign core; it is a frozen one.** The danger is not that the
bootstrap is in another language — it is not — but that the interpreter's assumptions harden
until the systems layer can only be written the way the first version expected. So the test in
§2 below is worth more than a seed policy would have been.

**This is a filter, and it is a good one.** Every proposal can now be asked a question that
design review cannot answer: *could this be built by the system it belongs to?* If not, the
abstraction is wrong, or the boundary is in the wrong place. That question is sharper than
"is this a good design" and it does not depend on taste.

### 2.1 The completion condition

DarkFactory is what it claims to be when a change to DarkFactory is proposed, interpreted,
planned, implemented, reviewed, verified and merged **by DarkFactory**, with humans approving
rather than authoring.

That is measurable, and almost nothing satisfies it today. It is also the most useful
acceptance criterion in the whole system, because unlike "is the pipeline green" it cannot be
met by writing more code in the same style.

## 3. The interpreter is a forge for declarations

The systems layer needs an interpreter, and the instinct is to bind one — TypeScript via Bun,
say. That is half right, and the half that is wrong matters more.

**An interpreter is a `forge` for declarations.** Small vocabulary, several backends, chosen by
the declaration. This is the same shape as §4 applied to language rather than version control,
and it is what makes two otherwise awkward requirements into one mechanism:

- DarkFactory's own systems layer is TypeScript, so `.df` is TypeScript with a framework
  standard library. Every editor, language server and `@types` package works unchanged.
- A system DarkFactory governs may be declared in **its own** language, because a mature
  system usually already has one — Nix modules get typed options, merge semantics,
  `mkDefault`/`mkForce`, imports and nixpkgs for free rather than by owning a language.

A single interpreter subsystem with a backend per declaration language serves both. A
TypeScript-only systems layer could not govern anything declared in a language we did not
choose, and would make "universal" aspirational — see §5.

## 4. Bind, never reimplement

DarkFactory is a kernel over systems that already exist and are better than ours. The `forge`
abstraction is the worked example. Version control is `git`, `gh`, `forgejo`, `gitlab`, or a
bare local directory. We implement none of them. We implement the *seam*:

```
forge.snapshot:   <target>              what the tree looks like now
forge.stage:      <target, paths, msg>  the only way to change a tree
forge.publish:    <target, ref>         the only way to move a ref
```

What we own is that those verbs mean the same thing on every backend, compose with everything
else, and can be named in a declaration without a conditional. The same discipline binds
toolchains to Nix and agent capabilities to Cordis service rows — an id, a package, a config
object, an optional `isolate` realm — rather than a hard-coded tool list. Nothing in the
framework knows what `gh` is; it knows what a *forge* is. §3 is the same idea for language.

**Every line we write to replace a mature tool is a line worse than what it replaces, and one
we maintain forever.** DF-RULE-017 already forbids duplicate implementations and unreachable
code; this applies the discipline to whole categories of software.

## 5. Remove the friction, do not merely support both

Repositories and machines are not two modes. The requirement is not that DarkFactory *supports*
both — it is that **the boundary stops being a place where the system degrades.**

A capability behaves identically whether invoked in a working tree, on a desktop, or in CI. A
declaration means the same thing in a repository and on a host. There are no per-location
special cases, because each one is a place the abstraction has leaked.

This is materially harder than a support matrix, and the difference is worth stating: a matrix
lets you enumerate what works where, and every row is a promise to maintain. Removing the
friction means **one semantic model with no location-dependent behaviour**, which is a
constraint on the design rather than a feature to be added.

It is also what the system is for. A repository-scoped DarkFactory could *configure* a
machine; a machine-spanning one has to *run* it. The second is what "universal" has to mean if
the word is to mean anything, and it is why a machine-scoped consumer is a first-class fleet
member rather than a separate kind of target.

## 6. AI-first: a next-generation harness

Every repository since 2023 has an agent attached. AI-first is only a real architectural
position if something is true of the system that would be false without an agent. Five claims,
each checkable:

1. **The agent is a first-class operator, not a tool consumer.** Same `forge`, same
   capabilities, same declarations as a human or the CLI. There is no privileged agent API.

2. **Capabilities are presented, not fixed.** A session mounts a preset and receives its own
   catalogue — Cordis's `isolate` realm already does this, giving one agent its own view while
   the host registry stays shared. An agent's capability set is assembled, not compiled in.

3. **The system is designed around an agent reading and writing its own declarations.** So
   declarations must be legible to a model, diffable, and repairable by an agent without human
   intervention. That is a real constraint on syntax and diagnostics, and it is a large part of
   why `.df` is TypeScript rather than a new notation: the model already reads it.

4. **Agent mutations are staged and reversible.** An agent operating at machine scope needs
   undo, or autonomy and safety are permanently in tension. This is why an applied
   declaration produces a *generation* — a parent, a diff and an author — rather than a
   mutation: audit without undo records damage already done, and undo without audit is an
   approval with no history. They are one invariant, not two features.

5. **Completion is observed, not asserted.** Effects are idempotent and externally checkable,
   so "done" is a fact about the world. The PRD's "truthful" property is the AI-first one.

**The test:** *if the agent were removed, would the system still be complete?* If yes, this is
a system with an agent attached. If no, something is missing that only an agent needs — and
that something is the design.

### 6.1 What the harness is actually for

The five claims describe a position. This is the purpose behind it.

**The user does not interact with an agent, and never has to name one.** They use df. The
agent is infrastructure, in the same way a database engine is infrastructure: it is load-bearing,
it is chosen and swapped underneath, and it is not something a person is asked to think about
when they describe what they want done.

This is the sense in which the harness is *next-generation*, and it is a real property rather
than a slogan because it has a testable consequence: **no user-facing surface names, selects,
configures or reports an agent.** Not the CLI, not the declaration, not the web surface, not
an error message. When an agent is missing, credentialed badly, or exhausted, the user is told
what happened in the system's own terms and what will be tried next — never "install this CLI"
or "that provider returned 401".

Consequences that follow, and which are design constraints rather than features:

- **Which agent runs is a resolution result, not an input.** df decides, from declarations and
  observed availability. A user who wants a different model route writes a route; they do not
  write a harness chain.
- **The agent set can change without a user noticing or caring.** Adding, removing or upgrading
  an agent backend is a df-internal change. The corollary is that it must not be able to change
  what the system *does* — if a new backend behaves differently, that is a bug in the backend,
  not a new user-visible configuration surface.
- **The work is expressed in the system's terms, not the agent's.** Capabilities,
  declarations, effects and checks. The agent is one interpreter of that expression, which is
  what lets a delivery be reasoned about, diffed, reviewed, resumed, and re-run by a different
  agent without being rewritten. A pipeline expressed as a sequence of prompts cannot do that,
  because the prompts are the agent's interface and the agent's interface changes.

**The scope is anything, not only software engineering.** A system built to express "act on a
system through a declared interface" has no domain built into it. Repository work is the first
application, not the definition. A declaration can equally describe a machine, a fleet, or a
domain with no relationship to either, and the mechanism should not notice the difference. If
the system can only ever do what its first application did, it is a tool that grew a pipeline,
not a harness.

**And it is the same system a human surface will read.** A later interface is a renderer over
the same declarations, the same capability catalogue and the same effect log — not a second
frontend with its own model of the world. Two things follow from that, and both are cheap to
get right and expensive to retrofit: every object needs a stable identity so a human and an
agent can refer to the same thing, and the settings surface is generated from the same option
schema the agent reads, so the two cannot drift. This is why the declaration is the
authoritative surface rather than a configuration convenience — it is the one thing both a model
and a person are forced to go through.

## 7. Declarable by nature

**Anything config-shaped in nature must be declarable rather than coded.** If a competent
operator could reasonably want to vary it without reading our source, it is data. If only
someone who has read the implementation could want it, it is code and should be code.

This is largely shipped, not aspirational: PRD §5 already requires project-specific behaviour to
arrive as capabilities rather than core changes, and `harness/assets/graph.darkfactory.json` is
already a 17-node declared graph with edges, events and required checks. What this adds is the
*reach* — the test above — and the discipline that **every resolution layer is inspectable**,
because "the user overrode the default" and "the default is this" are different facts, and an
operator debugging a surprise needs the difference.

## 8. Works with the repository in front of you

DarkFactory must work on a repository it did not create, without requiring that repository to be
reorganised to be understood.

Conventional formats are **inputs**. A `package.json` declaring `bun test` and `biome lint .` is
a repository whose quality actions are already declared, in its own vocabulary. A
`pyproject.toml` declaring `pytest` and `black` is the same fact in another.
`.github/workflows/*.yml` is a pipeline described in a format we did not invent.

Framed carefully, because DF-RULE-017 forbids fallback and alias layers: a repository's own
`package.json` is an **external supported contract explicitly required by the PRD**, so reading
it is required behaviour, not a compatibility shim. And a repository with no DarkFactory
configuration is not degraded — that is the normal case, and the one that must never regress.
Our configuration is an *addition* to what a repository already says; where both speak, ours
wins for what we own and theirs wins for everything else.

## 9. One file per function, named for the feature

A file implements one capability and is named for that capability. The naming rule is the part
that matters: **the name states the feature, not the code.** `createWorktree.ts` is named for
what it does for a caller. If the mechanism changes — a better library, a swapped
implementation — the file does not rename, because the feature did not change.

**A file that cannot be named has not been understood yet.** `utils`, `helpers`, `common` and
`manager` are not categories of code; they are the absence of a decision about what a piece of
code is for. This is a rule, not a preference, and the check is filed.

**It applies everywhere, without exception.** The harness not meeting the standard is not a
reason the standard does not apply to the harness. A standard that holds for `capabilities/`
and is quietly waived for `harness/` is not a standard; it is a preference with a compliance
team. Where a violation exists, the violation is the work.

One consequence deserves care, because it is easy to get backwards: because composition is
discovery-based (§10), a rename is *not* automatically breaking, since nothing imports by
path. The discipline is the naming one — the name must survive the mechanism changing — not an
appeal to path-based API stability.

## 10. No indices; everything composes dynamically

**No `index.ts` barrels.** Nothing is registered by being listed in a file a human has to
remember to edit. The tree has six today, and each is a place where a new capability is
invisible until someone adds a line: a second source of truth to be kept in sync with the
filesystem, and the day it is not, something is silently missing.

Composition is therefore **discovery-based**: capability is found by what a directory contains
and what its files declare. Adding a function makes it available; nothing else changes. This is
also what makes §2.1 reachable — a system that maintains itself needs to *find* its own
capabilities without a registry it has to keep editing.

The obvious tension is that dynamic composition costs compile-time knowledge of what exists. The
resolution: **composition is dynamic; typing is not.** Each file is statically typed in full.
What is discovered is the *set* of capabilities, and an unknown name fails at load with a real
error — not at build because a barrel was not updated.

## 11. The systems layer: `.df`

`.df` is TypeScript with a framework-provided standard library, and it means exactly one thing:
*this file participates in system composition*.

**We invent no syntax.** If a construct cannot be expressed in TypeScript, it does not go in
`.df`. The only additions are the extension and the loader, and `tsc` remains the type system —
so every editor, language server, `@types` package and published library works unchanged.

The property this buys is the migration story: **a capability starts life as ordinary
TypeScript and joins the system by being renamed, not rewritten.** An experiment that does not
work is a deleted file rather than a reverted design, and nothing is committed to the system
until it has survived being ordinary code.

The obvious objection is well-founded, and a mature system with an existing language is right
to keep it: owning a language means owning a parser, a type system, an error-reporting story
and a compiler "to arrive where an existing module system already is." §3 is why that does not
apply here: for what DarkFactory **authors** we may choose the dialect, and for what it
**binds** we do not and must not. We are not replacing a mature system's language; we are
making it reachable.

## 12. How to tell if this is wrong

A thesis that cannot be falsified is a mood. These would sink it:

- **The interpreter hardens into a wall.** If the systems layer can only be written the way
  the first version of the loader expected, §2 is aspiration: not a foreign core but a frozen
  one, which is the same failure wearing a friendlier shape.
- **The abstractions cannot build the system.** If `forge` and the capability model are
  insufficient construction material, self-hosting is a slogan.
- **The friction cannot be removed.** If machine and repository remain two modes with
  location-dependent behaviour, §5 is a support matrix wearing a universal's vocabulary.
- **A user-facing surface names or selects an agent.** Then the abstraction has leaked, whatever the
  internals do. This is the check for §6.1 and it is a grep, not a judgement call.
- **Dynamic composition proves unaffordable.** If capability sets cannot be resolved reliably
  at load, or the errors are worse than the barrels they removed, §10 is wrong.
- **Binding costs more than owning.** If the seam is measurably worse than calling `git`
  directly — latency, error fidelity, capability — we should own more organs.

## 13. Relationship to the paper

Unrelated. `paper/index.typ` and everything scholarly about it is a consumer of this system, not
a part of it (DF-RULE-020). A thesis that cannot be separated from its first application is a
specification. This one is a direction, and it is allowed to outlive whatever prompted it.

## Provenance

Synthesised from an earlier machine-scope scoping exercise that was never built and that
DarkFactory supersedes: its *kernel* doctrine (bind existing services rather than reimplement
them), its one-declaration/one-modification-surface/one-audit-trail structure, its generations
model, and its decision to keep a mature system's own language rather than replace it. Those
are inputs to the thinking here, not components of this system and not dependencies of it.

Also informed by the Cordis service-row composition already used in the dsh profiles, and by
the one-file-per-function tendency already present in `harness/src/`.

The one place this document departs from its sources is deliberate and marked where it occurs:
§2 and §11 argue that owning `.df` is not the same decision as owning a declaration language,
because DarkFactory authors its own systems layer and binds everyone else's.
