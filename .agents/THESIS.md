# DarkFactory

A thesis, not a specification. It states a position, the reasoning behind it, and the ways it
could be wrong. It is not the requirements document — `.agents/PRD.md` is, and the file tree it
specifies lives there in §4. Where the two disagree, the PRD is right and this document is
wrong. Nothing here describes what exists; everything here describes what is being designed.

## 1. The claim

DarkFactory is a semantic layer over systems that already exist. You describe what a system
*means* — its capabilities, its bindings, its shape — and the system reads that description and
acts on it. There is no separate build description, no adapter per surface, and no second place
where any of it is written down.

### 1.1 The moat

**There is exactly one place meaning can live, and the system reads it from there.**

That is the whole moat. A capability's interface is read from the capability — its names, its
signatures, its folder, its doc comments — and never written beside it. Everything else follows
from that rather than adding to it. The interface cannot drift, because there is nothing to drift
from. Surfaces are nearly free, because after derivation there is nothing left to write per
surface. Self-healing works, because intent is derived instead of recorded twice. Compilation is
release, because a version is part of what was resolved.

It is a moat rather than a principle because of what it does to the *next* unit of work. A system
that writes meaning twice — a schema, a manifest, a config layer, a docs site, an adapter per
surface, a build description — pays for every one of those places forever, and the bill arrives
as drift, because two things existing is the normal condition and drift is the default outcome
rather than a failure anyone guards against. Here one place is the correct number, the *N+1*th
capability is cheaper than the *N*th, and the corpus of meaning grows without anyone maintaining
it by hand. A system that begins with no corpus has every one of those second places still to
invent, and will keep inventing them.

**The falsifier.** Count the sites where meaning is authored rather than derived. The moat's
strength is inversely proportional to that count, and the target is zero. The count is the only
honest scoreboard, and it is what separates a thesis that is load-bearing from one that is
decoration. §2 states the properties that count is made of, each with the check that catches its
violation, and §12 holds the other half — the failures a count cannot see.

**How it fails.** A constraint with no teeth is abandoned under pressure, and the pressure is
always a deadline. The fastest path to a shipped capability is a hand-authored manifest, an added
index, a surface special case; it works, it ships, and the count never returns to zero. So the
counter is not documentation, it is latency: **derivation must be faster than authoring.** Not
more correct — faster. If writing the manifest takes an afternoon and deriving it takes a week,
this is a preference, and a preference does not survive a deadline. A change that needs new
authored meaning is a change that has not been designed yet; when someone reaches for a manifest,
the right response is to find what the interpreter is missing, not to add the manifest.

## 2. The invariants

Properties rather than features, each paired with the thing that catches its violation. A property
with no check is an aspiration, so each names its enforcement. Every one of these is a statement
about the finished system, and each is checkable.

| # | invariant | held by |
| --- | --- | --- |
| I1 | No file describes a feature except the feature | enumeration-only files are rejected; no barrel, registry, catalogue or manifest names what exists |
| I2 | Derivation is total — every feature is derived, with none dropped | a tree walk comparing the derived set against the discovered set, across overloads, re-exports and conditionals |
| I3 | The published interface is the code's own | a feature with no doc comment is an error, not a blank; surfaces render the derived comment |
| I4 | Effects pass through a seam | a check rejecting direct filesystem, network and process access outside the seams |
| I5 | Nothing is published that was not compiled from a resolution | every artifact carries its resolution identity, verified before publish |
| I6 | Discovery is structural only | a test that adding a feature requires editing no other file |
| I7 | Drift is measured against derivation | convergence accepts only derived inputs, never a recorded copy of intent |
| I8 | The system is a fixed point | self-hosting acceptance: compiling the system with itself yields the same resolution |
| I9 | Presentation holds no behaviour | a surface cannot be imported by a non-surface |

I4 is the one everything above it depends on. While effects can bypass a seam, the seams are
documentation rather than boundaries, and nothing resting on them can be enforced or relied upon.

## 3. Interpretation is the whole of the mechanism

