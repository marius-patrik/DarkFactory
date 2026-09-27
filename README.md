# DarkFactory

**Status: NORMATIVE. This document is the single source of truth for the project.**

# Contents

**Part I — Orientation**

- [2 Goal](#2-goal)
- [3 The shape](#3-the-shape)
  - [3.1 Three unifiers](#31-three-unifiers)
  - [3.2 Five operations](#32-five-operations)
  - [3.3 Why five is the right number](#33-why-five-is-the-right-number)
  - [3.4 Guarantees nest, which is what makes it portable](#34-guarantees-nest-which-is-what-makes-it-portable)
  - [3.5 What the structure is not](#35-what-the-structure-is-not)
- [1 Introduction](#1-introduction)
- [4 Methodology](#4-methodology)
  - [4.1 Compose; bind only where it is cheaper](#41-compose-bind-only-where-it-is-cheaper)
  - [4.2 One site of meaning](#42-one-site-of-meaning)
  - [4.3 Derive, do not author](#43-derive-do-not-author)
  - [4.4 One askable thing is one file](#44-one-askable-thing-is-one-file)
  - [4.5 Converge, do not revert](#45-converge-do-not-revert)
  - [4.6 Be faster, not merely correct](#46-be-faster-not-merely-correct)
- [5 The moat](#5-the-moat)
  - [5.1 What follows from it](#51-what-follows-from-it)
  - [5.2 Why a constraint is a moat](#52-why-a-constraint-is-a-moat)
  - [5.3 The falsifier, and how the moat fails](#53-the-falsifier-and-how-the-moat-fails)

**Part II — The design**

- [6 DarkFactory as an architectural pattern](#6-darkfactory-as-an-architectural-pattern)
  - [6.1 Context and problem](#61-context-and-problem)
  - [6.2 Forces](#62-forces)
  - [6.3 Shape](#63-shape)
  - [6.4 Consequences](#64-consequences)
  - [6.5 Where it does not apply](#65-where-it-does-not-apply)
- [7 DarkFactory as an engineering practice](#7-darkfactory-as-an-engineering-practice)
  - [7.1 Derive, never author](#71-derive-never-author)
  - [7.2 Declare, then converge](#72-declare-then-converge)
  - [7.3 Converge, never revert](#73-converge-never-revert)
  - [7.4 Bind, never own](#74-bind-never-own)
  - [7.5 One askable thing, one file](#75-one-askable-thing-one-file)
  - [7.6 Prove with invariants, not prose](#76-prove-with-invariants-not-prose)
  - [7.7 The system maintains itself through the ordinary path](#77-the-system-maintains-itself-through-the-ordinary-path)
  - [7.8 How the two halves relate](#78-how-the-two-halves-relate)
- [8 Invariants](#8-invariants)
- [9 Architecture](#9-architecture)
  - [9.1 Structure is the declaration](#91-structure-is-the-declaration)
  - [9.2 Declaration and implementation are separate files](#92-declaration-and-implementation-are-separate-files)
  - [9.3 The tree](#93-the-tree)
  - [9.4 Identity is not scoped to a caller](#94-identity-is-not-scoped-to-a-caller)
  - [9.5 Rules the structure must satisfy](#95-rules-the-structure-must-satisfy)
- [10 Interpretation](#10-interpretation)
  - [10.1 One askable feature is one file](#101-one-askable-feature-is-one-file)
- [11 Compose, and bind only where it is cheaper](#11-compose-and-bind-only-where-it-is-cheaper)
  - [11.1 The interpreter is the same seam applied to language](#111-the-interpreter-is-the-same-seam-applied-to-language)
- [12 Remove the friction](#12-remove-the-friction)
- [13 AI-first](#13-ai-first)
  - [13.1 What the harness is actually for](#131-what-the-harness-is-actually-for)
  - [13.2 Why execution is separate from reading](#132-why-execution-is-separate-from-reading)
- [14 Self-heal: convergence, not reversion](#14-self-heal-convergence-not-reversion)
- [15 Self-building, and why it is a stronger claim](#15-self-building-and-why-it-is-a-stronger-claim)
- [16 Declarable by nature](#16-declarable-by-nature)
- [17 Structure is the interface](#17-structure-is-the-interface)
- [18 The systems layer: `.df`](#18-the-systems-layer-df)

**Part III — Requirements**

- [19 Authority](#19-authority)
- [20 The product](#20-the-product)
- [21 Actors](#21-actors)
- [22 Capability architecture](#22-capability-architecture)
- [23 Domains, ecosystems and project detection](#23-domains-ecosystems-and-project-detection)
- [24 Configuration and state](#24-configuration-and-state)
  - [24.1 Configuration](#241-configuration)
  - [24.2 Documentation configuration and output](#242-documentation-configuration-and-output)
  - [24.3 State](#243-state)
- [25 Governed Request lifecycle](#25-governed-request-lifecycle)
- [26 Runtime, routing and resilience](#26-runtime-routing-and-resilience)
- [27 Change and governance](#27-change-and-governance)
- [28 Identity](#28-identity)
- [29 Human authentication](#29-human-authentication)
- [30 Documentation](#30-documentation)
- [31 Renderer](#31-renderer)
- [32 Terminal](#32-terminal)
- [33 Installation, release and versioning](#33-installation-release-and-versioning)
- [34 Consuming df](#34-consuming-df)
  - [34.1 One model across repositories and machines](#341-one-model-across-repositories-and-machines)
- [35 Security requirements](#35-security-requirements)
- [36 Final acceptance](#36-final-acceptance)
  - [36.1 Invariant acceptance](#361-invariant-acceptance)
  - [36.2 Self-hosting acceptance](#362-self-hosting-acceptance)

**Part IV — Governance**

- [37 The practices as obligations](#37-the-practices-as-obligations)
  - [37.1 DF-RULE-001 — Tests prove invariants](#371-df-rule-001--tests-prove-invariants)
  - [37.2 DF-RULE-002 — Inline documentation and generated documentation](#372-df-rule-002--inline-documentation-and-generated-documentation)
  - [37.3 DF-RULE-003 — Product requirements and decisions](#373-df-rule-003--product-requirements-and-decisions)
  - [37.4 DF-RULE-006 — Deterministic quality](#374-df-rule-006--deterministic-quality)
  - [37.5 DF-RULE-007 — Work intake and specification](#375-df-rule-007--work-intake-and-specification)
  - [37.6 DF-RULE-009 — Integration authority](#376-df-rule-009--integration-authority)
  - [37.7 DF-RULE-010 — Capability-driven agent runtime and resilience](#377-df-rule-010--capability-driven-agent-runtime-and-resilience)
  - [37.8 DF-RULE-011 — Security and secrets](#378-df-rule-011--security-and-secrets)
  - [37.9 DF-RULE-012 — Final architecture, DRY, and deletion](#379-df-rule-012--final-architecture-dry-and-deletion)
  - [37.10 DF-RULE-013 — Concurrency, atomicity, and idempotency](#3710-df-rule-013--concurrency-atomicity-and-idempotency)
- [38 Decision log](#38-decision-log)
- [39 Agent guidance](#39-agent-guidance)
- [40 How to tell if this is wrong](#40-how-to-tell-if-this-is-wrong)
- [41 Non-goals](#41-non-goals)
- [42 Related work](#42-related-work)
- [43 Terminology](#43-terminology)
- [44 Relationship to the paper](#44-relationship-to-the-paper)
- [45 Provenance](#45-provenance)

## Abstract

DarkFactory is a kernel over meaning. It reduces everything it touches to three things — a **normal form**, an
**address space**, and a set of **guaranteed seams** — and runs five operations over them: derive,
address, declare, converge, version. §3 states what those are; this document is about what they
imply. Five operations run over that structure and nothing lies beside them: derive structure into
meaning, address what exists, declare a difference, converge the world toward the declaration, and
version the result with a parent, a diff and an author.

None of this is new machinery, and that is the point. Because the normal form is derived rather
than authored, the same five operations apply to the system itself — which is what makes it
self-building rather than merely automated, and what makes a change to DarkFactory an ordinary
change rather than a special case. Self-healing is the same operations applied to drift, and free
surfaces are a consequence of the normal form rather than a feature. Every capability is a seam
with swappable implementations, and guarantees nest, so the system is as portable as its guarantees
and no more bound than they are. The claim is falsifiable by a count — the sites where meaning is
authored rather than derived, target zero — and it fails in one identifiable way, by becoming
slower than the alternative.

## Keywords

declarative system · derived interface · one site of meaning · semantic layer · convergence ·
seam · askable feature · structural discovery · fixed point · self-hosting · self-building ·
agent-first · credential proof · provenance

# Part I — Orientation

## 2 Goal

**The goal is a system that builds and repairs itself, and knows when it has.**

Concretely, the target state is a repository that is simultaneously the framework and a consumer
of it, such that:

- the system can read its own meaning and act on it without a second description of itself
  anywhere in the tree;
- compiling the system with itself yields the same resolution — a fixed point, byte-identical, with
  no maintenance pass between;
- a change to the system is proposed, interpreted, planned, implemented, reviewed, verified and
  merged by the system, with a human approving rather than authoring;
- every capability is reachable from every surface, and no surface holds behaviour a second
  surface would have to reimplement.

**The completion condition is a fixed point, not a milestone.** Self-hosting is not finished when
the system *can* build itself; it is finished when the system's output is indistinguishable from
its input, because at that point there is nothing left to reconcile. This is a stricter condition
than a demonstration, and it is the only version of the claim that cannot be satisfied
partially.

Three things are deliberately excluded from the goal, and §39 states them at length: reaching
general usefulness across arbitrary domains, matching the performance of a hand-tuned build for
any single workload, and being the system of record for a problem another system already solves
well.

## 3 The shape

Everything in this document follows from a structure small enough to state in full. DarkFactory
reduces anything it touches to three unifiers, and runs exactly five operations over them. There is
no sixth operation, and nothing in the system lies outside them.

### 3.1 Three unifiers

**One normal form.** Anything a system knows about itself is an *interface*: a name, its inputs,
its outputs, its documentation, and where it sits. An interface is never authored. It is derived
from the code that implements it, and the derived interface is the only description any part of the
system — human, agent, tool, or surface — ever reads. §5.3 is the procedure; §7.1 is the
mechanism.

**One address space.** Every feature, setting, file, task, capability, environment and version has
an address, and the address is the same whichever surface asks for it. Addressability is what a
surface navigates, what a command line takes as an argument, what an agent cites in a proposal, and
what a documentation link points at. This is what makes a human and an agent looking at the same
thing rather than looking at two renderings of it, and it is why navigation is a system control
over one history rather than a feature of each surface.

**Seams, guaranteed rather than discovered.** Where the system meets something it did not build —
version control, the browser, the runtime environment, isolation, identity custody, the compositor —
it owns a small vocabulary with several implementations, and a declaration names one. A seam is not
a suggestion: the system has a reserved identity for each one, because a system that resolved its
own seams could be assembled without them, and that is the configuration the design exists to make
impossible. §9 argues what the seam is for and what makes it worth having.

### 3.2 Five operations

|   | operation          | what it is                                                                                     |
| - | ------------------ | ---------------------------------------------------------------------------------------------- |
| 1 | **derive**   | structure becomes meaning — names, signatures, position and documentation become an interface |
| 2 | **address**  | meaning acquires a stable identity that survives moving, renaming and rebuilding               |
| 3 | **declare**  | a difference is stated between what is and what should be                                      |
| 4 | **converge** | the world is moved until the difference is closed, under approval                              |
| 5 | **version**  | the result is recorded with a parent, a diff and an author, and is itself addressable          |

A change is operations 3, 4 and 5. That is the whole lifecycle, and it is the same lifecycle
whether the change is a provider setting or the deletion of a subsystem.

### 3.3 Why five is the right number

Because **the same five apply to the system itself**, and nothing needs to be added for that to
hold. The system reads its own meaning, addresses its own nodes, declares differences against
itself, converges, and versions the result. Self-building is therefore not a subsystem, a code
path, or a special mode — it is these five operations pointed at the system's own tree, and the
completion condition is a fixed point: the version it produces resolves to the version it read.

This is the strongest available framing of self-hosting, because it makes it structural rather than
ambitious. A design that needed a *self-modification mechanism* would be admitting that its normal
path could not express "change me." Here it can, and a change to DarkFactory is an ordinary change
that happens to be proposed by the thing being changed. §13 is the claim; §38 is the failure.

The same argument makes two properties that are usually treated as features into statements about
the structure. **Self-healing** is operations 3 and 4 applied to drift, which is why convergence
is one-directional and why editing a declaration is not drift. **Free surfaces** are a consequence
of the normal form: after derivation there is nothing left to write per surface, so a surface is a
renderer rather than an adapter, and adding one costs a folder.

### 3.4 Guarantees nest, which is what makes it portable

A guarantee is a seam whose interior is another guarantee. The system claims a small number of
guarantees — the runtime is the declaration, composition is safe and teardownable, the world is
reachable, identity is provable, the interface is navigable — and each is implemented by a seam
whose own implementation may be a finer seam:

```
the runtime is the declaration
└── Environment/                     seam
    ├── nix/                         current binding: derived, hermetic
    │   └── container/               the isolation Nix needs
    │       └── engine/              docker · podman · containerd — the finest seam
    └── local/                       binding: the host as-is, and what that gives up
```

**Portability is a property of the depth, not of the top level.** A seam that bottoms out in one
hard-wired engine is not portable however good the level above it is, which is the test to apply
to every seam in the tree. This is also the answer to every "this tool does not understand us"
moment: a tool that cannot be configured for the system is a system to bind, not a system to fork,
and the surrounding system can host the binding precisely because it is built from recombinable
parts.

One consequence is a real tension rather than a free lunch. A fully portable system needs a binding
that works on a host with nothing installed, and such a binding delivers **less guarantee** — a
`local/` environment that derives nothing and isolates nothing. Choosing it is location-dependent
behaviour, which §10 forbids outright. The resolution is that **bindings declare their guarantee
level and the system never guesses**: a degraded binding is chosen by the declaration, which says
what was given up. Otherwise the same system runs everywhere and quietly means something different
in each place, which is the support matrix §10 names, arriving through the front door.

### 3.5 What the structure is not

Three things follow from the shape that are easy to assume and are not true of it.

It is **not a library of utilities**, and the absence of `utils` is the smallest instance of a
larger fact: every file answers to something a caller can ask for (§15).
It is **not a workflow engine for one domain**, because five operations over an address space have
no domain in them (§39).
And it is **not a promise of generality in place of a specification of behaviour.** Everything in
Part III is specific — this pipeline, these guarantees, these acceptance conditions — and the
generality is a consequence of the structure rather than a substitute for the work.

## 1 Introduction

Every system that describes a system writes that description at least twice.

A build system has a build file beside the source. A deployment system has a manifest beside the
artifact. An integration has a schema beside the implementation, an adapter beside the schema, and
a document beside all three. Each of those second places is a place where the system can be
described *differently from what it is*, and the difference is not a defect to be fixed — it is
the default condition, because two things existing is normal and drift is what happens when nobody
is guarding the gap.

The usual responses each fail in a different way, and it is worth being precise about how, because
the failures look like incompleteness and are not.

**Generate the second description.** This is the common answer: derive the manifest from the code,
so there is one authored place and one generated place. It removes the hand-maintained copy and
keeps the structural problem. A generated description is still a description, and it is still
falsifiable, and a consumer reading it is reading a claim about the system rather than the system.
Worse, the generator becomes a component that must be trusted to be current, which is a new
thing to be right about.

**Enforce agreement.** Add a check that the two descriptions match. This is what most
infrastructure actually does, and it is a reasonable engineering answer to a problem that should
not have been accepted. It converts a design flaw into a recurring tax: the check must be written,
must be correct, must run in every path that can change either side, and must fail in a way that
tells a human what to do about it. The system is now paying, forever, for a disagreement it could
have made impossible.

**Disallow the second description.** This is the rare answer. It requires that everything the
system needs to know be recoverable from the thing that already exists, which means the code has
to be legible as a description — and that is a much stronger requirement than it first appears,
because it demands that names, types, structure and documentation all carry meaning on purpose
rather than by accident.

DarkFactory takes the third answer, and the rest of this document is the argument for it, the
method by which each decision is settled, and the evidence that the constraint pays.

## 4 Methodology

The system is large and the constraint is unusual, so the more important question is not what was
decided but **how**. Every question that arises during design or implementation is settled by one
of six procedures. A proposal that cannot be settled by one of them is a proposal for something
the design has not yet absorbed, and the correct response is to change the design rather than to
admit the exception.

### 4.1 Compose; bind only where it is cheaper

Reach a mature system through a small vocabulary with several implementations, and a declaration
names one. Own the seam; never the organ.

The reason this is a procedure rather than a preference is that it is testable in two directions,
and only one of them is obvious. **Substitutability** asks whether a different implementation is
available and whether the current one is measurably worse than the best construction available —
not merely worse than the tool it wraps, because the alternatives are the tool, another binding,
and a composition of bindings. **Permeability** asks whether a caller can compose *around* the
seam at all, or whether the seam decides the arrangement. A seam can pass the first and fail the
second, and when it does it is a wall rather than a seam, and the response is to find what the
composition is being prevented from doing rather than to write our own organ.

Every line written to replace a mature tool is a line worse than what it replaces and one
maintained forever, so the seam is where the leverage is. But leverage is not the reason to
compose — recomposition is, and §9 is where that is argued.

The same procedure applies to language, which is why the interpreter is a seam and not a parser, and
to the browser, to toolchains, and to every tool in the build that does not yet understand the
system: a tool that cannot be configured for it is a system to bind, not a system to fork.

### 4.2 One site of meaning

**Never state twice what code states once.** Not approximately, and not with a check that the two
agree — a check is the admission that there are two.

The consequence is that a manifest, an index, a registry, a schema, a catalogue, a per-surface
adapter, a hand-written interface description and a hand-written build description are all the same
mistake, and none of them is available as a design. The count of such sites is the only honest
scoreboard the design has, and §5.3 says what makes it falsifiable rather than merely virtuous.

### 4.3 Derive, do not author

A feature's interface is *read* — from its names, its signatures, its position in the tree, and its
documentation — and never written beside it.

This is the procedure that does the most work and the one most often resisted, because authoring a
description is faster than reading one, and the difference between the two is invisible until they
disagree — at which point the cost is not the description but everything downstream of it. What
follows from the procedure is listed once, in §5.1; this section states only what the procedure
obliges you to do.

The requirement it places on the code is that documentation is normative. What a feature publishes
to every surface is its own doc comments, so a comment is part of the contract and a comment that
lies becomes a lie in every interface simultaneously.

### 4.4 One askable thing is one file

A file is the unit a caller can request on its own — not one step inside a larger operation, and not
an abstraction grouping several requests.

Those two errors are mirror images and the test separates them. Grouping by subsystem is the more
common failure because it looks tidy: it concentrates several askable things in one place on the
theory that they belong together. They may well belong together, but belonging together is a
folder's property, and a folder can say what the group is *for* while a file says what one thing
is. What a caller can ask for is the only granularity that makes a file independently testable,
independently droppable, and independently nameable.

### 4.5 Converge, do not revert

Healing is one-directional. A declaration is intent; the system observes reality, compares, and
converges the world toward what was meant.

Two boundaries make this safe, and §14 states both in full: **changing the declaration is not drift**,
and **attribution** bounds what may be repaired. A practice whose only content is that healing goes
one way would be unfalsifiable, so the boundaries belong to it as much as the direction does.

### 4.6 Be faster, not merely correct

The previous five procedures are disciplines, and disciplines are abandoned under pressure. The
pressure is always a deadline, and the fastest path to a shipped feature is a hand-authored
manifest.

So the procedures have a latency requirement attached: **deriving must be faster than authoring.**
Not more correct — faster. If the disciplined path takes a week and the undisciplined one takes an
afternoon, this is a preference and preferences do not survive contact with a release date. This is
the procedure that converts the other five from intentions into properties, and it is the one that
determines engineering priority, because it says the missing feature is almost always in the
interpreter.

## 5 The moat

**There is exactly one place meaning can live, and the system reads it from there.**

This is the claim the rest of the document defends and the only one that is load-bearing. It is a
constraint rather than a capability, and the difference is not semantic.

### 5.1 What follows from it

The interface cannot drift, because there is nothing to drift from. Surfaces are nearly free,
because after derivation there is nothing left to write per surface. Self-healing works, because
intent is derived rather than recorded twice. Self-building works, because the system emits itself
from the meaning it read. One semantic model spans machines, repositories and hosting types,
because location is not a thing the model can express and therefore not a thing it can special-case.
And the system is composable, because nothing about it is registered: a feature can be moved,
combined, or dropped without anything else being told, which is the property §9 argues is the
real reason to bind rather than own.

None of these are separate achievements. They are what a single constraint produces when it is
taken seriously and no exception is permitted, which is why the architecture in Part II is largely a
consequence rather than a set of choices.

### 5.2 Why a constraint is a moat

A moat is not a difficulty; it is a property that makes the next unit of work cheaper for you and
dearer for everyone else, and that compounds.

A system which writes meaning twice pays for every second place forever, and the bill arrives as
drift rather than as a line item. Here, one place is the correct number, the *N+1*th capability is
cheaper to add than the *N*th because nothing has to be registered or kept in sync, and the corpus
of meaning grows without anyone maintaining it by hand. A system beginning today has no corpus and
every one of those second places still to invent, and will keep inventing them as it grows.

That is the compounding part, and it is the part a competitor cannot buy: the corpus is the asset,
and it can only be accumulated by a system whose meaning is readable in the first place.

### 5.3 The falsifier, and how the moat fails

**Count the sites where meaning is authored rather than derived. The moat's strength is inversely
proportional to that count, and the target is zero.**

The count is the only honest scoreboard, and stating it is what separates this from a principle.
§38 holds the failures a count cannot see; that is the other half, and neither half is sufficient
alone.

The failure mode is specific and worth stating plainly, because it is the one that actually
happens. A constraint with no teeth is abandoned under pressure, and the pressure is always a
deadline. The fastest path to a shipped capability is a hand-authored manifest, an added index, or
a surface special case; it works, it ships, and the count never returns to zero. The countermeasures
are §4.6, the invariant that every structure-changing action requires a derivation (I1, §34.1), and
the habit of treating a requested exception as evidence that the interpreter is missing a
capability. §4.6 is the load-bearing one, because it is the only counter that does not depend on
anyone remembering.

# Part II — The design

## 6 DarkFactory as an architectural pattern

The system is a product, and the product is an instance of a pattern that other systems could
adopt deliberately. Stating the pattern separately from the mechanism matters: a mechanism you have
to read the source to understand cannot be applied anywhere else, and a pattern you cannot apply
elsewhere is only a description of this program.

### 6.1 Context and problem

The pattern applies wherever a system must be described in order to be acted on — a service, a
repository, a machine, a pipeline, a fleet.

Such a system is described more than once. There is the thing, and there is a description of it: a
manifest, a schema, a build file, a configuration layer, an adapter per consumer, a document, a set
of instructions for how to assemble and ship it. The copies are not maintained together, and their
disagreement is not a failure of discipline, for the reason §1 gives: two things existing is the normal
condition and drift is the default outcome. The pattern addresses that structurally rather than
procedurally, because every procedural answer has been tried — generate the second description, or check
that the two agree.

### 6.2 Forces

Any pattern has to live with these, and the shape below is a consequence of them rather than a
preference.

- The description must be **complete enough to act on**. A partial description is not a cheaper
  description; it is a wrong one.
- It must stay **current without a human maintaining it**, because the people who write the thing
  and the people who keep the description current are not the same people at the same rate.
- It must be **legible to a person and machine-readable by a tool from one text**, because there
  are two kinds of reader and there will be more consumers than either.
- The consumers are **heterogeneous and growing** — a command line, a rendered interface, an agent,
  a third-party integration — and each one would otherwise need its own copy of the description.
- A hand-written description is **cheaper to produce than a derivation**, at least the first time
  and usually several times. Any pattern that loses to that on a normal Tuesday will not survive a
  release.

### 6.3 Shape

**One description, derived from the thing it describes, and read by every consumer.**

- The description is the system's only account of itself, and it is derived rather than written.
- Derivation reads what is already there: the names, the signatures, the position in the structure,
  and the documentation.
- No consumer holds a copy. Every consumer — including every surface and every agent — reads the
  derivation, so a consumer cannot disagree with the system because it cannot have its own idea.
- Nothing states what a thing is except the thing. A manifest, an index, a registry, a schema, a
  per-consumer adapter, a hand-written interface description and a hand-written build description
  are all the same mistake, and none of them is available.

### 6.4 Consequences

The pattern's benefits are all the same benefit seen from different angles, and §5.1 lists them: a
description that cannot drift, consumers that cost a renderer rather than an adapter, a system that can
act on itself because it can already read itself, and a change to the system that is an ordinary change.
What the pattern adds to that list is the claim that the four are consequences of the *shape* — of one
description derived from the thing it describes — rather than four separate properties anyone could adopt
independently.

The costs are equally real and belong in the same breath. **Authoring is prohibited, including by the
author**, which is a rule people expect to be relaxed for themselves. **Documentation is
normative**, so a comment is part of the contract and a wrong comment is wrong everywhere at once.
**Derivation must be faster than authoring** or the pattern decays into the thing it replaced, and
that is a performance requirement rather than an aesthetic one. And a consumer that needs a shape the
derivation cannot produce has to be told no, or the derivation has to be extended — which is
sometimes the right answer and never a cheap one.

### 6.5 Where it does not apply

A pattern that cannot say where it stops is a slogan, so the boundary is stated.

It does not apply to a system with **one consumer and no expectation of being read again**. The cost
is real and the benefit is not.

It does not apply where a description must be **published independently of the thing it describes** —
a wire contract for a third party you do not control, who needs a specification that survives your
next refactor. That is a genuinely different artifact, not a second copy, and producing it is
legitimate.

And it does not make **every recorded fact** a violation. A lockfile, a checksum and a signature are
records of a resolution, not copies of a description, and treating them as second descriptions would
be the pattern misapplied rather than the pattern followed. The test is whether the file could be
recomputed from the system: if it can, it is a record and it may be stored; if it cannot, it is a
description and it may not.

## 7 DarkFactory as an engineering practice

The pattern says what a system's description is. It does not say how anyone should work. Those are
different, and a team can adopt the first and ignore the second, which is how a correct architecture
produces an unusable system.

Seven practices. Each is stated, then what it obliges, then what it forecloses — because a practice
that does not foreclose anything is a preference, and the exclusions are the part that does the work.

### 7.1 Derive, never author

**Statement.** If a description of a thing exists beside that thing, it is wrong.

**Obliges.** Documentation is the contract, not decoration: what a feature publishes to every surface
is its own doc comments, and a feature with no documentation is incomplete rather than undocumented.
The count of authored descriptions is the only honest scoreboard for whether the practice is held.

**Forecloses.** Hand-written schemas, manifests, indices, registries and per-consumer adapters.

### 7.2 Declare, then converge

**Statement.** A change is a stated difference, not an action.

**Obliges.** The difference is written down before it is applied, and applying it produces a version
carrying a parent, a diff and an author. A runtime change is written to the declaration and applied
by convergence.

**Forecloses.** Overlay configuration, side channels, and any mutation that leaves no record — which
also forecloses the privileged self-modification path, because that is a change with no author and
therefore nothing to approve or reverse.

### 7.3 Converge, never revert

**Statement.** The declaration is intent; the system observes reality and moves the world toward what
was meant.

**Obliges.** Convergence is one-directional and bounded by attribution: repair the drift you own,
report the drift you do not. Changing the declaration is not drift — it is a legitimate change of
intent through the ordinary path.

**Forecloses.** Silent reversion of a deliberate human edit, which is worse than not healing at all,
because it looks like the system working.

### 7.4 Bind, never own

**Statement.** Own the seam; never the organ.

**Obliges.** Both halves, tested. **Substitutability**: a different implementation is available, and
the current one is not measurably worse than the best construction available. **Permeability**: a
caller can compose around the seam rather than being routed by it.

**Forecloses.** Reimplementing a mature tool, and freezing a seam into a menu — several choices, none
composable with what the caller already has.

### 7.5 One askable thing, one file

**Statement.** A file is the unit a caller can request on its own.

**Obliges.** Granularity is decided by what can be asked for, not by what belongs together. What
belongs together is a folder, whose name says what the group is for.

**Forecloses.** Files named for subsystems rather than for asks, barrels, registries, and any
container whose name means "the rest" — `utils`, `helpers`, `common`, `shared`, `manager`, `core`.

### 7.6 Prove with invariants, not prose

**Statement.** A claim about the system is a check that runs.

**Obliges.** Tests sit at the owning boundary and survive valid refactors, so they assert invariants
and transitions rather than filenames and substrings. Concurrency and idempotency are tested at the
race and crash windows with simultaneous actors, not by calling a function twice.

**Forecloses.** "Reviewed and agreed" as a substitute for evidence, and any acceptance criterion that
nobody could fail.

### 7.7 The system maintains itself through the ordinary path

**Statement.** A change to DarkFactory takes the same route as any other change.

**Obliges.** No code path exists only for the system to edit itself. Its proposals carry a diff, an
author and the measurements that motivated them, and pass the same approval as anything else.
Auto-approval is a declared policy, off by default and never for anything that removes or relocates.

**Forecloses.** The privileged tuner — the component that adjusts the system directly, which is
simplest to build and produces changes with no author, no diff and no rollback. That it is the system
rather than an external agent making the change does not improve the position; it makes it harder to
notice.

### 7.8 How the two halves relate

The pattern and the practice are not separable in practice, and the dependency runs one way. The
pattern is what makes the practices enforceable: you cannot forbid authoring (§7.1) without somewhere
for the information to come from, and there is nowhere else. The practices are what keep the pattern
from decaying: a derived description that is slow to produce is replaced by a written one within a
quarter, not because anyone rejects the pattern but because a deadline is a deadline.

Which means the failure is always the same failure. Someone reaches for a manifest under pressure, the
manifest works, the count rises by one, and nothing announces it. The count is the check that catches
it, which is why §5.3 is a number rather than a principle.

## 8 Invariants

Properties rather than features, each paired with the check that catches its violation. A property
with no check is an aspiration.

| # | invariant | held by |
| --- | --- | --- |
| I1 | No file describes a feature except the feature | enumeration-only files are rejected; no barrel, registry, catalogue or manifest names what exists |
| I2 | Derivation is total — every feature is derived, none dropped | a tree walk comparing the derived set against the discovered set, across overloads, re-exports and conditionals |
| I2a | Identity is a function of inputs, never of time | an interface's identity is the hash of its content, its declared dependencies and the environment it resolves under, so a skip names the input that changed; an undeclared input is a correctness bug, not a missed optimisation |
| I3 | The published interface is the code's own | a feature with no doc comment is a build error, and each surface is checked to render the comment its feature publishes |
| I4 | Effects pass through a seam | direct filesystem, network and process access is rejected outside the seams |
| I5 | Nothing is published uncompiled | every released artifact carries its resolution identity, verified before publish |
| I6 | Discovery is structural only | a test adds a feature and asserts that no other file changed |
| I7 | Drift is measured against derivation | convergence is exercised against derived inputs only, never against a recorded copy of intent |
| I8 | The system is a fixed point | compiling the system by itself resolves to itself, byte-identical, with nothing reconciled between |
| I9 | Presentation holds no behaviour | a surface cannot be imported by a non-surface |

**Acceptance is the right-hand column.** These are not satisfied by review, and the system is not
final while any of them can fail. Two are worth calling out as ordering constraints rather than
aspirations: **I4 and I8 are structural and cheap to require now and expensive to retrofit.** Once
effects bypass the seams, nothing resting on them can be enforced at all; once a second build
description exists, the fixed point stops being reachable at any price. Every other invariant is
downstream of those two, which is why they are the first pair to build and the last to relax.

## 9 Architecture

DarkFactory is a DarkFactory workspace **and** a DarkFactory application. Both halves are
required, and neither is a mode.

As a workspace it hosts the framework: the concerns, the seams, the capabilities and the
surfaces that §9.3 sets out. As an application it is a consumer of that framework with no
private path — every folder it contains is a folder any consumer could contain, and every
capability it uses is one it could obtain. The DarkFactory repository is therefore its own
first consumer, and any behaviour that works only because of something specific to this
repository is a defect in the framework rather than a property of the application.

This is the structural form of §20's self-hosting requirement. Self-hosting is not only a claim
that df can build df; it is a requirement that the workspace and the application are the same
shape, so that "df built this" and "a consumer built this" are the same statement.

The consequence to hold onto when reading the tree below: nothing in it exists for DarkFactory's
benefit. `darkfactory/` is not the system's own directory with a privileged copy inside; it is
what any repository's copy looks like.

### 9.1 Structure is the declaration

Meaning lives in exactly one place: the code. Folders, file names, function names, signatures and doc
comments are the declaration, and the interpreter reads meaning from them. Nothing describes a
feature except the feature.

The rules that follow are stated with their reasoning in §10.1 and §17 — one askable thing per file,
no privileged subset, no barrels, no registries, discovery by structure, and documentation as part
of the contract. What is specific to *architecture* is only this: **there is no privileged
top-level subset.** A folder declares a concern, and the set of concerns is itself content, so a
concern can be added or removed without amending this document. The question "is this core or
content?" is not asked, because what a thing needs is already answered by where it sits and what it
sits beside.

### 9.2 Declaration and implementation are separate files

A binding is a declaration beside its implementation. The declaration states what a thing is
bound to; the implementation carries the code. Both are read by the same interpreter, and a
binding with no implementation in the current backend is an error rather than a silent absence.

There are exactly two kinds of file in the system, and they are two kinds of *thing*:

- **`*.dfconfig` — declaration.** A document of named blocks that says what the system *is*: its
  identity, its pipeline, its providers, its models, and which backend each seam is bound to. It is
  read. The filename is not part of its meaning — any stem is accepted and none is canonical.
- **`.df` — implementation.** Every mechanism and every feature the system has. It is interpreted
  and then run. There is no other extension, and no file in the system is called anything else.

**Declaration and implementation are separated by kind rather than by adjacency.** A seam's
binding — that `Change` is bound to git — is a fact about the system and belongs in a `.dfconfig`
block. The organ that implements it is a `.df` file. These are not two spellings of the same thing
in neighbouring files; they are data and code, and the separation survives a backend being replaced
because nothing in the `.df` knows which seam it serves.

**There is no `.ts`.** The repository contains no file under that extension, and the absence is
the point: a third kind would reintroduce exactly the ambiguity this design removes, because
"is this declaration or implementation?" would become a question about a filename rather than
something the reader can see. `.df` is TypeScript, so `tsc`, every editor and every language server
works on the whole system once `tsc` is told what `.df` is — one configuration, and then no
per-file ceremony for the rest of the repository's life.

Data that belongs to no system — fixtures, lockfiles, third-party manifests — stays `.json`, and a
block is promoted from a `.dfconfig` to code only once something must *interpret* it rather than
read it.

**Configuration is one convention.** Everything a scope declares is a block in one `*.dfconfig`
document, so the only thing that varies between repositories is block *content*. Splitting it across
a `*.dfconfig`, a graph file and two `.json` files would be three places to name a thing and three
ways for a repository to spell a convention it inherited rather than chose.

**The layers are process boundaries, not folder names.** A directory tree is a claim about naming;
a process boundary is a claim about what can go wrong. Each concern below runs as its own thing and
is reached only through a declared interface, so the guarantees are enforced by the runtime rather
than by a convention everyone is trusted to follow. This is the difference between saying `Execution/`
is separate and saying nothing inside it can be reached except through its seam — the first is
satisfied by a good folder name, the second is not satisfied by anything except isolation.

It also means a concern can be *removed* and take only itself with it. A folder name implies a
convention that outliving the folder; a process boundary implies nothing left behind, which is what
makes a backend removable along with its installation rather than merely substitutable.

### 9.3 The tree

```
/                                       any repository that adopts DarkFactory
├── *.dfconfig                           one per scope, any filename; all declaration
│                                         blocks: repo · graph · providers · models · docs ·
│                                         bindings: which backend each seam is bound to
│
└── darkfactory/
    │
    ├── Meaning/                        reading code and declarations into a resolution
    │   ├── InterpretLanguage.df        read code and declarations into meaning
    │   ├── DeriveInterface.df          code, names, signatures and comments → the interface
    │   ├── ResolveConfig.df            find the declaration for a scope
    │   ├── ResolveReference.df         follow a name through structure
    │   ├── SelectBackend.df            given an intent, choose the implementation
    │   ├── ComposeGraph.df             resolved capabilities → the executable plan
    │   └── Compiler.df                 bind to a version; emit every surface; emit the local Change backend
    │
    ├── Change/                         the only way the world is read or altered
    │   ├── ReadState.df  Snapshot.df  Stage.df  Publish.df  OpenChange.df  Identify.df
    │   ├── git/        git.df                        the organ
    │   ├── github/     github.df                     the organ
    │   └── local/      local.df · (emitted by Compiler.df)
    │
    ├── Execution/                      running, gating, and healing
    │   ├── ExecuteGraph.df  ResumeRun.df  EmitEvent.df  EnforceGate.df
    │   ├── Converge.df                 observe, diff against derived intent, converge
    │   ├── DeriveEnvironment.df  RecordTranscript.df
    │   ├── AllocateAgent.df  RankCandidates.df  ResolveModel.df  EnforceQuota.df
    │   ├── RecordSpend.df  AttributeRun.df  BindProvider.df
    │   └── DiagnoseRun.df
    │
    ├── Identity/                       proving and being someone; not agent-specific
    │   ├── identity/  DeclareIdentity.df  RevokeIdentity.df  AttributeUse.df
    │   ├── proof/     BearerToken.df  OAuthGrant.df  ClientCertificate.df  SshKey.df
    │   │              Passkey.df  TimeBasedCode.df  DeliveredCode.df
    │   │              SessionCookie.df  SignedRequest.df
    │   ├── acquire/   LoginFlow.df  ExchangeDeviceCode.df  ApproveRequest.df
    │   │              PresentChallenge.df  AwaitChallenge.df
    │   └── hold/      LocalSeal.df  RemoteVault.df  SplitSecret.df
    │                  ReassembleSecret.df  BindHolder.df  RotateProof.df
    │
    ├── Browse/                         the seam both the human and the agent navigate
    │   ├── Browse.df                  the interface
    │   ├── tauri/      tauri.df                 one process, N presenters, one session
    │   └── headless/   headless.df               for an agent that only needs to act
    │
    ├── Capabilities/                   content
    │   ├── code/       GenerateDocs.df  ExplainCode.df  ReviewDiff.df …
    │   ├── planning/   PlanWork.df  ScopeWork.df …
    │   ├── review/     ReviewChange.df  ProposeChange.df …
    │   ├── docs/  hooks/  math/  paper/  release/
    │   ├── resolve/    ResolveCapability.df  BindCapability.df  RankCapabilities.df
    │   └── github/     OpenIssue.df  CommentOnIssue.df  ReconcileState.df …
    │
    └── Surfaces/                       projections; no behaviour of their own
        ├── Terminal/   terminal.df                 CLI and TUI
        ├── Renderer/   renderer.df                 the human's window
        ├── Docs/       docs.df
        ├── MCP/        mcp.df                      an agent's presenter, no window
        ├── Claude/     claude.df                    plugin and skill forms
        ├── Codex/      codex.df
        └── GitHub/     github.df
```

Every surface is a projection of one derived resolution and contains no per-feature
implementation. A surface is added by adding a folder; it is never added by adding an adapter
to each capability.

### 9.4 Identity is not scoped to a caller

Identity is a first-class concern of the system rather than a property of the execution
runtime. `df` on an unconfigured machine, the Renderer completing a GitHub App login, an
external Claude or Codex plugin, and an agent in CI all need to prove who they are, and each
obtains it through the same `Identity/` concern.

An identity is a declaration plus one or more proofs, and a proof is not restricted to a
stored secret. A proof may be stored, derived, or exist only for the duration of a flow. The
system must support at minimum: long-lived bearer tokens, OAuth grants, mTLS client
certificates, SSH keys, passkeys, time-based one-time codes, codes delivered to another
channel, and opaque session cookies. An identity is acquired through a flow that may require a
human or a second device, so acquisition is part of the concern and not an assumption of prior
provisioning.

### 9.5 Rules the structure must satisfy

- Adding or removing a file changes only what that file names. No other file requires
  modification, and no build description, index or list is updated.
- Discovery is by filesystem structure alone, and a discovered folder is usable without being
  registered.
- Package dependency direction is acyclic and follows structure, so that a folder's
  requirements are visible from where it sits.
- A surface exposes every feature. A feature that cannot be reached from a surface does not
  exist.
- Compilation is release: the resolved system is bound to a version, and every artifact is
  emitted at that version. A version is part of what compilation resolves.
- The build description of the system is the system. There is no second hand-written
  description of how it is assembled, bundled, signed or published.

## 10 Interpretation

Reading is the whole of df's mechanism rather than one part of it, and it is the *same* reading
at every scale. A function, a file, a repository, a pipeline, a machine and a fleet are shapes it
resolves, and a design that needs a separate story for each of them is a design that will not
finish. §12 is where that sameness pays off across locations; the claim here is only that there is
one mechanism and not several.

Reading is itself bound through the same seam as any other system: a small vocabulary, several
implementations, and a declaration that names one. §11.1 carries that argument in full; the requirement
here is that no declaration language is privileged.

A feature's interface is **derived** rather than authored. It is read from the feature's names,
its signatures, its position in the tree and its documentation, and published to every surface.
No file states what a feature is, and no surface implements one.

- A declaration is interpreted through a named backend. TypeScript is the first-party backend for `.df`. Further backends exist so that declarations authored in another system's own language stay first-class instead of requiring translation into ours.
- A declaration written for a bound system remains in that system's language. What that
  means when a consumer's machine-level configuration is authored in another format is a
  requirement, and it is stated in §34.1.
- Backend selection is declarative. Capability availability is not conditional on which interpreter is present.
- Interpretation is read-only with respect to the declaration. Evaluating a declaration never mutates it; applying it produces state through the ordinary governed effect path.
- The interpreter is declarable: which backend interprets a declaration, and the systems layer and interpreter revision it loads, are chosen by declaration rather than hardcoded. A system that can describe its own configuration can describe the thing doing the describing.

This is what lets the system span machines and repositories under one semantic model: the interpreter is chosen per declaration, not per location.

### 10.1 One askable feature is one file

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

## 11 Compose, and bind only where it is cheaper

The goal is not to reach an existing system. It is to be able to **rearrange how a system is used**
without forking it, and that is a stronger property than access. Access is a fixed vocabulary: you
get what the interface exposes. Composability means the arrangement is not the interface's decision.
A seam's job is therefore to **name a place in a composition, not to fix a vocabulary**, and the
discipline below follows from that distinction rather than from a preference for writing less code.

We implement the seam and none of the organs. Version control is `git`, `gh`, `forgejo`, `gitlab` or
a bare directory; the browser is a system webview; toolchains are Nix; composable services are
Cordis rows. What we own is that those mean the same thing on every backend, compose with everything
else, and can be named in a declaration without a conditional.

```
ReadState:   <target>                 what is true out there
Snapshot:    <target>                 freeze a point in the world
Stage:       <target, paths, msg>     the only way to change a tree
Publish:     <target, ref>            the only way to move a ref
OpenChange:  <target, ref, title>     the only way to request review
Identify:    <who>                    who is acting
```

**Every line written to replace a mature tool is a line worse than what it replaces and one
maintained forever.** But measured against the tool, binding looks like a tax, and that comparison
is wrong: it assumes the only alternative to a seam is the organ it wraps. The real alternatives are
the tool, another binding, and a composition of bindings, so the comparison is against **the best
construction available**. Measured that way, binding is usually cheaper — which is the honest reason
for it rather than the virtuous one.

A seam has two properties, and only the first is usually checked:

1. **Substitutability.** A different implementation is available, and the current one is not
   measurably worse than the best alternative — in latency, error fidelity or capability. This half
   is empirical, and it is a measurement to take rather than a preference to defend.
2. **Permeability.** A caller can compose *around* the seam, or the seam decides the arrangement for
   them. This half fails silently, because every substitutability check keeps passing while the thing
   gets worse. A seam that can only be used one way is a wall, and a wall is where an abstraction
   leaks. A permeable one is one a caller can route around, extend, or ignore for the cases it does
   not cover, and it stays usable when they do.

The two are independent, and the second is what makes the first tolerable. A substitutable seam that
is not permeable is a menu: several choices, none composable with what the caller already has. A
permeable seam that is not substitutable is worse — a single escape hatch with nothing behind it.

**This is not only about external systems.** Because interfaces are derived from structure (§4.3)
and discovery is structural (§17), the system's own features are composable inputs: a consumer can
take one, move it, combine it with something of their own, and the system reads the new arrangement
because it was never registered anywhere. So a seam is not a boundary around the system — it is a
claim that **nothing in the system is privileged, including the seams.**

The payoff is an answer to every "this tool does not understand us" moment. A tool that cannot be
configured for the system is **a system to bind, not a system to fork** — the formatter, the test
discovery, the coverage reporter — and the surrounding system can host the binding precisely because
it is built from recombinable parts rather than a program with one fixed entry point.

### 11.1 The interpreter is the same seam applied to language

The instinct on reaching for an interpreter is to bind one, TypeScript via Bun say. That is half
right, and the half that is wrong matters more: **an interpreter is a forge for declarations.**
A small vocabulary, several backends, and a declaration that names one. It is §11's shape applied to language rather than to version control, and recognising it
resolves two awkward requirements at once — a language is a place in a composition, not a
fixed vocabulary.

DarkFactory's own systems layer is TypeScript, so `.df` is TypeScript with a framework-provided
standard library and every editor, language server and `@types` package works unchanged. A system
DarkFactory *governs* may be declared in **its own** language, because a mature system usually
has one: Nix modules get typed options, merge semantics, `mkDefault`/`mkForce` and nixpkgs for
free rather than by our owning a language for them. One interpreter subsystem with a backend per
declaration language serves both. A TypeScript-only systems layer could not govern anything
declared in a language we did not choose, and would make "universal" aspirational.

## 12 Remove the friction

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

## 13 AI-first

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

### 13.1 What the harness is actually for

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

### 13.2 Why execution is separate from reading

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

## 14 Self-heal: convergence, not reversion

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

## 15 Self-building, and why it is a stronger claim

Self-hosting is that the system builds itself. Self-building is that it emits its own release
from the same reading that produced everything else.

The test is the second source of truth. If a separate hand-written pipeline described how to
assemble, bundle, sign and publish the system, then the system had two accounts of itself — what
the code says and what the build says — and self-hosting would be true only until they diverged.
The stronger claim is that there is no second account: compilation reads the system's meaning,
binds it to a version, and emits every surface form at that version. A version is not a label
applied at the end; it is part of what compilation resolved.

This is the same moat applied to distribution.  §11's substitutability
is necessary; this is the stronger property. If the code is buildable by semantics, the
artifacts are too, and the surfaces a capability appears on are a consequence of what it means
rather than a list someone maintains.

**Self-building is not a new mechanism, and saying so is the strongest form of the claim.** A design
that needed a *self-modification path* would be admitting that its ordinary path cannot express
"change me." Here it can: the system reads its own meaning, addresses its own nodes, declares a
difference against itself, converges, and versions the result. There is no privileged tuner, no
separate build-for-darkfactory routine, and no code path that exists only for the system to edit
itself — and the reason to insist is that a privileged path produces changes with no author, no
diff and no rollback, which is the precise failure §9 is written against. That it is the system
rather than an external agent making the change does not improve the position; it makes it harder
to notice.

**Every mutation, including the system's own, goes through the same escrow and the same record.** A
runtime change is written to the declaration and applied by convergence — not as an overlay and not
as a side channel — and applying any declaration produces a **generation** carrying a parent, a
diff and an author. Audit without undo records damage already done; undo without audit is an
approval with no history. They are one mechanism.

**Undo is a first-class operation over the system's own log, not a reconstruction from the
backend's internals.** That distinction is what makes a backend *removable* rather than merely
substitutable: if undo depended on git's reflog and on nothing else, then a consumer who wanted
only one backend could not remove the other along with its entire system integration, because the
undo story would differ per backend. The log is ours, the backends are driven as they are, and that
is what lets a whole implementation leave without taking a guarantee with it.

The completion condition is a fixed point: **the system compiled by itself resolves to itself.**
Not approximately, and not after a maintenance pass — the same resolution, which is only possible
if there was never a second description to reconcile.

## 16 Declarable by nature

**Anything config-shaped in nature must be declarable rather than coded.** If a competent
operator could reasonably want to vary it without reading our source, it is data. If only someone
who has read the implementation could want it, it is code and should be code.

The discipline this adds is that **every resolution layer is inspectable**, because "the user
overrode the default" and "the default is this" are different facts, and an operator debugging a
surprise needs the difference.

## 17 Structure is the interface

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

## 18 The systems layer: `.df`

`.df` is TypeScript with a framework-provided standard library, and it is the only extension the
system's own code carries. There is no `.ts` anywhere in the tree, so the whole of DarkFactory is
one language under one name, and `tsc` is configured once to treat `.df` as what it is.

**We invent no syntax.** If a construct cannot be expressed in TypeScript it does not go in
`.df`; the additions are the extension and the loader, and `tsc` remains the type system, so every
editor, language server and published library works on the entire system unchanged.

**The rename happens once, at the boundary, and only inward.** A prototype is written as ordinary
TypeScript wherever is convenient — a scratch file, a REPL, another repository — and joins the
system by becoming a `.df` file, and after that its extension never changes again. Nothing has to
be rewritten to join, and an experiment that does not work is a deleted file rather than a
reverted design. What the single extension buys is that there is exactly one place a reader looks
to learn what a file is, and exactly one convention to teach.

The import attribute the design once required — `with { type: "df" }` — is gone with it. It
existed to mark a file as participating in composition, and the extension already says so; a marker
repeated in two places is the thing §4.2 forbids.

The objection is well-founded and a mature system with an existing language is right to keep it:
owning a language means owning a parser, a type system, an error story and a compiler "to arrive
where an existing module system already is." §11.1 is why that does not apply. For what
DarkFactory **authors** we choose the dialect; for what it **binds** we do not and must not. We
are not replacing a mature system's language, we are making it reachable.

# Part III — Requirements

## 19 Authority

1. this document defines product requirements and architecture.
2. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope.
3. Accepted ADRs in §38 record durable decisions and rationale.
4. The scope's `*.dfconfig` document and the blocks it declares are executable declarations. No filename is canonical; see §24.1.
5. §37 defines mandatory contribution/governance behavior.
6. Generated docs/web views and §39 are projections, not independent sources of truth.

A material deviation from this document requires owner approval and an accepted ADR.

## 20 The product

DarkFactory is one system that is at once a library, a framework, a pipeline, a developer tool, a
workspace manager and an operator of machines. Those are not products sharing a name; they are one
capability — act on a system through a declared interface — observed at several scales: a function
call, a file, a repository, a pipeline, a machine, a fleet.

A human supplies intent and approvals. The system performs planning, implementation, deterministic
verification, review/fix iteration, alignment, mutation, CI coordination, merge and reconciliation,
release and audit through one production engine.

The properties below are the ones that belong to the product. The architectural ones — self-hosting,
AI-first, location-independence, extensibility, and declarability — are not restated here, because
Part I states them once at full resolution and Part III specifies them; a shorter restatement at a
lower resolution is a second description that can disagree.

- **Governed.** Explicit approval gates bind human intent, and a proposal to change the system is a
  proposal like any other.
- **Resumable.** Interruption, quota exhaustion and conflicts do not lose completed effects.
- **Truthful.** Completion and mutation claims come from observed state, never from the prose of
  whatever did the work.
- **Multi-domain.** One repository may contain code, papers, mathematics and other supported package
  types, and the mechanism does not notice the difference.
- **GitHub-native.** GitHub remains the durable issue, pull-request, check, project, event and
  authorization control plane.
- **Source-free in production.** A released system installs and runs without a source checkout.
- **Both tool and platform.** Usable directly, and extensible by code the system has never seen, so
  the capability surface and the `.df` layer are published contracts that internal refactors do not
  break.

Part I states the pattern and the practice this product is an instance of. Where Part I and the rest
of this document disagree, the rest wins; where the rest is silent, Part I is the position.
## 21 Actors

| Actor                    | Responsibility                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintainer/operator      | Supplies intent, approves Planning/scope amendments/final merge as required, operates df through`Surfaces/Terminal/` and `Surfaces/Renderer/`.                   |
| DarkFactory engine       | Executes graph/runtime mechanisms, routing, persistence and deterministic effects.                                                                                   |
| Capability               | Implements agentic/product behavior such as planning, review, git, docs, CI, recovery or domain-specific work.                                                       |
| DarkFactory GitHub App   | Automation identity and privileged GitHub execution identity.                                                                                                        |
| Authenticated human user | Human identity used by`Surfaces/Renderer/` for user-attributed GitHub access/actions.                                                                              |
| Consumer                 | Supplies project-specific declarations/data while consuming released df and the shared web application. A consumer is a repository, a machine, or a fleet of either. |

## 22 Capability architecture

Agentic and product behaviour belongs in versioned capabilities under `Capabilities/`. Mechanisms belong to the
concern that owns them, and there is no privileged subset: which concern a thing belongs to is answered by what
it needs, not by an internal package boundary. Version control is reached through the `Change/` seam and is not a
capability; neither is environment derivation or convergence, which are `Execution/`.

The initial first-party capability set includes at least:

- code;
- docs;
- hooks;
- math;
- paper;
- release;
- planning;
- review;
- resolve;
- github.

`resolve` — discovering, binding and ranking capabilities — ships as a capability so a consumer may resolve
differently without contending with the mechanism. The normal distribution includes it, so a standard
installation is batteries-included without the concern being privileged.

`github` appears in two places for two different reasons, and the distinction is required rather than
incidental. `Change/github/` is the seam binding that lets the system act on a GitHub repository.
`Capabilities/github/` is GitHub as a place work comes from and goes to: issues and pull requests as requirement
intake, review destination and reconciliation. Neither substitutes for the other.

A capability may contribute:

- setup and ecosystem/package-specific deterministic actions;
- tools and commands;
- graph-node behavior;
- deterministic actions;
- verification/quality actions;
- hooks/rules;
- documentation;
- surface metadata;
- release outputs;
- audit records;
- credential requirements.

Capabilities do not own raw credential storage.

One canonical `.df` capability definition is the implementation source, and every surface a
capability is reachable through is derived from it rather than written against it. Supported integration forms, including:

- native integration;
- `Surfaces/MCP/` server form;
- supported Claude/Codex/agent skills/plugins/manifests.

There must not be independent handwritten implementations of the same capability for each runtime surface, agent integration, or consumer. A capability has semantics; each surface is a renderer of those semantics. Adding a surface is one renderer, not one adapter per capability.

Every capability is reachable through every supported surface: `Surfaces/Renderer/`, `Surfaces/Terminal/`, the
GitHub surface, and external agent harnesses as MCP servers and plugin/skill forms.

Compiling and releasing are one operation. Compilation binds the resolved system to a version and emits it in every surface form at that version, so a version is part of what compilation resolves rather than a label applied afterwards. There is no separate build description of the system that could disagree with the system.

Official capabilities use the same loader/ABI as third-party capabilities. What a standard installation
includes is specified in §33.

The capability ABI is versioned independently from product SemVer.

## 23 Domains, ecosystems and project detection

DarkFactory retains separate concepts:

- **ecosystem** — toolchain/package format, such as Bun/Node, Python, Rust, Typst, LaTeX or Lean;
- **package** — one buildable unit in a repository/workspace;
- **domain** — the semantic kind of work, initially including `code`, `paper` and `math`;
- **capability** — behavior DarkFactory can perform.

Repositories may be polyglot and multi-domain simultaneously.

Detection discovers repository/package/domain evidence. Capability resolution then selects applicable capability-contributed actions such as test, lint, format, docs, setup and release behavior.

The final system must not rely on one ever-growing repository-specific language/command table when behavior can be provided by a capability.

## 24 Configuration and state

Configuration is data in a document; state is what the system observed and recorded. They are kept
apart because they answer different questions — what was meant, and what was found — and conflating
them is how a system ends up unable to say whether a difference is drift or an edit.

### 24.1 Configuration

Configuration is one convention. A scope resolves exactly one `*.dfconfig` document, the document
owns named blocks, and a consumer selects a block rather than a file.

The rules are:

- **No filename is canonical.** Any stem is accepted. `repo.dfconfig` is a convention this repository
  happens to follow, not a requirement, and a repository that names its configuration
  `system.dfconfig` or `config.dfconfig` is not making a mistake.
- The document owns named blocks — `repo`, `graph`, `providers`, `models`, `docs`, and whatever else
  a declaration defines — and every consumer selects the block it needs. `repo` owns repository
  identity and policy, `providers` owns runtime and provider settings, `models` owns the catalog and
  preference order, `graph` owns the pipeline, and `docs` owns documentation configuration and output.
- **The pipeline is the `graph` block, not a separate graph file.** Topology, nodes, edges and
  convergence are configuration like anything else, and giving them their own format would be a
  second convention for a repository to inherit rather than choose.
- **An unknown block is an error, not a no-op.** A misspelled block must fail loudly rather than
  silently disable a setting, because a block that does nothing and a block that is absent are
  indistinguishable at runtime and only one of them is what the author meant.
- When root candidates exist they are selected; otherwise candidates under `DF_CONFIG_DIR` (default
  `.darkfactory`) are accepted for supported discovery. `.darkfactory` is a fallback and is not a
  committed source in this repository.
- **Two `*.dfconfig` in the selected scope, or candidates in both root and the configured folder,
  fail closed as ambiguous.** A repository with two configuration documents is not a repository with
  a rich configuration; it is a repository that has not decided. This is I1 applied to configuration.
- Blocks are never merged across documents, for the reason §4.2 gives: merging two declarations is
  how a second source of meaning appears.
- `.df` and `.dfconfig` are filename extensions, never directories.

### 24.2 Documentation configuration and output

The `docs` block in the combined configuration is the only DarkFactory documentation configuration contract.

Generated documentation sites and JSON content graphs are CI outputs and must not be committed. The deterministic §39 rules projection remains governed by the documentation currentness check.

### 24.3 State

Df-owned config/state/result/review/audit artifacts use appropriate `.df` filenames in their owning locations.

## 25 Governed Request lifecycle

The final Request lifecycle is:

1. capture verbatim Request/context and relationships;
2. generate one unified Planning artifact;
3. independently review Planning;
4. automatically fix/re-review Planning until clean;
5. one explicit owner Planning Approval;
6. implement;
7. deterministic verification;
8. implementation review/fix loop until clean;
9. scope-amendment approval only when implementation/review identifies material work outside approved Planning;
10. final alignment against approved Planning plus approved amendments;
11. external/static checks;
12. final review/merge authorization;
13. merge and deterministic reconciliation.

The lifecycle has one reviewed Planning artifact and one Planning Approval gate.

Planning/review/fix state is durable and resumable. Planning becomes stale when material Request, dependency, recovery or base context changes; stale approval is never silently reused.

A model stopping naturally is valid completion. Code-node truth derives from engine-observed workspace/diff/scope/verification/commit evidence. Judgement prose may be structurally extracted through ordinary routed model calls.

Model claims such as “pushed”, “merged”, “committed” or “resolved” are not accepted as mutation proof without corresponding observed effects.

## 26 Runtime, routing and resilience

Pipeline stages pass explicit semantic task kind where known.

Undeclared inference separates task subject from required capability; engineering work about images/video must not be misrouted to media-generation tools.

Routing respects sensitivity, data-collection policy, provider/account availability, capability requirements and capability tiers.

Capability tiers prefer the lowest sufficient tier and escalate deterministically according to the shipped routing contract.

Quota/provider failover is durable and does not repeat already-completed deterministic effects.

Execution is serializable per durable run identity: concurrent ingress for the same run cannot lose state, run the same node concurrently, or overwrite a newer transition.

External effects are serializable per deterministic effect identity. Concurrent callers of the same effect cannot both enter the mutation; crash recovery reconciles external evidence before retrying.

Transport retries are method/effect aware. A mutation is never blindly replayed after an ambiguous transport/server outcome; the engine reconciles external state or uses an operation with equivalent conditional/idempotent semantics first.

Authoritative state uses crash-consistent transactions appropriate to its scope. A rename-only single-file update is not described as durable across power loss unless file and directory durability are actually established; logically multi-file state commits through one generation/transaction boundary.

Every agent-backed logical stage has one bounded wall-clock budget across model failover and tool work.

Planning decomposes work into the smallest practical independently verifiable chunks with explicit dependencies, scope/file ownership and minimum capability/tier metadata sufficient to decide safe parallelism.

Independent chunks may execute concurrently only through the same persisted graph runtime in isolated engine worktrees backed by the one deterministic git substrate. Verified chunk commits integrate in dependency order; sibling failure, interruption and conflict repair remain resumable without repeating completed effects.

Quota admission is atomic with respect to concurrent model calls: declared/learned capacity is reserved before dispatch and settled/released from observed usage so parallel chunks cannot all consume the same remaining slot.

Turn limits and elapsed-time limits are independent safety bounds.

Timeout, quota exhaustion, authentication failure, model failure and user cancellation are distinct outcomes.

The runtime remains containerizable/non-root for CI execution.

## 27 Change and governance

Production GitHub interaction goes through the `Change/github/` binding; production shell/subprocess `gh` mutation is not allowed.

Deterministic workspace/git mechanisms own status/diff/log/fetch/branch/update/rebase/merge/cherry-pick/conflict continuation/abort and lease-safe pushes. A push contract identifies both the expected old remote SHA and the new local SHA, verifies the resulting remote ref, and refuses stale remote state. Models may assist conflict resolution but do not own deterministic git state.

GitHub webhook/workflow events are triggers, not authoritative lifecycle snapshots. Status, labels,
project fields, bindings and cleanup decisions are reconciled from current GitHub/runtime state so
delayed or out-of-order events are idempotent and cannot roll newer state backward.

Capabilities provide higher-level behaviors such as:

- GitHub Request/PR/project operations;
- hooks/rule enforcement;
- Epic/Request relationships;
- stacked PR topology;
- recovery intake/reconciliation.

Static CI checks remain external to the runtime graph where appropriate; graph check-reference nodes observe them rather than duplicating them.

The repository default branch is always discovered from repository state/config, never hard-coded to `main`.

## 28 Identity

Identity is a first-class concern of the system and is not scoped to any caller. An identity is a
declaration plus one or more proofs.  A proof is not restricted to a stored secret: it may be
stored, derived, or exist only for the duration of a flow. The system supports at minimum long-lived
bearer tokens, OAuth grants, mTLS client certificates, SSH keys, passkeys, time-based one-time
codes, codes delivered to another channel, and opaque session cookies.

Acquisition is part of the concern. An identity may be obtained through a flow that requires a
human or a second device — a login, a device code, a push approval, a code presented for entry —
so the system must not assume prior provisioning.

Custody is pluggable and may be split. Material may be held in OS-native secure storage, in an
encrypted fallback where supported, in a remote vault, or divided into shares across holders and
reassembled at the point of use. No single holder is authoritative when material is split.

Identity updates are transactionally serialized. Multi-file representations cannot expose a mixed generation after interruption. Replicated/synchronized secret state converges deterministically regardless of merge direction, represents deletion explicitly so removed secrets cannot be resurrected by stale replicas, and does not resolve equal-version conflicts by caller-local preference.

It covers:

- OS-native secure storage;
- encrypted fallback where supported;
- environment/import sources;
- provider API keys;
- provider OAuth/device/login flows;
- access/refresh token refresh and rotation;
- multiple accounts/credential slots;
- borrowed external-CLI credentials without mutating the source CLI;
- GitHub App private key/JWT/installation-token handling;
- CLI-side GitHub user credentials;
- scopes/audience/expiry metadata;
- redaction;
- secret scanning;
- import/export;
- diagnostics.

Everything else requests scoped identity handles. It does not directly inspect secret environment variables, credential files or OS keychains.

Secret values are never committed, written to issues/PRs, included in generated docs/static Pages assets or emitted in logs.

## 29 Human authentication

Human/browser authentication is owned separately from machine identity and is reached through `Identity/`. It is distinct from a GitHub App installation authority.

It uses the existing DarkFactory GitHub App.

The normal browser flow provides:

- GitHub App user authorization;
- PKCE and state/CSRF protection;
- minimal confidential token exchange/refresh broker;
- expiring access-token/session management;
- refresh;
- logout/revocation;
- session restoration.

The broker is authentication infrastructure only. It has no DarkFactory project database, Request/pipeline state, model credentials or execution API.

Authorization derives from GitHub user permissions plus the App installation/permissions. DarkFactory does not maintain a second RBAC database.

Human-attributed GitHub actions retain user identity. Privileged automation remains the GitHub App/df identity.

Browser artifacts cannot contain/import the GitHub App private key, confidential broker credentials or keychain implementation.

## 30 Documentation

`Surfaces/Docs/` is the final documentation engine and is a projection of the resolved system.

It compiles one typed content graph from:

- this document's own canonical text, including §37 and §38;
- ADRs and rules;
- actual TypeScript/TSDoc API extraction;
- capability-contributed documentation;
- repository/graph/workflow metadata;
- supported API extractors for other ecosystems.

**Custody deduplicates without leaking.** Where material is content-addressed, encryption must be
*convergent* — each chunk's key derived from a master secret and that chunk's own hash — or
deduplication and confidentiality are mutually exclusive and one of them has to go. Unkeyed
convergent encryption is not sufficient either: identical plaintext then produces identical
ciphertext globally, which lets anyone confirm whether a known file exists. Deriving the per-chunk
key from a per-holder master secret restores deduplication within a holder without publishing
equality across holders. §4.3's fixed points and §28's split custody both depend on this and neither
invents it.

**One option schema, three consumers.** Every option carries a type, a default, a description, an
example, and whether changing it applies live or needs a restart. From that single definition the
settings surface is generated from the types rather than hand-built per option, this documentation
is generated, and the agent's vocabulary is the same schema: what it may set, to what values, and
what each one means. Three consumers, one source, and no surface can describe an option the others
do not have.

**Documentation is a surface inside the product, not a website beside it**, and **the agent reads
what the reader reads**: when the system proposes a change to the declaration, the documentation for
every option the proposal touched is presented beside the diff, so approval happens with the
reasoning present rather than with a summary of it. This is the difference between a gate and a
governed change, and it costs nothing extra once the documentation is generated from the same schema
the agent reasons over.
TypeDoc may be used internally as the TypeScript/TSDoc extractor.

Documentation builds are deterministic, strict and zero-warning for required API surfaces.

this document is the canonical product-documentation homepage. the root document is the canonical product document; §39 is the deterministic generated projection of canonical §37, with ADR links derived from §38. CI fails when the generated projection drifts from its canonical directory or when rule↔note relations are incomplete or contradictory.

## 31 Renderer

`Surfaces/Renderer/` is the only first-party rendered interface.

It is a projection of one derived resolution and holds no per-feature implementation. Its feature
set, its option schema and its effect log are the same ones every other surface reads, so it
cannot present a capability, a setting or an outcome that another surface does not.

It is a prebuilt React/TypeScript application released once per DarkFactory version and reused unchanged by consumer repositories.

Preferred design stack:

- React;
- TypeScript;
- shadcn/ui;
- lucide-animated;
- Motion;
- Dagre;
- Wouter;
- Dockview where a docking/workspace layout is materially useful.

A consumer does not rebuild the frontend. Its Pages artifact combines the released web bundle with repository-specific compiled content/data.

The application remains dynamic on GitHub Pages by reading live GitHub REST/GraphQL state through browser-safe GitHub/auth interfaces.

The target web surface includes, as shipped capabilities become available:

- repository overview;
- Requests and Planning;
- Epics/dependencies;
- recovery;
- PRs/stacks;
- checks/runs;
- graph execution;
- providers/accounts/quota status where safe;
- releases;
- capabilities;
- project configuration;
- audit;
- documentation.

`Surfaces/Renderer/` is the primary day-to-day operator interface. Direct use of the GitHub UI is optional for normal DarkFactory operation except where GitHub itself requires a consent/review surface.

The web application is not a second state database or privileged mutation engine.

## 32 Terminal

`Surfaces/Terminal/` is the only first-party terminal surface, covering both the command line and
the interactive view. The supported command is `df`.

Like every surface it is a projection, so its command set is derived from the resolved system and
carries no per-feature implementation. It drives:

- CLI dispatch/help;
- wrapper/system-`df` coexistence;
- interactive TUI;
- web/operator command metadata where applicable.

Bare interactive `df` enters the TUI when appropriate. Headless commands remain scriptable.

Every surface consumes the same derived resolution. No surface holds a model, a state store or a capability
catalogue of its own, so none can present something another surface cannot.

## 33 Installation, release and versioning

First-party packages and official capabilities are published under the planned `darkfactory` GitHub organization.

Initial first-party versioning is lockstep: one DarkFactory SemVer across first-party packages/capabilities, with a separate capability ABI version.

The final release contains, as required:

- Node-compatible npm execution path;
- supported native artifacts where CI can build **and execute** them;
- source commit/version provenance;
- checksums;
- official capabilities;
- capability adapter artifacts/MCP/plugin/skill forms;
- graph/schema/runtime data;
- prebuilt `Surfaces/Renderer/` bundle.

Initial installation must not require Python, a source checkout or a pre-existing df installation.

Before a release-affecting delivery PR merges, an unpublished source-free candidate built from its exact head/tree must pass the applicable DarkFactory and consumer acceptance contract. Final publication occurs from canonical after merge without behavioral source changes; the published artifacts must reproduce the proven candidate behavior/assets aside from canonical source-provenance metadata.

A standard installation includes the official capability set, so it is batteries-included, and third-party capabilities load through the same contract.

## 34 Consuming df

A consumer is anything that runs released df: a repository, a machine, or a fleet of either. The
system does not enumerate or depend on a fixed set of them, and this document does not name
any.

Consumers receive released df and managed setup. They do not receive copied DarkFactory source
trees and do not rebuild the shared web application.

Capabilities handle project-specific setup wherever possible, including quality actions,
documentation, hooks, release and workflow configuration.

Install and update are idempotent and drift-aware: running them again on an already-current
consumer is a no-op, and running them on a drifted one reconciles it without discarding
consumer-specific declarations.

### 34.1 One model across repositories and machines

Machine-scoped and repository-scoped work must resolve through one semantic model rather than
a repository mode and a machine mode. A machine-scoped consumer is not a separate kind of
target; it is the same kind of target with a different scope.

- A capability behaves identically whether it is invoked in a working tree, on a host, or in CI. There are no per-location code paths and no host-only or repository-only capability variants.
- A declaration means the same thing in a repository and on a machine. Where a consumer's machine-level configuration is authored in a foreign declaration format, df resolves and composes it in that format (§10) rather than requiring it to be re-expressed.
- The boundary between repositories, machines and hosting types is not a place the system degrades. Support is stated as one behaviour, not as a matrix of what is known to work where, because a matrix is a standing promise to maintain and each per-location special case is a place an abstraction has leaked.
- Identifiers for repositories, machines, capabilities and providers are stable and comparable, so a declaration written for one target resolves correctly on another.

## 35 Security requirements

- No credential/token/private key in source, logs, issues, PRs, docs or Pages assets.
- Browser packages have enforced import boundaries from machine-secret code.
- Third-party capabilities receive only declared/scoped credential access.
- GitHub user authorization is not treated as GitHub App installation authority.
- History rewriting uses lease-safe expected-old-SHA semantics; blind force push is forbidden.
- Recovery never pushes secret-bearing local material.
- Authentication and authorization failures fail closed.

## 36 Final acceptance

DarkFactory is final only when the exact pre-merge candidate has passed the declared acceptance and consumer contract and the final canonical publication can reproduce it without behavioral source changes, and:

- df is the only normal production orchestration/mutation engine;
- production orchestration and mutation are owned by the final TypeScript df system;
- the §9 architecture is shipped and the tree is a restructure, not a parallel implementation;
- official capabilities are proven and reachable from every surface;
- identity custody and human-authentication boundaries are proven, across every supported proof type and
  acquisition flow, with split custody exercised rather than merely implemented;
- real TypeScript API docs are published;
- §39 is deterministic and current from §37 and §38; this document remains the single product document;
- `Surfaces/Renderer/` is deployed to consumers without a frontend rebuild per consumer;
- the source-free pre-merge candidate installs/updates cleanly, and the canonical publication reproduces that behavior;
- the supported consumer set passes governance, detection, capability, docs/web, release-candidate and drift checks before the integration merge;
- `audit.df` is internally consistent;
- installed acceptance is green across the supported consumer set before merge;
- the declarable-graph product contract passes against the installed exact-head candidate and is re-smoked against the canonical publication.

### 36.1 Invariant acceptance

Every invariant in §8 is accepted by the check in its right-hand column, and the system is not final
while any of them can fail. That is the whole of it: there is no second statement of the invariants
here, because a restatement is a second description and would be the failure §7.1 names.

### 36.2 Self-hosting acceptance

Self-hosting is a claim with a completion condition, not a milestone. It is met when a change
to DarkFactory is proposed, interpreted, planned, implemented, reviewed, verified and merged
**by DarkFactory**, with humans approving rather than authoring.

Concretely, before the system can be called final:

- a real change to DarkFactory has been carried end to end by df — intake, Planning, implementation, review/fix to a fixed point, verification, governed merge and reconciliation — without a human authoring the change;
- the abstractions the system depends on are sufficient construction material for the system itself; a proposal that cannot be built by df is evidence the abstraction is wrong or the boundary is misplaced, not that the proposal should be hand-written;
- the bootstrap is named and accounted for: whatever executes the first systems-layer declaration is identified, and its removal path is stated. A seed that nothing else can rebuild is a permanent core outside the system's own guarantees;
- a capability's runtime surface is presented to an agent session rather than fixed, and an agent mutation is staged and reversible;
- removing the agent from a representative delivery leaves the delivery incomplete, demonstrating that the agent is an operator of the system's abstractions rather than a consumer of a fixed tool list.

# Part IV — Governance

## 37 The practices as obligations

A rule earns its place in this document by being a **core architectural pattern or an engineering
practice of DarkFactory** — something the system depends on, or something about how work is done *on*
the system. Rules that are neither are hygiene, and hygiene belongs in a repository's contributing
guide rather than in the specification of a product.

What follows is therefore the obligation set of §6 and §7, and nothing else. Each rule names the
pattern or practice it enforces. A rule that could be deleted without the argument in §6 or §7 being
weaker is a rule that does not belong here.

| rule | enforces |
| --- | --- |
| `DF-RULE-001` | §7.6 — prove with invariants, not prose |
| `DF-RULE-002` | §7.1 — documentation is the contract |
| `DF-RULE-003` | §6.3 — one description, and the direction of specification |
| `DF-RULE-006` | §3.3, §7.6 — the derivation must be faster than the authored thing it replaces |
| `DF-RULE-007` | §7.2 — a change is a declared difference, captured verbatim |
| `DF-RULE-009` | §7.2 — one integration authority, so a version has one author |
| `DF-RULE-010` | §6.3 — agentic behaviour is content, and is derived like anything else |
| `DF-RULE-011` | §6.3 — custody is a seam, not a file beside the code |
| `DF-RULE-012` | §7.5 and §6.4 — one owner per concern, and the old owner is deleted |
| `DF-RULE-013` | §7.3 — convergence is only safe if the world it moves is under a lock |

### 37.1 DF-RULE-001 — Tests prove invariants

Every behavior or contract change MUST be covered by tests that prove observable invariants, state
transitions, failure behavior or integration contracts.

Tests MUST survive valid refactors. They must not assert exact implementation filenames,
source-code substrings, function or class names, step labels, copied command text, or the presence of
an internal file merely because the current implementation happens to use it. Static architecture
tests are appropriate only for real static contracts, and MUST inspect semantic structure — parsed
manifests, schemas, dependency graphs, package exports, generated artifacts, public interfaces —
rather than brittle source grep.

Concurrency-sensitive behavior MUST be tested concurrently. Idempotency and crash-safety claims MUST
exercise duplicate invocation and the relevant crash window, not only call the same function twice
after a successful journal write. Atomicity claims MUST test interruption between transaction steps.

Every first-party package or capability MUST own or be explicitly covered by one canonical detected
test action; coverage that happens only because an aggregate test imports the package is not
sufficient. Duplicate or shadowed test definitions and copied test blocks are forbidden. Applicable
test actions come from the declared repository/package detection plus capability-resolution contract,
and all applicable suites MUST pass before a head is considered green.

### 37.2 DF-RULE-002 — Inline documentation and generated documentation

Public source APIs MUST be documented inline, in the systems layer's own language, on every exported
public symbol.

Documentation MUST be generated from canonical source and architecture records, and generated sites
and content graphs are CI outputs that MUST NOT be committed. This document is the
product-documentation homepage; the rules and decisions below are the canonical current note set;
root `README.md` is a symlink to this document; the agent guidance in §39 is a deterministic
projection. These discovery surfaces are never authorities and are never edited directly. CI MUST
fail on deterministic projection drift and on missing or orphaned rule↔decision relations.

A repository/tool discovery alias may point at a canonical document or generated projection only when
it serves a current external or conventional entry point. Aliases remain links rather than copied
authored documents, and unsupported legacy aliases are forbidden.

### 37.3 DF-RULE-003 — Product requirements and decisions

This document defines product requirements and architecture. Current active Requests define
approved feature-specific behavior. Accepted decisions in §38 record durable architecture decisions
and their rationale, and each declares the rules it constrains; a rule with no decision behind it and
a decision constraining no rule are both currentness failures.

Specification proceeds in one direction, and each stage settles before implementation depends on it:

```text
this document  →  an accepted decision, when a durable architecture decision is required  →  Request/Planning
```

A material deviation from this document MUST be owner-approved and recorded as an accepted decision
before implementation. Superseded decisions leave the live graph and remain in version history.


### 37.4 DF-RULE-006 — Deterministic quality

Formatting and linting are deterministic automation, not a review topic. The declared detection and
capability-resolution contract determines the formatter and linter for each detected package or
ecosystem, and the mutation path applies formatting before creating a commit. There MUST NOT be a
second workflow-specific command map: local verification and CI consume the same normalized result.
Lints are blocking where supported, and generated artifacts are excluded only by explicit canonical
policy.

CI derives **one** normalized quality contract from detected packages plus applicable capabilities, and
fails closed when that contract has an unresolved required gap, ambiguity or unsupported action. A
warning is not an acceptable substitute for required test, typecheck, lint, format or documentation
coverage. Type safety is a first-class required action: every detected first-party package or
capability MUST be accounted for exactly once by an owning package action or an explicit
workspace-level action whose coverage can be proven, and incidental execution through an aggregate does
not count. The aggregate check is green only when every applicable required action for the current
head completed successfully; an action that is missing, stale, cancelled, skipped or neutral is not
success unless the canonical contract marked it not applicable before matrix construction.

CI validation is read-only with respect to the delivery branch. It reports drift and MUST NOT
asynchronously create or push corrective commits that advance an active branch after the orchestrator
has integrated or proven a head.

The canonical branch MUST remain green on its required checks; a red canonical branch is a stop-the-line
event for repository-wide delivery until restored. A failing topic or recovery branch blocks that
branch and its dependents but does not halt unrelated branches whose own required checks are green.
Required checks are synchronized with branch protection and evaluated for the exact current head, and a
branch may not merge while any required check or invariant is red, missing, stale or unevaluated.

*Rationale.* A single green status means something only when its underlying coverage is complete, and
failing closed on quality gaps stops a package escaping tests or typechecking because it forgot to
declare a script. Read-only CI preserves exact-head evidence and stops background automation racing
deterministic orchestration.

*Exceptions.* A quality action may be explicitly disabled only in the canonical contract, with a
reason appropriate to that package. Absence of a script or tool is not by itself an exception, and an
unsupported or missing action is diagnosed rather than silently treated as passing. No session may
invent, silently drop or weaken required coverage.

### 37.5 DF-RULE-007 — Work intake and specification

Every incoming governed task MUST be represented by one or more tracked Requests before implementation,
and every delivery PR MUST explicitly bind every **active** Request it satisfies. The owner's verbatim
wording is preserved.

**Decomposition follows delivery independence, not size.** Do not split tightly coupled architecture
to satisfy a one-PR/one-issue shape, and do not manufacture child Requests for a process shape. A
large coupled body of settled work may remain one Request, one Planning record and one PR when the
owner chooses one coherent integration and validation contract. An Epic is used when genuinely
independent child Requests benefit from separate lifecycle, ownership, sequencing or delivery; epics
organize Requests, are not mandatory wrappers, and never waive child Planning or evidence.

**Issues track settled intent and executable work, not unresolved debate.** An issue may be filed when
its outcome is settled by this document or §38, or when it is a concrete mechanical task whose outcome
is not in question. Open architecture questions stay with the owning product or decision until settled.

**Consolidation preserves intent first.** When the owner consolidates separate Requests into one, the
consolidated Request MUST first carry the relevant verbatim owner direction and all still-current
required behavior; only then are the duplicates closed as historical traceability. A PR may satisfy
several Requests only when shared Planning proves every active bound Request has valid coverage, and
epic membership or stack topology never implies completion by itself.

One unified Planning artifact is produced from the verbatim Request and authoritative context, and is
handed to the single review, approval and alignment lifecycle in §24. There is no separate
interpretation approval lifecycle and no second Planning gate.

The active Request/Planning record is the single live work ledger; concrete steps, checkboxes,
approvals and evidence live there with the workflow graph and GitHub state. Status uses one canonical
reconciliation model with seven states — `Backlog`, `ToDo`, `In Progress`, `Blocked`, `Done`,
`Superseded`, `Dropped` — and a Request reaches Done only from its own terminal evidence or explicit
valid shared-Planning completion. Webhook and event payloads are triggers, not authoritative
snapshots: the desired state is derived from current evidence, and a stale or out-of-order event may
never roll a newer status backward.

Failures already associated with a delivery PR or Request are recorded as check/run evidence on that
bound work rather than creating a new implementation Request; a standalone unbound or default-branch
operational failure may use one deduplicated incident record. Merged delivery branches are cleaned up
when safe, and a branch with unique unrepresented recovery or stack work is not deleted merely because
another PR merged.

*Rationale.* Verbatim capture protects intent; consolidation is safe only when it preserves intent
before older records become historical; and deriving status from current evidence rather than from
event order is what keeps a delayed webhook from un-filing finished work.

### 37.6 DF-RULE-009 — Integration authority

Parallel implementation has one integration authority per delivery branch. The orchestrator alone
advances the authoritative remote delivery branch and owns integration. Parallel workers use isolated
local worktrees or branches with explicit prerequisites and disjoint subsystem and path ownership; they
do not create competing remote delivery branches or PRs, and do not mutate the integration branch.
Shared integration surfaces — root manifests and lockfiles, package export maps, workflow and config,
this document, rules, decisions, and generated projections — stay orchestrator-owned unless one
non-overlapping edit is explicitly delegated.

A worker returns a coherent commit SHA, changed-file set, targeted verification and assumptions. The
orchestrator integrates those commits in dependency order, resolves shared files semantically, and
re-runs affected gates. A dependent lane starts only after the interface it consumes is integrated and
verified on the authoritative branch; do not parallelize across unsettled shared interfaces. CI is
read-only on delivery branches, and each implementation gate records exact-head evidence before
downstream work treats it as satisfied.

*Exceptions.* A human may explicitly transfer integration authority, but there is still only one active
integration owner for a delivery branch at a time. Single integration authority, worker isolation and
exact-head evidence are the invariants; the concrete worker implementation may change.

### 37.7 DF-RULE-010 — Capability-driven agent runtime and resilience

DarkFactory runs agentic work through the TypeScript df runtime rather than a hard-coded harness
registry. Execution, routing primitives and persistence live in one owner; capability discovery,
loading and resolution live in another. Agentic and product behaviours are versioned capabilities.

One canonical capability implementation generates the native, MCP, and supported agent skill, plugin
and manifest forms. Pipeline stages pass explicit task kind where known; undeclared inference separates
subject from required capability. Provider, account and model selection respects sensitivity,
data-collection policy, capability requirements, quotas and capability tiers. Exhaustion or failure
moves through the configured eligible failover chain without repeating deterministic effects. Every
logical agent stage has one bounded elapsed-time budget across model failover and tools.

Natural model stop is accepted; mutation truth comes from observed effects. Quota and provider
interruption checkpoint durable state and resume without duplicating completed effects. CI agent
execution remains containerizable and non-root.

### 37.8 DF-RULE-011 — Security and secrets

No credential, access token, refresh token, cookie, client secret or private key may be committed,
logged, written to issues or PRs, included in generated documentation, or embedded in static web
assets.

Credential custody has one owner. Everything else declares its credential requirements and receives
scoped handles; it does not read raw credential files, secret environment variables or OS keychains
directly. Browser artifacts have enforced import boundaries from machine-secret code, and browser
bundles cannot import keychain, private-key or server-confidential code.

Human/browser authentication is owned separately from machine custody. A web auth broker may hold only
the credentials required for confidential user-token exchange and refresh, and is not a state or
execution backend. GitHub user authority and GitHub App installation authority remain distinct, and
authentication and authorization failures fail closed.

Recovery never pushes secret-bearing local material; such material is preserved locally and blocked
from publication rather than leaked or discarded. A proof is not the same as a credential and not the
same as an authorization, and this rule governs custody rather than what a caller may do — §28 and
§29 own those.

### 37.9 DF-RULE-012 — Final architecture, DRY, and deletion

The repository targets the current final architecture directly. Every concern has one final owner and
one source of truth; duplicate implementations, registries, state stores, config contracts, command
maps and generated or manual copies are forbidden.

Reuse or move working code that already implements the required behavior, and delete its old owner
once the final owner is live. Final owners MUST NOT forward implementation to a deletion-bound tree.
Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are
forbidden unless an external supported contract explicitly required by this document needs them:
previous internal architecture is never a compatibility target and is not preserved in case.

Delete unreachable and dead code, stale configuration, unused assets, obsolete tests, superseded
documentation, abandoned feature flags and transitional adapters rather than documenting or testing
their presence. Abstract repeated mechanisms once at the lowest stable owner, and do not create
speculative abstractions for one caller or hide unrelated behaviour behind a generic helper to reduce
line count. Public exports are intentional product and extension contracts; internal helpers stay
private, and tests do not justify widening an API. Package and capability dependencies remain explicit
and acyclic.

### 37.10 DF-RULE-013 — Concurrency, atomicity, and idempotency

Authoritative state and external effects MUST remain correct under duplicate delivery, concurrent
execution, interruption and ambiguous transport failure.

Serialize authoritative transitions at the identity they mutate — run, effect, account, branch,
worktree, quota reservation, release. Check-then-act without an atomic claim, lease or compare-and-swap
is not sufficient. A deterministic external effect ID may produce at most one logical mutation;
concurrent duplicates cannot both enter the mutation, and crash recovery reconciles observed external
state before retrying.

Remote writes use expected-old-version or SHA semantics, or equivalent conditional semantics, and fail
closed on stale state. Mutation retries are method- and effect-aware: after an ambiguous write outcome,
reconcile first and never blindly replay a non-idempotent write because a transport or server error
occurred. Authoritative file and state updates are crash-consistent; multi-file logical state uses one
generation boundary, and lock recovery cannot delete a replacement owner's lock. Replicated state
converges deterministically regardless of merge direction and represents deletion explicitly until it
is safe to compact. Quota and capacity are reserved atomically before concurrent work is dispatched and
settled from observed usage.

Concurrency, idempotency and atomicity claims are tested at the actual race and crash windows, with
simultaneous actors and fault injection.

## 38 Decision log

An accepted decision that has been implemented is no longer a decision — it is the design. What is
kept here is the log: what was decided, the one reason it was decided, and the rules it constrains. A
decision that constrains no rule has been removed, because it was either superseded or was never a
constraint — the language convention is the second kind, and a rule every contributor must satisfy is
not a statement about the system.
The full rationale for the *thinking* is §45, and the current requirement text is Part III, so a
second copy of either would be a second description of something already stated.

| #        | decision                                                                   | why                                                                                                                                                                                                     | constrains                                           |
| -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| ADR-0006 | The pipeline runs only df                                                  | The production pipeline has one execution owner and one routing/credential/quota model.                                                                                                                 | §37.8, §37.7                                     |
| ADR-0008 | Providers are configuration-driven                                         | Adding or changing a provider is primarily a configuration/data change.                                                                                                                                 | §37.8, §37.7                                     |
| ADR-0009 | Accounts have named credential slots                                       | Routing and quota state can address accounts independently.                                                                                                                                             | §37.8, §37.8                                     |
| ADR-0011 | The quota engine is the availability authority                             | All routing and operator status surfaces consume one availability model.                                                                                                                                | §37.8, §37.7                                     |
| ADR-0012 | Routing is limit-aware and capability-tiered                               | Lightweight models can serve appropriate work without consuming scarce high-capability capacity, while sensitive and capability-constrained work still fails closed.                                    | §37.8                                              |
| ADR-0013 | df runs the workflow graph                                                 | Execution state is durable and resumable.                                                                                                                                                               | §37.6, §37.6, §37.8, §37.8, §37.8, §37.7 |
| ADR-0015 | The engine owns deterministic steps                                        | Models are not required to print control JSON, perform git operations or submit completion tools.                                                                                                       | §37.6, §37.7                                      |
| ADR-0016 | Model resolution is live                                                   | Model availability can change without editing routing source.                                                                                                                                           | §37.8                                              |
| ADR-0017 | Modular packages and first-class capabilities                              | Package dependencies remain acyclic and browser-safe boundaries are explicit.                                                                                                                           | §37.8, §37.7                                     |
| ADR-0019 | GitHub backs the web control plane                                         | The web application does not maintain a second project database or privileged mutation backend.                                                                                                         | §37.8, §37.6, §37.8, §37.7                    |
| ADR-0020 | Browser auth and machine keychain are separate trust boundaries            | Human authorization and machine automation authority remain distinct.                                                                                                                                   | §37.8, §37.7                                     |
| ADR-0021 | Repository declarations, runtime detection and capability-resolved actions | Repository behavior is determined by current declarations plus detected evidence and capability resolution.                                                                                             | §37.3, §37.6, §37.5                              |
| ADR-0022 | Complete the final system directly                                         | Completion sequencing is optimized for the shortest safe path to one final, proven merge.                                                                                                               | §37.3, §37.8, §37.7, §37.7                    |
| ADR-0023 | First-party docs use the combined docs block and one renderer              | Documentation has one compiler/configuration contract and one first-party renderer while product docs, rules and long-term notes retain distinct canonical sources and generated discovery projections. | §37.2, §37.3                                       |
| ADR-0024 | Effects are serializable and authoritative state is crash-consistent       | Crash recovery and concurrency safety are one protocol rather than separate best-effort features.                                                                                                       | §37.7                                              |
| ADR-0025 | Each delivery branch has one integration authority                         | Parallelism improves throughput without introducing lost updates, shared-file races or evidence attached to obsolete heads.                                                                             | §37.5, §37.6, §37.7                              |
| ADR-0026 | Verification proves invariants and fails closed                            | A green head means the declared invariants were actually evaluated.                                                                                                                                     | §37.1, §37.6, §37.6                               |
| ADR-0028 | Integrate Paper as a repository domain                                     | The Paper remains a first-class repository concern without creating a second documentation owner or a second product surface.                                                                          | §37.10                                              |

## 39 Agent guidance

An agent reads §37 directly. There is no projection of the rules, and that is deliberate: a
projection is a second description of the rules, which is the thing §7.1 forbids, and the earlier
projection of this section was the clearest instance of the failure in the document arguing against
it.

What an agent gets instead is the document itself — the pattern and the practice in §6 and §7, the
mechanism in Part III, and the requirements in Part IV — which is a better onboarding surface than a
restatement of ten rules would have been, because it explains *why* each obligation exists rather than
only that it binds.

## 40 How to tell if this is wrong

A design that cannot be falsified is a mood. §5.3 gives the countable half — the number of sites
where meaning is authored. These are the failures a count cannot see, each stated as something that
would be observed rather than felt.

**Reading hardens into a wall.** Extension means editing the interpreter, because the systems layer
can only be written the way the first loader expected. This is the likeliest failure and the most
damaging: it converts a forge into a frozen artefact while everything still looks like a forge.
*Test:* how many features required a change to the interpreter rather than a new file. Zero, and a
project where it is not has already become the thing it set out to replace.

**Derivation becomes slower than authoring.** A system's worth is its latency, not its elegance. If
a hand-authored interface is quicker to produce than a derived one — or if derivation has a cliff
where enough structure makes it non-linear, which is plausible and untested — then §4.6 has failed
and the rest decays from there. This arrives late and is hard to attribute, because it looks like
ordinary friction. *Test:* a slope, not a threshold. The wall-clock cost of the second feature of a
kind must fall below the first. This is the one number in this document nobody has yet produced, and
the claim rests on it.

**The seams prove insufficient.** Binding existing systems stops providing enough construction
material and the project retreats into implementing organs. *Test:* can `Change/`, `Identity/` and
the interpreter express a real change to DarkFactory without anything being owned twice? The
temptation is always to add one organ "just for this", and it is always cheaper than the seam.

**A seam hardens into a menu.** The quiet one: substitutability keeps passing while the thing gets
worse. A caller can choose a backend but cannot combine one with a capability of their own, route
around a case the seam does not cover, or extend it without forking. This is the interpreter
hardening one layer out, and it is why a seam is judged on permeability as well — permeability is
what fails without anyone noticing. *Test:* did a real requirement arrive that the seam could only be
stretched to cover, and was the stretch possible at all?

**The abstraction leaks into the interfaces.** A surface names, selects, configures or reports an
agent; whatever the internals do, the seam has leaked where it matters most and §13.1 is false.
*Test:* a grep. Worth including precisely because it is mechanical — a property that can be checked
automatically should be, and its checkability is evidence the constraint is real rather than
aspirational.

**Location-dependent behaviour reappears.** Machines and repositories become two modes, with
per-location special cases, host-only capability variants, or a table of what works where. Each is
individually reasonable and collectively fatal. *Test:* does any capability have a variant that
exists only in one location, and is any new host a code change?

**Dynamic composition proves unaffordable.** Derivation is a real cost paid at the worst moment —
during a failure, when clarity matters most. Discovery can be cached, but caching makes a stale set
possible, which is a second source of meaning at miniature scale. *Test:* two halves, because the
failure has two faces. Compare resolution time and load-diagnosis time against what a barrel cost;
and ask whether an invalidated cache can ever be observably wrong, because if it can, §5.2 applies
to it directly.

**The corpus does not compound.** Adding the *N+1*th capability is not cheaper than the *N*th, and
the moat's economics do not hold. *Test:* whether the second capability costs what the tenth did —
and it should be reported publicly whether or not it flatters the design.

**Self-hosting stalls just short.** The system builds itself most of the time and the residue is
maintained by hand. The most seductive failure, because every step of progress is real and only the
fixed point distinguishes the result from a well-automated pipeline. *Test:* is the output of
compiling the system byte-identical to its input, with nothing reconciled in between? A system 95% of
the way there has a second description containing 5%, and that fraction does not stay put.

## 41 Non-goals

Stating what a system refuses is part of its design, because a goal without refusals is a wish.
Each of the following is excluded deliberately, and several are excluded *because* pursuing them
would require a second description of the system.

**Not a workflow engine for any one domain.** The mechanism expresses "act on a system through a
declared interface" and has no domain built into it. Repository work is the first application, not
the definition. A paper is a domain, mathematics is a domain, and a fleet of machines is a domain,
and the system should not notice the difference. If it can only ever do what its first application
did, it is a tool that grew a pipeline.

**Not a faster build for any one workload.** A general mechanism will not beat a hand-tuned graph
specialised to a repository. Trying would mean encoding per-project knowledge into the mechanism,
which is the second site of meaning wearing a performance budget. The honest claim is about
*maintenance*, not milliseconds: a system that describes itself once does not drift, and drift is
what makes builds slow over time.

**Not the system of record for problems others solve.** GitHub remains the durable control plane.
Version control is git. Toolchains are Nix's. A general system that accumulated its own answer to
every adjacent problem would be larger, worse, and would have reimplemented organs that §4.1 exists
to avoid.

**Not a new language.** The systems layer is TypeScript with a framework-provided standard library.
No parser, no type system, no error-reporting story, no compiler, and no second extension. A
prototype is ordinary TypeScript and joins by becoming a `.df` file, once, at the boundary.
Inventing a language would mean owning a toolchain to describe a system that already has a
perfectly good one, and it would put a syntax between an author and the system — which is a small
version of the problem this design exists to remove. Two extensions for one language would do the
same thing more quietly, and that is why there is only one.

**Not a permission model.** Identity is about *proving who you are* and is deliberately general;
who is *allowed* to do what is a different concern with a different owner, and conflating them
produces a system that is either unusable or unsafe. §28 states what identity does not decide.

**Not a debugger, an IDE, or a package manager.**

**Not a rendering technology per surface.** A surface is a *projection*, and a projection is not the
same thing as a technology it happens to be drawn with. The terminal aesthetic — a fixed grid, a
monospace grid of cells, pane navigation, command-palette-first interaction — is a **layout mode**,
not a second surface, and the distinction matters because conflating them produces two
implementations of one interaction model and a parity contract to keep them honest. A layout mode
changing is a renderer detail; a surface changing is a new place the system's meaning is read, and
that is a bigger event than it looks. `Surfaces/Terminal` is therefore one surface with two
presentations, not one surface and a half.
  These are consumers. The system's obligation
ends at the derived interface; anything a consumer needs that the interface does not expose is a
gap in the interface, and building the missing consumer tool here would be building a second
description of what the system is.

## 42 Related work

DarkFactory is not the first system to insist on a declarative description. This section is where
the moat is either load-bearing or decorative, and where a difference is thin it is said to be.

| Work                                             | Shares                                                                                        | Differs                                                                                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terraform / OpenTofu**                   | desired state, convergence, plan-before-apply                                                 | HCL is a separate authored language; the plan is an artifact reviewed apart from the system; each resource type is a hand-written plugin. Here the description*is* the implementation.                 |
| **Nix / NixOS**                            | one declarative description, reproducible output — the most disciplined instance of the idea | a DSL with a fixed evaluator, describing a*build* rather than a running system, with documentation outside it, and `mkDefault`/`mkForce` plumbing because the language is not the thing described. |
| **Bazel / Buck2 / Pants**                  | hermetic, derived from source, fast                                                           | `BUILD` files are hand-written beside the source — the second site of meaning exactly. They also describe *how to build* rather than what a system means.                                           |
| **Dagger, CI-as-code**                     | programmable pipelines, code as configuration                                                 | the pipeline is a second description of the work. Here the graph is a projection of the same resolution.                                                                                                 |
| **Convergent design**                      | one declarative description, convergence, anti-entropy                                        | nearly the same framing; the addition is extending the declarative description from*configuration* to *interfaces and documentation*, which is what makes surfaces free.                             |
| **Category theory** (monoidal, CCC, monad) | the natural language for composition and swappable interpreters                               | algebraic composition fixes the product. Here composition is structural discovery and the tensor is a folder, so adding a capability changes no monoid instance.                                         |
| **Free monads, algebraic effects**         | the standard encoding of a small vocabulary with several interpreters                         | a program still names its interpreter, and the composition set is assembled. Here a declaration names a backend and the set is discovered.                                                               |
| **Protobuf / OpenAPI / GraphQL**           | interface descriptions generated from code                                                    | the near miss this design rejects — see below.                                                                                                                                                          |
| **MCP, plugin manifests**                  | published contracts for agent integration                                                     | authored per integration, so each is a second place to update. Here the forms are derived.                                                                                                               |
| **`tsc`, language servers**              | why a systems layer need not invent syntax                                                    | adopted rather than extended: the systems layer is TypeScript, so all of it works unchanged.                                                                                                             |

Two comparisons deserve more than a row, because they are the ones a reader will assume are
equivalent.

**Nix is the strongest existing example and is still different in kind.** It has one declarative
description, which is most of the idea. But that description is a purpose-built language with a fixed
evaluator, so it is a *thing the author writes* rather than the thing they wrote — which is why an
ecosystem grew around it to express what the language could not. It describes a derivation to an
artifact, not a system that is running while you read it. The claim here is that the description and
the implementation can be the same artifact, and that documentation belongs inside it.

**Generated descriptions are the near miss, and the gap is small enough to close by accident.** The
intuitive fix for "a manifest drifts from the code" is to generate the manifest, and it is a real
improvement on maintaining it. It is also a trap with a long fuse: a generated description is still
consumed *as a description*, so a consumer is reading a claim about the system; the generator
becomes something that must be correct; and the moment someone needs a field it does not produce,
hand-writing it is locally reasonable. §5.2 and I1 exist to close that fuse.

## 43 Terminology

The vocabulary does real work in this document and the terms are not interchangeable.

**Meaning** — everything the system can know about itself, carried in names, signatures,
structure and documentation. Never a second time.

**One site of meaning** — the constraint that meaning is written once, in the code, and read from
there. §5.

**Derivation** — reading a feature's interface out of the feature. The opposite of authoring. §4.3.

**Resolution** — the result: the derived meaning of the whole system at a given scope, including
which backends are bound and what each feature means. A *resolution* is what compilation emits, what
surfaces project, and what convergence compares against.

**Interface declaration** — the derived description of one feature: name, inputs, outputs,
documentation, and where it sits. What every surface publishes and what an agent reads.

**Seam** — a small vocabulary with several implementations, chosen by a declaration. `Change/`,
`Identity/`, `Browse/` and the interpreter are seams. §4.1.

**Organ** — the implementation behind a seam: git, GitHub, an OS webview, Nix, Tauri. Never owned.

**Askable feature** — the unit a caller can request on its own, and therefore the unit of one
file. §4.4.

**Convergence** — observing reality, comparing against derived intent, and acting to close the
difference. One-directional. §4.5.

**Fixed point** — the system compiled by itself resolving to itself, byte-identical, with no
reconciliation. The completion condition. §4.

**Generation** — an applied declaration's recorded result: a parent, a diff and an author. Audit
and undo are one mechanism, not two.

**Proof** — the material that satisfies an authentication challenge. May be stored, derived, or
exist only during a flow. Not the same as a credential, and not the same as an authorization. §28.

**Holder** — a place identity material is kept. A holder is not authoritative when material is
split across several.

**Presenter** — a surface bound to a session so that a human and an agent see the same resolution.
§13.

**Authored meaning** — any description of a feature written beside the feature. The thing the count
in §5.3 measures, and the only number this design is honest about.

## 44 Relationship to the paper

Binding on every contributor, human or agent, regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated.

## 45 Provenance

Synthesised from an earlier machine-scope scoping exercise that was never built and that
DarkFactory supersedes: its kernel doctrine of binding existing services rather than reimplementing
them, its one-declaration/one-modification-surface/one-audit-trail structure, its generations
model, and its decision to keep a mature system's own language rather than replace it. Those are
inputs to the thinking here, not components of this system and not dependencies of it.

Also informed by the Cordis service-row composition used in the dsh profiles.

Six decisions here were worked out elsewhere first and are adopted rather than reinvented: that
self-optimisation needs no mechanism of its own and runs through the ordinary approval path; that
identity is a hash of inputs rather than a timestamp, and that an undeclared input is therefore a
correctness bug rather than a missed optimisation; that the operation log belongs to the system so
a backend is removable rather than merely substitutable; that a runtime change is written to the
declaration and never to an overlay; that one option schema serves the settings surface, the
documentation and the agent's vocabulary at once; and that content-addressed custody needs
convergent encryption keyed per holder or deduplication and confidentiality are mutually exclusive.

Two of them changed this document rather than filling a gap in it. The claim that the system's own
parts are reached only across process boundaries, and the distinction between a surface and a
layout mode, are both sharper than what was here — the first because a folder name is a claim about
naming where a boundary is a claim about failure, and the second because a rendering technology is
not a place meaning is read. The structural frame in §5 — three unifiers and five operations — is
also not new: it is the shape those decisions had in common, which is why it is stated once instead
of being rediscovered per section.

The one place this document departs from its sources is deliberate and marked where it occurs:
§11.1 and §18 argue that owning `.df` is not the same decision as owning a declaration language,
because DarkFactory authors its own systems layer and binds everyone else's.