The system has one mechanism: it reads meaning out of structure. Everything a user builds, they
build by putting structure in front of it. There is no second mechanism per scale — a function, a
file, a repository, a pipeline, a machine and a fleet are all shapes the same reading resolves,
and a design that needs a separate story for each of them is a design that will not finish.

Reading is *derived*, never authored. The interpreter produces a feature's interface from its
name, its signature, its position in the tree, and its documentation, and publishes that to every
surface. The consequence that matters most is not elegance but arithmetic: after derivation,
there is nothing left to write per surface, so a new surface is a renderer rather than a set of
adapters, and a new capability is reachable everywhere without anyone remembering to add it
anywhere.

### 3.1 One askable feature is one file

A file is the unit a caller can request on its own. Not one step inside a larger operation, and
not an abstraction grouping several requests — the two mistakes are mirror images and the test
distinguishes them. `Snapshot`, `Stage` and `Publish` are one file each, because a caller can
ask for a snapshot without wanting a publish. `StoreCredential` and `RedactSecret` are one file
each, because a caller can want one without the other.

The alternative — one file per subsystem, containing the operations of that subsystem — is what
produces files nobody can name and folders nobody can describe. It concentrates several askable
things in one place on the theory that they belong together, and belonging together is not a
reason to share a file. What belongs together is a folder, whose name says what the group is
*for*.

## 4. Bind, never reimplement

DarkFactory is a kernel over systems that are better than ours. We implement the seam and none of
the organs. Version control is `git`, `gh`, `forgejo`, `gitlab` or a bare directory; the browser
is a system webview; toolchains are Nix; composable services are Cordis rows. We own that those
mean the same thing on every backend, compose with everything else, and can be named in a
declaration without a conditional.

```
ReadState:   <target>                 what is true out there
Snapshot:    <target>                 freeze a point in the world
Stage:       <target, paths, msg>     the only way to change a tree
Publish:     <target, ref>            the only way to move a ref
OpenChange:  <target, ref, title>     the only way to request review
Identify:    <who>                    who is acting
```

**Every line written to replace a mature tool is a line worse than what it replaces, and one
maintained forever.** The falsifier is empirical: if a seam is measurably worse than calling the
tool directly — in latency, error fidelity, or capability — then the seam was wrong and we should
own more organs. That is a measurement to take, not a preference to defend.

### 4.1 The interpreter is the same seam applied to language

The instinct on reaching for an interpreter is to bind one, TypeScript via Bun say. That is half
right, and the half that is wrong matters more: **an interpreter is a forge for declarations.**
A small vocabulary, several backends, and a declaration that names one. It is §4's shape applied
to language rather than to version control, and recognising it resolves two awkward requirements
at once.

DarkFactory's own systems layer is TypeScript, so `.df` is TypeScript with a framework-provided
standard library and every editor, language server and `@types` package works unchanged. A system
DarkFactory *governs* may be declared in **its own** language, because a mature system usually
has one: Nix modules get typed options, merge semantics, `mkDefault`/`mkForce` and nixpkgs for
free rather than by our owning a language for them. One interpreter subsystem with a backend per
declaration language serves both. A TypeScript-only systems layer could not govern anything
declared in a language we did not choose, and would make "universal" aspirational.

## 5. Remove the friction, do not merely support both

Repositories and machines are not two modes. The requirement is not that the system *supports*
both but that **the boundary stops being a place where the system degrades.** A capability behaves
identically in a working tree, on a desktop, and in CI. A declaration means the same thing in a
repository and on a host. There are no per-location special cases, because each one is a place
the abstraction has leaked.

This is materially harder than a support matrix, and the difference is the point: a matrix lets
you enumerate what works where, and every row is a promise to maintain. Removing the friction
means one semantic model with no location-dependent behaviour, which is a constraint on the
design rather than a feature to add. It is also what the system is *for*. A repository-scoped
DarkFactory could configure a machine; a machine-spanning one has to run it, and the second is
what "universal" has to mean for the word to mean anything.

The system must equally work on a repository it did not create, without that repository being
reorganised to be understood. Conventional formats are *inputs*: a `package.json` declaring
`bun test` and `biome lint .` is a repository whose quality actions are already declared, in its
own vocabulary. A repository with no DarkFactory configuration is not degraded — that is the
normal case, and the one that must never regress. Our configuration is an addition to what a
repository already says; where both speak, ours wins for what we own and theirs wins for
everything else.

## 6. AI-first: a next-generation harness

AI-first is only a real architectural position if something is true of the system that would be
false without an agent. Five claims, each checkable:

1. **The agent is a first-class operator, not a tool consumer.** Same seams, same capabilities,
   same declarations as a human or the CLI. There is no privileged agent interface.
2. **Capabilities are presented, not fixed.** A session mounts a preset and receives its own
   catalogue — Cordis's `isolate` realm already does this, giving one agent its own view while
   the host registry stays shared.
3. **The system is designed around an agent reading and writing its own declarations.** So
   declarations must be legible to a model, diffable, and repairable without human intervention.
   That constrains syntax and diagnostics, and it is a large part of why the systems layer is
   TypeScript rather than a new notation: the model already reads it.
4. **Agent mutations are staged and reversible.** An agent operating at machine scope needs undo,
   or autonomy and safety are permanently in tension. An applied declaration therefore produces a
   *generation* — a parent, a diff and an author — rather than a mutation. Audit without undo
   records damage already done; undo without audit is an approval with no history. They are one
   invariant, not two features.
5. **Completion is observed, not asserted.** Effects are idempotent and externally checkable, so
   "done" is a fact about the world rather than a claim by the thing that did it.

**The test:** *if the agent were removed, would the system still be complete?* If yes, this is a
system with an agent attached. If no, something is missing that only an agent needs — and that
something is the design.

### 6.1 What the harness is actually for

**The user does not interact with an agent, and never has to name one.** They use the system. The
agent is infrastructure in the way a database engine is infrastructure: load-bearing, chosen and
swapped underneath, and not something a person is asked to think about when describing what they
want done. The testable consequence is that **no user-facing surface names, selects, configures
or reports an agent** — not the CLI, not a declaration, not the rendered interface, not an error
message. When an agent is missing, badly credentialed or exhausted, the user is told what happened
in the system's own terms and what will be tried next, never "install this CLI" or "that provider
returned 401".

Which agent runs is a resolution result rather than an input; the agent set can change without a
user noticing, and if a new backend behaves differently that is a bug in the backend rather than a
new configuration surface. The work is expressed in the system's terms — capabilities,
declarations, effects, checks — so a delivery can be reasoned about, diffed, reviewed, resumed
and re-run by a different agent without being rewritten. A pipeline expressed as a sequence of
prompts cannot do that, because the prompts are the agent's interface and the agent's interface
changes.

**The scope is anything, not only software engineering.** A system built to express "act on a
system through a declared interface" has no domain built into it. Repository work is the first
application, not the definition. If the system can only ever do what its first application did, it
is a tool that grew a pipeline rather than a harness.

And it is the same system a human surface reads. A later interface is a renderer over the same
declarations, the same capability catalogue and the same effect log — not a second frontend with
its own model of the world. Two things follow, both cheap to get right and expensive to retrofit:
every object needs a stable identity so a human and an agent can refer to the same thing, and the
settings surface is generated from the same option schema the agent reads, so the two cannot
drift. This is why the declaration is the authoritative surface rather than a convenience — it is
the one thing a model and a person are both forced through.

### 6.2 Why execution is separate from reading

Reading and executing are separated, and it is worth being explicit about why, because the
separation is what keeps the common operation cheap.

- **Reading must be runnable where no agent exists.** Resolving a declaration to show what a
  system *would* do, rendering it for a human, or validating it in CI needs no model, no
  credentials and no network. If execution were inside reading, all of that would inherit
  execution's dependencies and the most common operation in the system would become the most
  demanding one.
- **Execution is the trust boundary.** It holds credential access and acts on model output.
  Keeping it separate keeps the rest auditable, sandboxable and reason-about-able without
  carrying the property that most needs auditing.
- **They have incompatible test shapes.** Reading is pure resolution and wants no I/O; execution
  is I/O-heavy and wants fault injection. Merged, both get worse tests.

But execution is **integral**, and that is the part that matters: it is not discovered, it is
*guaranteed*. The system has a reserved identity for it, the way it has a reserved identity for
reading itself. A system that resolved execution the way it resolves a capability could be
assembled without one, and that is exactly the configuration this design exists to make
impossible.

## 7. Self-heal: convergence, not reversion

Self-healing is easy to get dangerously wrong, so the boundary needs stating precisely.

**Healing goes one way.** The declaration is the intent. The system observes what is actually
true, compares, and converges the world toward what was meant. Drift is corrected.

**Changing the declaration is not drift.** A human editing a declaration has changed the intent,
and that is a legitimate mutation through the ordinary governed path — not something to be healed
back. Without this distinction a system that heals silently reverts every deliberate change a
person makes, and a system that does that is worse than one that never heals at all.

**Bounded by what can be attributed.** The system repairs drift it can attribute to itself and
surfaces drift it cannot. A file it did not write, in a place it does not own, is reported rather
than corrected. The ability to change state is not the ability to decide what the state should
be, and conflating them is how an autonomous system destroys work.

**Healing is idempotent and observable.** Converging twice is a no-op, and every convergence
records what it changed and why. A healer that cannot be audited is indistinguishable from a
corruption.

The payoff is that drift stops being something you discover. Installation, update, reconfiguration
after a capability changes, recovery from a partially-applied change, and a consumer whose
upstream moved are one operation: observe, compare, converge.

This is not a new programme, and presenting it as one would be the mistake. A pipeline that
detects drift from a declaration, plans the difference, applies it under approval and verifies
the result has always been a healer; naming it is bookkeeping rather than achievement. What is
genuinely missing is the engine that *writes* the code — and self-healing of source follows from
that engine rather than preceding it. One thing to build, not two: a system that can build code
can repair code, because repair is a build whose target is the thing that is wrong.

## 8. Self-building, and why it is a stronger claim

Self-hosting is that the system builds itself. Self-building is that it emits its own release
from the same reading that produced everything else.

The test is the second source of truth. If a separate hand-written pipeline described how to
assemble, bundle, sign and publish the system, then the system had two accounts of itself — what
the code says and what the build says — and self-hosting would be true only until they diverged.
The stronger claim is that there is no second account: compilation reads the system's meaning,
binds it to a version, and emits every surface form at that version. A version is not a label
applied at the end; it is part of what compilation resolved.

This is the same moat applied to distribution. If the code is buildable by semantics, the
artifacts are too, and the surfaces a capability appears on are a consequence of what it means
rather than a list someone maintains.

The completion condition is a fixed point: **the system compiled by itself resolves to itself.**
Not approximately, and not after a maintenance pass — the same resolution, which is only possible
if there was never a second description to reconcile.

## 9. Declarable by nature

**Anything config-shaped in nature must be declarable rather than coded.** If a competent
operator could reasonably want to vary it without reading our source, it is data. If only someone
who has read the implementation could want it, it is code and should be code.

The discipline this adds is that **every resolution layer is inspectable**, because "the user
overrode the default" and "the default is this" are different facts, and an operator debugging a
surprise needs the difference.

## 10. Structure is the interface

**Names state features, not code.** `Stage` is named for what it does for a caller. If the
mechanism changes — a better library, a swapped implementation — the name does not change,
because the feature did not.

**A thing that cannot be named has not been understood yet.** `utils`, `helpers`, `common`,
`shared`, `manager` and `core` are not categories; they are the absence of a decision about what
a piece of the system is for. A file or folder that cannot be named is a feature that has not
been decided yet. This is a rule and not a preference, and it holds everywhere without exception
— a standard that holds for content and is quietly waived for the system's own machinery is not a
standard, it is a preference with a compliance team. Where a violation exists, the violation is
the work.

**Folders obey the same rule, one level up.** A folder is named for the concern it holds and
contains the files that implement it. Because resolution is structural, a folder's name *is* how
it enters the system.

**No barrels, registries, catalogues or manifests.** Nothing is registered by being listed in a
file a human has to remember to edit. Composition is discovery-based: a capability is found by
what a directory contains and what its files declare. Adding a file makes it available and
nothing else changes. There is no manifest to regenerate, no import to add, and no second source
of truth to fall out of step — and so no class of change that can silently fail to take effect.

The tension is that dynamic composition costs compile-time knowledge of what exists. The
resolution is that **composition is dynamic; typing is not.** Each file is statically typed in
full. What is discovered is the *set* of features, and an unknown name fails at load with a real
error rather than at build because a barrel was not updated.

**The tree is the interface.** Assembling a system is a file operation: drop a folder in and its
feature exists; take it out and the feature is gone, with nothing to unregister. Reshaping a
system — a feature split across two folders, two folders merged into one, a feature added for a
single consumer — is the same operation. The legibility this gives is not a documentation
nicety; it is the mechanism.

## 11. The systems layer: `.df`

`.df` is TypeScript with a framework-provided standard library, and it means exactly one thing:
*this file participates in system composition*.

**We invent no syntax.** If a construct cannot be expressed in TypeScript it does not go in
`.df`; the only additions are the extension and the loader, and `tsc` remains the type system, so
every editor, language server and published library works unchanged. The property this buys is
the migration story: **a feature starts life as ordinary TypeScript and joins the system by being
renamed, not rewritten.** An experiment that does not work is a deleted file rather than a
reverted design, and nothing joins until it has survived being ordinary code.

The objection is well-founded and a mature system with an existing language is right to keep it:
owning a language means owning a parser, a type system, an error story and a compiler "to arrive
where an existing module system already is." §4.1 is why that does not apply. For what
DarkFactory **authors** we choose the dialect; for what it **binds** we do not and must not. We
are not replacing a mature system's language, we are making it reachable.

## 12. How to tell if this is wrong

A thesis that cannot be falsified is a mood. §1.1 gives the countable half — the number of sites
where meaning is authored. These are the failures a count cannot see:

- **Reading hardens into a wall.** If the systems layer can only be written the way the first
  loader expected, the design is a frozen one rather than a forge, which is the same failure
  wearing a friendlier shape.
- **The seams are insufficient construction material.** If binding existing systems cannot express
  the system being built, self-hosting is a slogan.
- **The friction cannot be removed.** If machine and repository remain two modes with
  location-dependent behaviour, §5 is a support matrix wearing a universal's vocabulary.
- **A user-facing surface names or selects an agent.** Then the abstraction has leaked, whatever
  the internals do. This is the check for §6.1 and it is a grep, not a judgement call.
- **Dynamic composition proves unaffordable.** If feature sets cannot be resolved reliably at
  load, or the errors are worse than the barrels they removed, §10 is wrong.
- **Binding costs more than owning.** If a seam is measurably worse than calling the tool
  directly, §4 was wrong about where the line sits.

## 13. Relationship to the paper

Unrelated. The paper and everything scholarly about it is a consumer of this system, not a part
of it. A thesis that cannot be separated from its first application is a specification. This one
is a direction, and it is allowed to outlive whatever prompted it.

## Provenance

Synthesised from an earlier machine-scope scoping exercise that was never built and that
DarkFactory supersedes: its kernel doctrine of binding existing services rather than reimplementing
them, its one-declaration/one-modification-surface/one-audit-trail structure, its generations
model, and its decision to keep a mature system's own language rather than replace it. Those are
inputs to the thinking here, not components of this system and not dependencies of it.

Also informed by the Cordis service-row composition used in the dsh profiles.

The one place this document departs from its sources is deliberate and marked where it occurs:
§4.1 and §11 argue that owning `.df` is not the same decision as owning a declaration language,
because DarkFactory authors its own systems layer and binds everyone else's.
