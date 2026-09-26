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

- [6 Invariants](#6-invariants)
- [7 Architecture](#7-architecture)
  - [7.1 Structure is the declaration](#71-structure-is-the-declaration)
  - [7.2 Declaration and implementation are separate files](#72-declaration-and-implementation-are-separate-files)
  - [7.3 The tree](#73-the-tree)
  - [7.4 Identity is not scoped to a caller](#74-identity-is-not-scoped-to-a-caller)
  - [7.5 Rules the structure must satisfy](#75-rules-the-structure-must-satisfy)
- [8 Interpretation](#8-interpretation)
  - [8.1 One askable feature is one file](#81-one-askable-feature-is-one-file)
- [9 Compose, and bind only where it is cheaper](#9-compose-and-bind-only-where-it-is-cheaper)
  - [9.1 The interpreter is the same seam applied to language](#91-the-interpreter-is-the-same-seam-applied-to-language)
- [10 Remove the friction](#10-remove-the-friction)
- [11 AI-first](#11-ai-first)
  - [11.1 What the harness is actually for](#111-what-the-harness-is-actually-for)
  - [11.2 Why execution is separate from reading](#112-why-execution-is-separate-from-reading)
- [12 Self-heal: convergence, not reversion](#12-self-heal-convergence-not-reversion)
- [13 Self-building, and why it is a stronger claim](#13-self-building-and-why-it-is-a-stronger-claim)
- [14 Declarable by nature](#14-declarable-by-nature)
- [15 Structure is the interface](#15-structure-is-the-interface)
- [16 The systems layer: `.df`](#16-the-systems-layer-df)

**Part III — Requirements**

- [17 Authority](#17-authority)
- [18 Product vision](#18-product-vision)
- [19 Actors](#19-actors)
- [20 Capability architecture](#20-capability-architecture)
- [21 Domains, ecosystems and project detection](#21-domains-ecosystems-and-project-detection)
- [22 Configuration and state](#22-configuration-and-state)
  - [22.1 Configuration](#221-configuration)
  - [22.2 Documentation configuration and output](#222-documentation-configuration-and-output)
  - [22.3 State](#223-state)
- [23 Governed Request lifecycle](#23-governed-request-lifecycle)
- [24 Runtime, routing and resilience](#24-runtime-routing-and-resilience)
- [25 Change and governance](#25-change-and-governance)
- [26 Identity](#26-identity)
- [27 Human authentication](#27-human-authentication)
- [28 Documentation](#28-documentation)
- [29 Renderer](#29-renderer)
- [30 Terminal](#30-terminal)
- [31 Installation, release and versioning](#31-installation-release-and-versioning)
- [32 Consuming df](#32-consuming-df)
  - [32.1 One model across repositories and machines](#321-one-model-across-repositories-and-machines)
- [33 Security requirements](#33-security-requirements)
- [34 Final acceptance](#34-final-acceptance)
  - [34.1 Invariant acceptance](#341-invariant-acceptance)
  - [34.2 Self-hosting acceptance](#342-self-hosting-acceptance)

**Part IV — Governance**

- [35 Contribution rules](#35-contribution-rules)
  - [35.1 DF-RULE-001 — Tests prove invariants](#351-df-rule-001--tests-prove-invariants)
  - [35.2 DF-RULE-002 — Inline documentation and generated documentation](#352-df-rule-002--inline-documentation-and-generated-documentation)
  - [35.3 DF-RULE-003 — Product requirements and ADRs](#353-df-rule-003--product-requirements-and-adrs)
  - [35.4 DF-RULE-004 — English language consistency](#354-df-rule-004--english-language-consistency)
  - [35.5 DF-RULE-005 — Commit granularity](#355-df-rule-005--commit-granularity)
  - [35.6 DF-RULE-006 — CI readiness and verification](#356-df-rule-006--ci-readiness-and-verification)
  - [35.7 DF-RULE-007 — Branch and pull request workflow](#357-df-rule-007--branch-and-pull-request-workflow)
  - [35.8 DF-RULE-008 — Automated formatting and linting](#358-df-rule-008--automated-formatting-and-linting)
  - [35.9 DF-RULE-009 — Request binding, branch cleanup and board status](#359-df-rule-009--request-binding-branch-cleanup-and-board-status)
  - [35.10 DF-RULE-010 — Reviewed Planning and implementation alignment](#3510-df-rule-010--reviewed-planning-and-implementation-alignment)
  - [35.11 DF-RULE-011 — Pull request review approval and governed merge](#3511-df-rule-011--pull-request-review-approval-and-governed-merge)
  - [35.12 DF-RULE-012 — Verbatim Request capture and Planning gate](#3512-df-rule-012--verbatim-request-capture-and-planning-gate)
  - [35.13 DF-RULE-013 — Specification sequence and work tracking](#3513-df-rule-013--specification-sequence-and-work-tracking)
  - [35.14 DF-RULE-014 — Capability-driven agent runtime and resilience](#3514-df-rule-014--capability-driven-agent-runtime-and-resilience)
  - [35.15 DF-RULE-015 — Commits, repository taxonomy and domains](#3515-df-rule-015--commits-repository-taxonomy-and-domains)
  - [35.16 DF-RULE-016 — Security and secrets](#3516-df-rule-016--security-and-secrets)
  - [35.17 DF-RULE-017 — Final architecture, DRY, and deletion](#3517-df-rule-017--final-architecture-dry-and-deletion)
  - [35.18 DF-RULE-018 — Concurrency, atomicity, and idempotency](#3518-df-rule-018--concurrency-atomicity-and-idempotency)
  - [35.19 DF-RULE-019 — Orchestrated integration and worker isolation](#3519-df-rule-019--orchestrated-integration-and-worker-isolation)
  - [35.20 DF-RULE-020 — Paper authorship and publication](#3520-df-rule-020--paper-authorship-and-publication)
- [36 Architecture decisions](#36-architecture-decisions)
  - [36.1 ADR-0006 — The pipeline runs only df](#361-adr-0006--the-pipeline-runs-only-df)
  - [36.2 ADR-0008 — Providers are configuration-driven](#362-adr-0008--providers-are-configuration-driven)
  - [36.3 ADR-0009 — Accounts have named credential slots](#363-adr-0009--accounts-have-named-credential-slots)
  - [36.4 ADR-0011 — The quota engine is the availability authority](#364-adr-0011--the-quota-engine-is-the-availability-authority)
  - [36.5 ADR-0012 — Routing is limit-aware and capability-tiered](#365-adr-0012--routing-is-limit-aware-and-capability-tiered)
  - [36.6 ADR-0013 — df runs the workflow graph](#366-adr-0013--df-runs-the-workflow-graph)
  - [36.7 ADR-0015 — The engine owns deterministic steps](#367-adr-0015--the-engine-owns-deterministic-steps)
  - [36.8 ADR-0016 — Model resolution is live](#368-adr-0016--model-resolution-is-live)
  - [36.9 ADR-0017 — Modular packages and first-class capabilities](#369-adr-0017--modular-packages-and-first-class-capabilities)
  - [36.10 ADR-0019 — GitHub backs the web control plane](#3610-adr-0019--github-backs-the-web-control-plane)
  - [36.11 ADR-0020 — Browser auth and machine keychain are separate trust boundaries](#3611-adr-0020--browser-auth-and-machine-keychain-are-separate-trust-boundaries)
  - [36.12 ADR-0021 — Repository declarations, runtime detection and capability-resolved actions](#3612-adr-0021--repository-declarations-runtime-detection-and-capability-resolved-actions)
  - [36.13 ADR-0022 — Complete the final system directly](#3613-adr-0022--complete-the-final-system-directly)
  - [36.14 ADR-0023 — First-party docs use the combined docs block and one renderer](#3614-adr-0023--first-party-docs-use-the-combined-docs-block-and-one-renderer)
  - [36.15 ADR-0024 — Effects are serializable and authoritative state is crash-consistent](#3615-adr-0024--effects-are-serializable-and-authoritative-state-is-crash-consistent)
  - [36.16 ADR-0025 — Each delivery branch has one integration authority](#3616-adr-0025--each-delivery-branch-has-one-integration-authority)
  - [36.17 ADR-0026 — Verification proves invariants and fails closed](#3617-adr-0026--verification-proves-invariants-and-fails-closed)
  - [36.18 ADR-0027 — Repository-authored artifacts use English](#3618-adr-0027--repository-authored-artifacts-use-english)
  - [36.19 ADR-0028 — Integrate Paper as a repository domain](#3619-adr-0028--integrate-paper-as-a-repository-domain)
- [37 Agent guidance](#37-agent-guidance)
- [38 How to tell if this is wrong](#38-how-to-tell-if-this-is-wrong)
- [39 Non-goals](#39-non-goals)
- [40 Related work](#40-related-work)
- [41 Terminology](#41-terminology)
- [42 Relationship to the paper](#42-relationship-to-the-paper)
- [43 Provenance](#43-provenance)

## Abstract

DarkFactory is a kernel over meaning. It reduces everything it touches to three things: a **normal
form**, in which anything a system knows about itself is an interface derived from the code that
implements it; an **address**, by which every feature, setting, file, task and version is reachable
by any surface, tool or agent; and a set of **seams** it guarantees rather than discovers and never
owns. Five operations run over that structure and nothing lies beside them: derive structure into
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

| | operation | what it is |
| --- | --- | --- |
| 1 | **derive** | structure becomes meaning — names, signatures, position and documentation become an interface |
| 2 | **address** | meaning acquires a stable identity that survives moving, renaming and rebuilding |
| 3 | **declare** | a difference is stated between what is and what should be |
| 4 | **converge** | the world is moved until the difference is closed, under approval |
| 5 | **version** | the result is recorded with a parent, a diff and an author, and is itself addressable |

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

The boundary that makes this safe is that changing the declaration is not drift. A human editing a
declaration has changed intent, and that is an ordinary governed mutation. Without this distinction
a healing system silently reverts every deliberate change a person makes, which is worse than not
healing at all. The second boundary is attribution: the system repairs drift it can attribute to
itself and reports what it cannot.

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

## 6 Invariants

Properties rather than features, each paired with the thing that catches its violation. A property
with no check is an aspiration, so each names its enforcement. Every one of these is a statement
about the finished system, and each is checkable.

| # | invariant | held by |
| --- | --- | --- |
| I1 | No file describes a feature except the feature | enumeration-only files are rejected; no barrel, registry, catalogue or manifest names what exists |
| I2 | Derivation is total — every feature is derived, with none dropped | a tree walk comparing the derived set against the discovered set, across overloads, re-exports and conditionals |
| I2a | Identity is a function of inputs, never of time | an interface's identity is the hash of what
  determines it — its content, its declared dependencies, and the environment it resolves under — so a
  skip is explainable by naming the input that changed. Input declaration must be complete, and an
  **undeclared input produces a wrong cache hit** — the same class of failure as a dropped feature under
  I2, so detecting undeclared inputs is part of the work rather than an extra |
| I3 | The published interface is the code's own | a feature with no doc comment is an error, not a blank; surfaces render the derived comment |
| I4 | Effects pass through a seam | a check rejecting direct filesystem, network and process access outside the seams |
| I5 | Nothing is published that was not compiled from a resolution | every artifact carries its resolution identity, verified before publish |
| I6 | Discovery is structural only | a test that adding a feature requires editing no other file |
| I7 | Drift is measured against derivation | convergence accepts only derived inputs, never a recorded copy of intent |
| I8 | The system is a fixed point | self-hosting acceptance: compiling the system with itself yields the same resolution |
| I9 | Presentation holds no behaviour | a surface cannot be imported by a non-surface |

I4 is the one everything above it depends on. While effects can bypass a seam, the seams are
documentation rather than boundaries, and nothing resting on them can be enforced or relied upon.

## 7 Architecture

DarkFactory is a DarkFactory workspace **and** a DarkFactory application. Both halves are
required, and neither is a mode.

As a workspace it hosts the framework: the concerns, the seams, the capabilities and the
surfaces that §7.3 sets out. As an application it is a consumer of that framework with no
private path — every folder it contains is a folder any consumer could contain, and every
capability it uses is one it could obtain. The DarkFactory repository is therefore its own
first consumer, and any behaviour that works only because of something specific to this
repository is a defect in the framework rather than a property of the application.

This is the structural form of §18's self-hosting requirement. Self-hosting is not only a claim
that df can build df; it is a requirement that the workspace and the application are the same
shape, so that "df built this" and "a consumer built this" are the same statement.

The consequence to hold onto when reading the tree below: nothing in it exists for DarkFactory's
benefit. `darkfactory/` is not the system's own directory with a privileged copy inside; it is
what any repository's copy looks like.

### 7.1 Structure is the declaration

Meaning lives in exactly one place: the code. Folders, file names, function names, signatures and doc
comments are the declaration, and the interpreter reads meaning from them. Nothing describes a
feature except the feature.

The rules that follow are stated with their reasoning in §8.1 and §15 — one askable thing per file,
no privileged subset, no barrels, no registries, discovery by structure, and documentation as part
of the contract. What is specific to *architecture* is only this: **there is no privileged
top-level subset.** A folder declares a concern, and the set of concerns is itself content, so a
concern can be added or removed without amending this document. The question "is this core or
content?" is not asked, because what a thing needs is already answered by where it sits and what it
sits beside.

### 7.2 Declaration and implementation are separate files

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

**Configuration is one convention, not four.**  An earlier shape of this document gave the root
a `*.dfconfig`, a graph file, and two `.json` files, which is three places to name a thing and
three ways for a repository to spell a convention it inherited rather than chose. Everything a
scope declares is now a block in one document, so the only thing that varies between repositories
is block *content*.

**The layers are process boundaries, not folder names.** A directory tree is a claim about naming;
a process boundary is a claim about what can go wrong. Each concern below runs as its own thing and
is reached only through a declared interface, so the guarantees are enforced by the runtime rather
than by a convention everyone is trusted to follow. This is the difference between saying `Execution/`
is separate and saying nothing inside it can be reached except through its seam — the first is
satisfied by a good folder name, the second is not satisfied by anything except isolation.

It also means a concern can be *removed* and take only itself with it. A folder name implies a
convention that outlives the folder; a process boundary implies nothing left behind, which is what
makes a backend removable along with its installation rather than merely substitutable.


### 7.3 The tree

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

### 7.4 Identity is not scoped to a caller

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

### 7.5 Rules the structure must satisfy

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

## 8 Interpretation

Reading is the whole of df's mechanism rather than one part of it, and it is the *same* reading
at every scale. A function, a file, a repository, a pipeline, a machine and a fleet are shapes it
resolves, and a design that needs a separate story for each of them is a design that will not
finish. §10 is where that sameness pays off across locations; the claim here is only that there is
one mechanism and not several.

Reading is itself bound through the same seam as any other system: a small vocabulary, several
implementations, and a declaration that names one. §9.1 carries that argument in full; the requirement
here is that no declaration language is privileged.

A feature's interface is **derived** rather than authored. It is read from the feature's names,
its signatures, its position in the tree and its documentation, and published to every surface.
No file states what a feature is, and no surface implements one.

- A declaration is interpreted through a named backend. TypeScript is the first-party backend for `.df`. Further backends exist so that declarations authored in another system's own language stay first-class instead of requiring translation into ours.
- A declaration written for a bound system remains in that system's language. What that
  means when a consumer's machine-level configuration is authored in another format is a
  requirement, and it is stated in §32.1.
- Backend selection is declarative. Capability availability is not conditional on which interpreter is present.
- Interpretation is read-only with respect to the declaration. Evaluating a declaration never mutates it; applying it produces state through the ordinary governed effect path.
- The interpreter is declarable: which backend interprets a declaration, and the systems layer and interpreter revision it loads, are chosen by declaration rather than hardcoded. A system that can describe its own configuration can describe the thing doing the describing.

This is what lets the system span machines and repositories under one semantic model: the interpreter is chosen per declaration, not per location.

### 8.1 One askable feature is one file

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

## 9 Compose, and bind only where it is cheaper

The goal is not to reach an existing system. It is to be able to **rearrange how a system is
used** without forking it, and that is a different property from access, and a stronger one.

Access is a fixed vocabulary: you get what the interface exposes. Composability means the
arrangement is not the interface's decision. A seam's job is therefore to **name a place in a
composition, not to fix a vocabulary** — and the whole discipline below follows from that
distinction rather than from a preference for not writing code.

We implement the seam and none of the organs. Version control is `git`, `gh`, `forgejo`, `gitlab`
or a bare directory; the browser is a system webview; toolchains are Nix; composable services are
Cordis rows. What we own is that those mean the same thing on every backend, compose with
everything else, and can be named in a declaration without a conditional.

```
ReadState:   <target>                 what is true out there
Snapshot:    <target>                 freeze a point in the world
Stage:       <target, paths, msg>     the only way to change a tree
Publish:     <target, ref>            the only way to move a ref
OpenChange:  <target, ref, title>     the only way to request review
Identify:    <who>                    who is acting
```

**Every line written to replace a mature tool is a line worse than what it replaces, and one
maintained forever.** But that sentence alone makes binding look like a tax, and the test in the
first draft of this document is why. It measured a seam against *the tool* — and that quietly
assumes the only alternative to a seam is the organ it wraps. The real alternatives are the tool,
another binding, and a composition of bindings, so the comparison is against **the best
construction available**, not against the tool. Measured that way, binding is usually cheaper,
which is the honest reason for it rather than the virtuous one.

A seam has two properties, and only the first is usually checked:

1. **Substitutability.** A different implementation is available, and the current one is not
   measurably worse than the best alternative available — in latency, error fidelity, or
   capability. This is the empirical half, and it is a measurement to take rather than a
   preference to defend.
2. **Permeability.** A caller can compose *around* the seam, or the seam decides the arrangement
   for them. This half is the one that fails silently. A seam that can only be used one way is a
   wall, and a wall is exactly where an abstraction leaks — the same failure §38 names when the
   interpreter hardens. A permeable seam is one a caller can route around, extend, or ignore for
   the cases it does not cover, and it stays usable when they do.

The two are independent, and the second is what makes the first tolerable. A substitutable seam
that is not permeable is a menu: several choices, none of them composable with anything the
caller has. A permeable seam that is not substitutable is worse — a single escape hatch with no
alternative behind it.

**This is not only about external systems.** Because interfaces are derived from structure
(§4.3) and discovery is structural (§15), the system's own features are composable inputs: a
consumer can take one, move it, combine it with something of their own, and the system reads the
new arrangement because it was never registered anywhere. So the seam is not a boundary around the
system — it is a claim that **nothing in the system is privileged, including the seams**. A
property of the system follows from the same property of every part of it, which is why the two
are worth stating once.

The practical payoff is an answer to every "this tool does not understand us" moment. A tool that
cannot be configured for the system is **a system to bind, not a system to fork** — the formatter,
the test discovery, the coverage reporter — and the surrounding system can host the binding
precisely because it is built from recombinable parts rather than a program with one fixed entry
point.

### 9.1 The interpreter is the same seam applied to language

The instinct on reaching for an interpreter is to bind one, TypeScript via Bun say. That is half
right, and the half that is wrong matters more: **an interpreter is a forge for declarations.**
A small vocabulary, several backends, and a declaration that names one. It is §9's shape applied to language rather than to version control, and recognising it
resolves two awkward requirements at once — a language is a place in a composition, not a
fixed vocabulary.

DarkFactory's own systems layer is TypeScript, so `.df` is TypeScript with a framework-provided
standard library and every editor, language server and `@types` package works unchanged. A system
DarkFactory *governs* may be declared in **its own** language, because a mature system usually
has one: Nix modules get typed options, merge semantics, `mkDefault`/`mkForce` and nixpkgs for
free rather than by our owning a language for them. One interpreter subsystem with a backend per
declaration language serves both. A TypeScript-only systems layer could not govern anything
declared in a language we did not choose, and would make "universal" aspirational.

## 10 Remove the friction

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

## 11 AI-first

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

### 11.1 What the harness is actually for

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

### 11.2 Why execution is separate from reading

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

## 12 Self-heal: convergence, not reversion

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

## 13 Self-building, and why it is a stronger claim

Self-hosting is that the system builds itself. Self-building is that it emits its own release
from the same reading that produced everything else.

The test is the second source of truth. If a separate hand-written pipeline described how to
assemble, bundle, sign and publish the system, then the system had two accounts of itself — what
the code says and what the build says — and self-hosting would be true only until they diverged.
The stronger claim is that there is no second account: compilation reads the system's meaning,
binds it to a version, and emits every surface form at that version. A version is not a label
applied at the end; it is part of what compilation resolved.

This is the same moat applied to distribution.  §9's substitutability
is necessary; this is the stronger property. If the code is buildable by semantics, the
artifacts are too, and the surfaces a capability appears on are a consequence of what it means
rather than a list someone maintains.

**Self-building is not a new mechanism, and saying so is the strongest form of the claim.** A design
that needed a *self-modification path* would be admitting that its ordinary path cannot express
"change me." Here it can: the system reads its own meaning, addresses its own nodes, declares a
difference against itself, converges, and versions the result. There is no privileged tuner, no
separate build-for-darkfactory routine, and no code path that exists only for the system to edit
itself — and the reason to insist is that a privileged path produces changes with no author, no
diff and no rollback, which is the precise failure §7 is written against. That it is the system
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

## 14 Declarable by nature

**Anything config-shaped in nature must be declarable rather than coded.** If a competent
operator could reasonably want to vary it without reading our source, it is data. If only someone
who has read the implementation could want it, it is code and should be code.

The discipline this adds is that **every resolution layer is inspectable**, because "the user
overrode the default" and "the default is this" are different facts, and an operator debugging a
surprise needs the difference.

## 15 Structure is the interface

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

## 16 The systems layer: `.df`

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
where an existing module system already is." §9.1 is why that does not apply. For what
DarkFactory **authors** we choose the dialect; for what it **binds** we do not and must not. We
are not replacing a mature system's language, we are making it reachable.

# Part III — Requirements

## 17 Authority

1. this document defines product requirements and architecture.
2. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope.
3. Accepted ADRs in §36 record durable decisions and rationale.
4. The scope's `*.dfconfig` document and the blocks it declares are executable declarations. No filename is canonical; see §22.1.
5. §35 defines mandatory contribution/governance behavior.
6. Generated docs/web views and §37 are projections, not independent sources of truth.

A material deviation from this document requires owner approval and an accepted ADR.

## 18 Product vision

DarkFactory is one system that is at once a library, a framework, a pipeline, a developer tool, a workspace manager and an operator of machines. Those are not products sharing a name; they are one capability — act on a system through a declared interface — observed at several scales: a function call, a file, a repository, a pipeline, a machine, a fleet.

A human supplies intent and approvals. DarkFactory performs planning, implementation, deterministic verification, review/fix iteration, alignment, Git/GitHub mutation, CI coordination, merge/reconciliation, release and audit through one production engine.

The system must be:

- **self-hosting** — df is implemented in df and maintained by df via df, so a change to DarkFactory is proposed, interpreted, planned, implemented, reviewed, verified and merged by DarkFactory with humans approving rather than authoring;
- **both tool and platform** — usable directly, and extensible by code DarkFactory has never seen, so the capability surface and `.df` are published contracts carrying a compatibility promise that internal refactors do not;
- **governed** — explicit approval gates bind human intent;
- **resumable** — interruption, quota exhaustion and conflicts do not lose completed effects;
- **truthful** — completion/mutation claims come from observed state, not agent prose;
- **AI-first** — the agent is a first-class operator of the same abstractions as any other caller, its capability set is presented rather than fixed, and its mutations are staged and reversible. Removing the agent must leave the system incomplete, otherwise this is a system with an agent attached;
- **extensible** — new project-specific behavior can be added as capabilities rather than rebuilding the framework;
- **unfrictional across machines, repositories and hosting types** — one semantic model with no location-dependent behaviour. A capability behaves identically in a working tree, on a host or in CI, and a declaration means the same thing in a repository and on a machine. Support matrices are not sufficient: each row is a promise to maintain and each per-location special case is a place an abstraction has leaked;
- **multi-domain** — one repository may contain code, papers, mathematics and other supported package types;
- **declarable** — anything config-shaped in nature is data rather than code, resolved through inspectable layers, and bound systems are reached through seams rather than reimplemented;
- **GitHub-native** — GitHub remains the durable issue/PR/check/project/event/authorization control plane;
- **source-free in production** — released df installs and runs without a DarkFactory source checkout.

Part I records why the system is shaped this way and is non-normative. Where it and the rest of this document disagree, the rest wins.

## 19 Actors

| Actor | Responsibility |
|---|---|
| Maintainer/operator | Supplies intent, approves Planning/scope amendments/final merge as required, operates df through `Surfaces/Terminal/` and `Surfaces/Renderer/`. |
| DarkFactory engine | Executes graph/runtime mechanisms, routing, persistence and deterministic effects. |
| Capability | Implements agentic/product behavior such as planning, review, git, docs, CI, recovery or domain-specific work. |
| DarkFactory GitHub App | Automation identity and privileged GitHub execution identity. |
| Authenticated human user | Human identity used by `Surfaces/Renderer/` for user-attributed GitHub access/actions. |
| Consumer | Supplies project-specific declarations/data while consuming released df and the shared web application. A consumer is a repository, a machine, or a fleet of either. |

## 20 Capability architecture

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

Official capabilities use the same loader/ABI as third-party capabilities. The normal df distribution includes the official capability set so standard installation remains batteries-included.

The capability ABI is versioned independently from product SemVer.

## 21 Domains, ecosystems and project detection

DarkFactory retains separate concepts:

- **ecosystem** — toolchain/package format, such as Bun/Node, Python, Rust, Typst, LaTeX or Lean;
- **package** — one buildable unit in a repository/workspace;
- **domain** — the semantic kind of work, initially including `code`, `paper` and `math`;
- **capability** — behavior DarkFactory can perform.

Repositories may be polyglot and multi-domain simultaneously.

Detection discovers repository/package/domain evidence. Capability resolution then selects applicable capability-contributed actions such as test, lint, format, docs, setup and release behavior.

The final system must not rely on one ever-growing repository-specific language/command table when behavior can be provided by a capability.

## 22 Configuration and state

Configuration is data in a document; state is what the system observed and recorded. They are kept
apart because they answer different questions — what was meant, and what was found — and conflating
them is how a system ends up unable to say whether a difference is drift or an edit.

### 22.1 Configuration

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

### 22.2 Documentation configuration and output

The `docs` block in the combined configuration is the only DarkFactory documentation configuration contract.

Generated documentation sites and JSON content graphs are CI outputs and must not be committed. The deterministic §37 rules projection remains governed by the documentation currentness check.

### 22.3 State

Df-owned config/state/result/review/audit artifacts use appropriate `.df` filenames in their owning locations.

## 23 Governed Request lifecycle

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

## 24 Runtime, routing and resilience

- Pipeline stages pass explicit semantic task kind where known.
- Undeclared inference separates task subject from required capability; engineering work about images/video must not be misrouted to media-generation tools.
- Routing respects sensitivity, data-collection policy, provider/account availability, capability requirements and capability tiers.
- Capability tiers prefer the lowest sufficient tier and escalate deterministically according to the shipped routing contract.
- Quota/provider failover is durable and does not repeat already-completed deterministic effects.
- Execution is serializable per durable run identity: concurrent ingress for the same run cannot lose state, run the same node concurrently, or overwrite a newer transition.
- External effects are serializable per deterministic effect identity. Concurrent callers of the same effect cannot both enter the mutation; crash recovery reconciles external evidence before retrying.
- Transport retries are method/effect aware. A mutation is never blindly replayed after an ambiguous transport/server outcome; the engine reconciles external state or uses an operation with equivalent conditional/idempotent semantics first.
- Authoritative state uses crash-consistent transactions appropriate to its scope. A rename-only single-file update is not described as durable across power loss unless file and directory durability are actually established; logically multi-file state commits through one generation/transaction boundary.
- Every agent-backed logical stage has one bounded wall-clock budget across model failover and tool work.
- Planning decomposes work into the smallest practical independently verifiable chunks with explicit dependencies, scope/file ownership and minimum capability/tier metadata sufficient to decide safe parallelism.
- Independent chunks may execute concurrently only through the same persisted graph runtime in isolated engine worktrees backed by the one deterministic git substrate. Verified chunk commits integrate in dependency order; sibling failure, interruption and conflict repair remain resumable without repeating completed effects.
- Quota admission is atomic with respect to concurrent model calls: declared/learned capacity is reserved before dispatch and settled/released from observed usage so parallel chunks cannot all consume the same remaining slot.
- Turn limits and elapsed-time limits are independent safety bounds.
- Timeout, quota exhaustion, authentication failure, model failure and user cancellation are distinct outcomes.
- The runtime remains containerizable/non-root for CI execution.

## 25 Change and governance

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

## 26 Identity

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

## 27 Human authentication

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

## 28 Documentation

`Surfaces/Docs/` is the final documentation engine and is a projection of the resolved system.

It compiles one typed content graph from:

- this document's own canonical text, including §35 and §36;
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
equality across holders. §4.3's fixed points and §26's split custody both depend on this and neither
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

this document is the canonical product-documentation homepage. the root document is the canonical product document; §37 is the deterministic generated projection of canonical §35, with ADR links derived from §36. CI fails when the generated projection drifts from its canonical directory or when rule↔note relations are incomplete or contradictory.

## 29 Renderer

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

## 30 Terminal

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

## 31 Installation, release and versioning

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

The standard installation includes official capabilities while allowing third-party capabilities through the same loader.

## 32 Consuming df

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

### 32.1 One model across repositories and machines

Machine-scoped and repository-scoped work must resolve through one semantic model rather than
a repository mode and a machine mode. A machine-scoped consumer is not a separate kind of
target; it is the same kind of target with a different scope.

- A capability behaves identically whether it is invoked in a working tree, on a host, or in CI. There are no per-location code paths and no host-only or repository-only capability variants.
- A declaration means the same thing in a repository and on a machine. Where a consumer's machine-level configuration is authored in a foreign declaration format, df resolves and composes it in that format (§8) rather than requiring it to be re-expressed.
- The boundary between repositories, machines and hosting types is not a place the system degrades. Support is stated as one behaviour, not as a matrix of what is known to work where, because a matrix is a standing promise to maintain and each per-location special case is a place an abstraction has leaked.
- Identifiers for repositories, machines, capabilities and providers are stable and comparable, so a declaration written for one target resolves correctly on another.

## 33 Security requirements

- No credential/token/private key in source, logs, issues, PRs, docs or Pages assets.
- Browser packages have enforced import boundaries from machine-secret code.
- Third-party capabilities receive only declared/scoped credential access.
- GitHub user authorization is not treated as GitHub App installation authority.
- History rewriting uses lease-safe expected-old-SHA semantics; blind force push is forbidden.
- Recovery never pushes secret-bearing local material.
- Authentication and authorization failures fail closed.

## 34 Final acceptance

DarkFactory is final only when the exact pre-merge candidate has passed the declared acceptance and consumer contract and the final canonical publication can reproduce it without behavioral source changes, and:

- df is the only normal production orchestration/mutation engine;
- production orchestration and mutation are owned by the final TypeScript df system;
- the §7 architecture is shipped and the tree is a restructure, not a parallel implementation;
- official capabilities are proven and reachable from every surface;
- identity custody and human-authentication boundaries are proven, across every supported proof type and
  acquisition flow, with split custody exercised rather than merely implemented;
- real TypeScript API docs are published;
- §37 is deterministic and current from §35 and §36; this document remains the single product document;
- `Surfaces/Renderer/` is deployed to consumers without a frontend rebuild per consumer;
- the source-free pre-merge candidate installs/updates cleanly, and the canonical publication reproduces that behavior;
- the supported consumer set passes governance, detection, capability, docs/web, release-candidate and drift checks before the integration merge;
- `audit.df` is internally consistent;
- installed acceptance is green across the supported consumer set before merge;
- the declarable-graph product contract passes against the installed exact-head candidate and is re-smoked against the canonical publication.

### 34.1 Invariant acceptance

The thesis's invariants are not aspirations and are not satisfied by review. Each is a check that runs, and
DarkFactory is not final while any of them can fail:

- **I1 — no authored meaning.** A check rejects any file whose purpose is to enumerate what exists, and the
  count of sites where meaning is authored rather than derived is zero.
- **I2 — derivation is total.** A tree walk compares the derived feature set against the discovered set across
  overloads, re-exports and conditionals, and any asymmetry between what a surface shows and what the system
  can invoke fails the build.
- **I3 — the published interface is the code's own.** A feature with no doc comment is a build error, and each
  surface is checked to render the comment its feature publishes.
- **I4 — effects pass through a seam.** A check rejects direct filesystem, network and process access outside
  the seams. This is the precondition for the rest and is accepted first.
- **I5 — nothing is published uncompiled.** Every released artifact carries its resolution identity and is
  verified against it before publish.
- **I6 — discovery is structural.** A test adds a feature and asserts that no other file changed.
- **I7 — drift is measured against derivation.** Convergence is exercised against derived inputs only; a
  recorded copy of intent that can be compared instead of re-derivation fails the build.
- **I8 — the system is a fixed point.** The system compiled by itself resolves to itself, byte-identical, with
  no maintenance pass between.
- **I9 — presentation holds no behaviour.** A surface cannot be imported by a non-surface.

I4 and I8 are the two that are expensive to add later and cheap to require now, because both are structural:
once effects bypass the seams, nothing resting on them can be enforced, and once a second build description
exists, the fixed point stops being reachable at any price.

### 34.2 Self-hosting acceptance

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

## 35 Contribution rules

Unrelated. The paper and everything scholarly about it is a consumer of this system, not a part
of it. A thesis that cannot be separated from its first application is a specification. This one
is a direction, and it is allowed to outlive whatever prompted it.

### 35.1 DF-RULE-001 — Tests prove invariants

#### Requirement

Every behavior or contract change MUST be covered at the owning package/capability boundary by tests
that prove observable invariants, state transitions, failure behavior or integration contracts.

Tests MUST survive valid refactors. They must not normally assert exact implementation filenames,
source-code substrings, function/class names, workflow step labels, copied command text, or the
presence/absence of an internal file merely because the current implementation happens to use it.

Static architecture/governance tests are appropriate only for real static contracts. They MUST inspect
semantic structure where practical: parsed manifests/configuration/YAML, schemas, dependency/import
graphs, package exports, generated artifacts or public interfaces rather than brittle source grep.

Concurrency-sensitive behavior MUST be tested concurrently. Idempotency/crash-safety claims MUST
exercise duplicate invocation and the relevant crash window, not only call the same function twice
after a successful journal write. Atomicity claims MUST test interruption/failure between transaction
steps.

Each final first-party package/capability MUST own or be explicitly covered by one canonical detected
test action. Coverage that happens only because a legacy aggregate/harness test imports the package is
not sufficient. Duplicate/shadowed test definitions and copied test blocks are forbidden.

Applicable test actions come from the canonical repository/package detection plus
capability-resolution contract. All applicable suites MUST pass before a head is considered green.

#### Rationale

Invariant-based tests preserve correctness while allowing aggressive refactoring and deletion. Tests
that freeze source text or repository shape make cleanup harder without proving product behavior.
Concurrency, idempotency and atomicity only become credible when the failure/race windows themselves
are exercised.

#### Enforcement

The detected quality contract executes package/capability-owned tests. Architecture tests consume
parsed semantic inputs or resolved dependency graphs where possible. CI fails on duplicate/shadowed
test definitions and on detected packages without an applicable required test contract unless that
action is explicitly declared not applicable by canonical configuration.

#### Exceptions

Exact-byte or exact-path assertions are allowed when the bytes/path are themselves a public protocol,
packaged artifact, security boundary, generated projection, or externally required interface. The
test must state that invariant rather than treating an implementation detail as policy.

Documentation-only changes and deterministic generated-file updates need no new behavioral test when
they change no behavior.

#### Change control

The canonical detection/capability contract owns test-command selection. Package/capability tests own
behavioral truth; CI remains the authoritative execution environment.

### 35.2 DF-RULE-002 — Inline documentation and generated documentation

#### Requirement

Public source APIs MUST be documented inline.

- **TypeScript**: TSDoc on every exported public symbol in first-party packages and capabilities.
- **Rust**: `///` documentation on public items, including error/panic behavior where applicable.

Documentation MUST be generated from canonical source and architecture records. DarkFactory's documentation engine is `@darkfactory/docs`; TypeDoc may be used internally for TypeScript extraction. The `docs` block of the combined DarkFactory configuration is the only documentation configuration contract. Generated sites and JSON content graphs are CI outputs and MUST NOT be committed.

this document is the product-documentation homepage. §35 is the canonical rule set and §36 is the canonical current long-term note set. the root document is the canonical product document; §37 is a deterministic generated projection of the canonical rules. These discovery surfaces are never authorities and are never edited directly. Repository/tool discovery aliases may point to canonical documents or generated projections only when they serve a current external/conventional entry point; aliases remain links rather than copied authored documents, and unsupported legacy aliases are forbidden. CI MUST fail on deterministic projection drift and on missing/orphaned rule↔note relations.

The final web rendering layer is `@darkfactory/web`; docs must not maintain a second frontend or theme runtime.

#### Rationale

One content graph can publish product docs, rules and notes without turning generated projections into competing authorities. Canonical records stay in their owning directories while generated indexes and supported discovery aliases make them accessible.

#### Enforcement

Docs/API/projection checks consume the canonical capability-aware detection contract and first-party docs compiler. Required API surfaces build with zero required documentation warnings; §37 must match its canonical rules, the root `README.md` alias must target the canonical product document, and generated site/JSON output must remain ignored and CI-only.

#### Exceptions

Generated or intentionally private/internal symbols may be excluded only by the canonical docs/export policy.

#### Change control

Presentation belongs to the shared web package; source extraction/content ownership belongs to the docs package/capabilities.

### 35.3 DF-RULE-003 — Product requirements and ADRs

#### Requirement

this document is the single normative product requirements document. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope. Accepted ADRs record durable architectural decisions and rationale.

Executable declarations use the final DarkFactory contracts:

- one root `*.dfconfig` per scope for the combined configuration, with any filename stem accepted and none canonical;
- the `repo` block for repository/product declaration;
- the `providers` block for runtime/user/provider configuration;
- the `docs` block for native documentation configuration;
- the declarable workflow graph for execution topology;
- §35 for mandatory contribution/governance behavior.

`DF_CONFIG_DIR` (default `.darkfactory`) may hold the same combined document for supported discovery, but `.darkfactory` is not a committed source in this repository. Ambiguous root/folder or alias candidates fail closed and are never merged.

A material deviation from this document MUST be owner-approved and recorded as an accepted numbered ADR before implementation.

Long-term notes and normative rules form one bidirectional current-truth graph:

- every accepted ADR MUST declare the canonical rules it explains or constrains;
- every canonical rule MUST be backed by at least one current accepted ADR explaining its durable rationale;
- unknown, missing or orphaned links are documentation-currentness failures;
- superseded/historical decisions are removed from the live notes/rules graph and remain in Git/GitHub history instead.

#### Rationale

Stable requirements, executable declarations and current architecture decisions have separate owners so no generated view can silently override product intent.

#### Enforcement

Governance/docs-currentness checks ensure PRD remains the single normative product document, architecture changes are represented by ADRs, and rule/note relationships are complete in both directions.

#### Exceptions

None.

#### Change control

Planning/graph/package/capability changes update the active Request/Planning record, accepted ADRs and PRD as applicable rather than creating parallel specification files.

### 35.4 DF-RULE-004 — English language consistency

#### Requirement

All code, identifiers, comments, docstrings, commit messages, issues, and documentation MUST be
written in English.

#### Rationale

A single written language keeps every artifact reviewable by the same audience and keeps generated
sites, logs, and issue threads internally consistent.

#### Enforcement

Hooks/CI enforce machine-checkable language policy where deterministic (for example identifiers, generated metadata and commit conventions). Human/agent review remains the backstop for prose semantics; the repository does not claim a brittle natural-language scanner can prove every sentence is English.

#### Exceptions

Quoted verbatim user input and content whose meaning depends on another language (for example
localization fixtures).

#### Change control

Machine-checkable enforcement is owned by hooks/CI; prose-language consistency remains a review invariant.

### 35.5 DF-RULE-005 — Commit granularity

#### Requirement

Keep commits modular, focused, and descriptive — one commit per component or coherent change. A
single delivery PR may contain multiple coherent commits; one PR does not imply one commit. When an
integration/orchestrator session combines parallel worker output, preserve coherent commit boundaries
until the final merge rather than collapsing unrelated work into one opaque commit.

Commit syntax, allowed types and repository scopes are owned by DF-RULE-015. This rule owns only
commit granularity and preservation of coherent change boundaries.

#### Rationale

A coherent change is reviewable and reversible on its own. Splitting unrelated edits into separate
commits keeps `git bisect`, review, integration debugging and release notes honest while still
allowing one PR to deliver one coherent larger Request.

#### Enforcement

The shared hook registry validates granularity-adjacent delivery policy at deterministic commit/CI trigger points. Commit syntax/taxonomy enforcement remains owned by DF-RULE-015, and the release capability consumes the resulting commit metadata.

#### Exceptions

Trivial mechanical changes (one-line typos, generated churn from deterministic generators) may stand
alone.

#### Change control

The commit taxonomy lives in `015-repository-taxonomy.md`; do not restate the allowed scopes here.

### 35.6 DF-RULE-006 — CI readiness and verification

#### Requirement

The canonical/default branch MUST remain green on its required checks. A red canonical branch is a
stop-the-line event for repository-wide delivery until restored.

A failing topic/recovery branch blocks that branch's merge and any dependent work, but does not
globally halt unrelated isolated branches whose own required checks are green.

CI MUST derive one normalized quality contract from detected packages plus applicable capabilities
and fail closed when that contract has an unresolved required gap, ambiguity or unsupported action.
Warnings are not an acceptable substitute for required test, typecheck, lint, format or documentation
coverage.

Type safety is a first-class required quality action for TypeScript packages. Every detected
first-party package/capability MUST be accounted for exactly once by an owning package action or an
explicit workspace-level action whose coverage can be proven. Incidental execution through a legacy
aggregate package does not count.

The aggregate required quality check is green only when every applicable required action for the
current head completed successfully. A required action that is missing, stale, cancelled, skipped or
neutral is not treated as proven success unless canonical configuration explicitly marks that action
not applicable before matrix construction.

CI validation MUST be read-only with respect to the delivery branch. Formatting and other
deterministic fixes happen in the governed mutation path before commit; CI reports drift rather than
pushing corrective commits.

Required checks are synchronized with branch protection and evaluated for the exact current head. A
branch may not merge while any required check or required invariant is red, missing, stale or
unevaluated.

#### Rationale

A single green status is meaningful only when its underlying coverage is complete. Failing closed on
quality gaps prevents a package from escaping tests/typechecking simply because it forgot to declare a
script. Read-only CI also preserves exact-head evidence and avoids races with deterministic
orchestration.

#### Enforcement

Generated/detected CI, package/capability action resolution, df check reconciliation and branch
protection enforce the required-check set. CI validates that every detected package has complete
required quality coverage before executing the matrix and rejects unresolved gaps.

#### Exceptions

A quality action may be explicitly disabled/not-applicable only in the canonical repository/package
contract with a reason appropriate to that package. Absence of a script or tool is not by itself an
exception.

#### Change control

Required-check ownership follows the canonical detected package/capability quality contract and
repository protection settings; no session may invent, silently drop or weaken required coverage.

### 35.7 DF-RULE-007 — Branch and pull request workflow

#### Requirement

All product changes MUST reach the protected canonical branch through a reviewed delivery branch and GitHub pull request. Direct mutation of canonical is prohibited. A bootstrap/emergency exception may change who authors the delivery branch when df itself is unavailable, but it never bypasses the PR, checks, review or merge gate.

- Branch names are lowercase, descriptive and do not depend on issue numbers.
- The repository's actual canonical/default branch is resolved dynamically; `main` is never assumed.
- Automation-authored PRs use the canonical DarkFactory GitHub App/bot identity so the human maintainer can independently review them.
- PRs remain draft while implementation/review is active and become merge-ready only through the governed gate.
- Required checks and current-base requirements must pass before merge.
- Branch protection remains enabled with the final detected/generated check contract.
- Rewrites/pushes use deterministic git owners and lease-safe expected-old-SHA semantics; blind force push is forbidden.

#### Rationale

Topic branches preserve review traceability while dynamic base resolution and lease safety prevent
automation from overwriting repository history.

#### Enforcement

The final git/GitHub/hook capabilities and repository protection settings enforce this contract.

#### Exceptions

When the governed df delivery path itself is unavailable or is the component under repair, an
owner-authorized bootstrap/completion Request may permit a coordinator to author directly on one
dedicated PR branch. This never permits direct canonical mutation, skipping required checks/review,
or self-merging. The exception ends as soon as the governed path can represent and execute the work.

#### Change control

Concrete workflow/script owners may change while production ownership converges; this rule names
behavior, not implementation file paths.

### 35.8 DF-RULE-008 — Automated formatting and linting

#### Requirement

Formatting is deterministic automation, not a review topic.

The canonical detection + capability-resolution contract determines the formatter/linter for each detected package/ecosystem. First-party TypeScript workspace packages use the canonical Biome configuration; other ecosystems use their declared/detected capability actions.

Formatting/linting commands MUST be derived from the same normalized package/capability result used by local verification and CI. Do not maintain a second workflow-specific command map.

The mutation path applies deterministic formatting before creating a commit. CI validates the resulting tree but MUST NOT asynchronously create/push formatter commits that advance an active delivery branch after the orchestrator has integrated or proven a head.

Lints are blocking where supported. Generated artifacts are excluded only by explicit canonical policy.

#### Rationale

One detected quality contract keeps local mutation, graph verification and CI from disagreeing about what “formatted” or “lint clean” means. Applying formatting before commit also prevents background automation from racing lease-safe integration or invalidating exact-head evidence.

#### Enforcement

Local verification, the hooks capability and generated CI consume the same action model.

#### Exceptions

Unsupported/missing quality actions are diagnosed explicitly; they are not silently treated as passing.

#### Change control

Formatter/tool changes are reviewed capability/package configuration changes.

### 35.9 DF-RULE-009 — Request binding, branch cleanup and board status

#### Requirement

Every delivery PR MUST explicitly bind every **active** Request it satisfies.

A PR may satisfy one Request or multiple Requests when the shared-Planning/multi-Request model proves
that every active bound Request has valid Planning/gate coverage. Epic membership or stack topology
never implies completion by itself.

When the owner deliberately consolidates tightly coupled work into one current Request, the
consolidated Request MUST first preserve the current required behavior and relevant verbatim owner
direction. Earlier duplicate Requests are then closed as historical traceability and do not need to
remain separately bound by the delivery PR.

Failures already associated with a delivery PR/Request MUST be recorded as check/run evidence and on
that bound work rather than creating a new implementation Request. A standalone unbound/default-branch
operational failure may use one deduplicated incident record when durable follow-up is required.

Merged delivery branches are cleaned up when safe. A branch with unique unrepresented recovery/stack
work is not deleted merely because another PR merged.

Request/PR/project status uses one canonical reconciliation model with the seven states:

- `Backlog`
- `ToDo`
- `In Progress`
- `Blocked`
- `Done`
- `Superseded`
- `Dropped`

A Request reaches Done only from its own terminal evidence or explicit valid shared-Planning/
multi-Request completion.

Webhook/event payloads are triggers, not authoritative lifecycle snapshots. Before mutating status,
labels, project fields, PR bindings or branch cleanup, reconciliation MUST derive the desired state
from current GitHub/runtime evidence. Delayed or out-of-order events must be idempotent and must not
roll a newer status backward.

#### Rationale

Explicit current bindings preserve why a PR exists without forcing superseded duplicate issues to
remain active. Failure evidence stays attached to the work that owns it instead of fragmenting the
tracker. Treating events as triggers prevents concurrent label/project events from overwriting newer
repository truth with stale webhook state.

#### Enforcement

The Request/Epic/stack/GitHub capabilities reconcile PR bindings, project status, failure evidence
and branch cleanup.

#### Exceptions

None.

#### Change control

Relationship semantics belong to the first-class Request/Epic/stack model, not ad-hoc PR text
parsing.

### 35.10 DF-RULE-010 — Reviewed Planning and implementation alignment

#### Requirement

Before implementation begins, each governed unit of work MUST have one current unified Planning
artifact.

Planning contains the semantic interpretation of the verbatim Request plus the evidence-justified
implementation approach, dependencies, recovery inputs and verification expectations.

Planning MUST pass an independent review/fix loop until clean, followed by one explicit owner
Planning Approval.

There is no separate interpretation approval gate and plan approval gate in the final lifecycle.

After implementation:

- deterministic verification runs;
- implementation review/fix loops until clean;
- material scope outside approved Planning requires the lighter scope-amendment approval;
- final alignment validates the implementation against approved Planning plus approved amendments;
- required checks/review/merge gates remain mandatory.

Planning approval becomes stale after a material Request/base/dependency/recovery-context change and
cannot be silently reused.

If the governed Planning implementation itself is unavailable or is the component being repaired,
only the narrow bootstrap/completion exception below may substitute an owner-authorized tracked
Request as the temporary Planning record.

#### Rationale

One independently-reviewed Planning artifact preserves human intent while eliminating duplicate gates
and repeated manual correction of invented plan details. The bootstrap rule prevents a broken
Planning engine from making its own repair impossible without weakening the normal lifecycle.

#### Enforcement

The governed Planning/review/fix lifecycle provides the durable Planning artifact and shared review
machinery. Bootstrap use must be explicit in the active Request and delivery PR.

#### Exceptions

For an owner-authorized bootstrap/completion repair of the governed lifecycle itself, one tracked
Request may temporarily serve as the unified Planning artifact when it contains the verbatim intent,
implementation steps, dependencies and verification gates; an independent review is recorded before
implementation; and the owner explicitly authorizes execution. The same deterministic verification,
review/fix, alignment, required-check and final merge authorization rules still apply. This exception
expires as soon as df can represent the work normally.

#### Change control

Stage topology may evolve, but one reviewed Planning approval before implementation and final
alignment remain invariants.

### 35.11 DF-RULE-011 — Pull request review approval and governed merge

#### Requirement

Pull requests require the final repository protection/review contract before merge.

Native GitHub review approval and the canonical authorized DarkFactory approval command grammar are both valid only when the current actor is authorized. Free-text that merely resembles approval cannot advance a gate.

Merge readiness requires:

- current-base/stack validity;
- required checks green;
- implementation review/fix clean;
- final Planning alignment;
- any required scope-amendment approval;
- official final review/merge authorization.

After merge, df deterministically reconciles bound Requests/PRs/project state and safe branch cleanup.

#### Rationale

Review state and merge authority must be based on GitHub/df evidence, not model prose or workflow-specific shortcuts.

#### Enforcement

GitHub/graph/Request capabilities and branch protection own this behavior.

#### Exceptions

None.

#### Change control

The final command registry and GitHub App identity may evolve without changing these authorization invariants.

### 35.12 DF-RULE-012 — Verbatim Request capture and Planning gate

#### Requirement

Every incoming governed task MUST be represented by one or more tracked GitHub Requests before
implementation.

- Preserve the user's verbatim wording.
- Decompose genuinely independent tasks; do not split tightly coupled architecture solely to satisfy one-PR/one-issue assumptions.
- When the owner consolidates previously separate Requests into one current Request, copy the relevant verbatim owner direction and all still-current required behavior into the consolidated Request before closing duplicates.
- Resolve Request/Epic/dependency/recovery relationships explicitly.
- Produce one unified Planning artifact from the verbatim Request and authoritative context.
- Hand that artifact to the single review/approval/alignment lifecycle owned by DF-RULE-010; this rule does not define a second Planning gate.
- Subsequent delivery remains bound to the active Request(s) or an explicitly approved shared-Planning record.

There is no separate `Interpretation` approval lifecycle before Planning.

#### Rationale

Verbatim capture protects intent while DF-RULE-010 owns how Planning is reviewed, approved and aligned. Consolidation is safe only when it preserves intent before older tracking records become historical.

#### Enforcement

Request intake and the governed Planning lifecycle validate the contract.

#### Exceptions

The bootstrap/completion exception in DF-RULE-010 may use the active Request itself as the temporary
Planning record while the normal Planning implementation is under repair. It does not waive verbatim
capture or owner approval.

#### Change control

Multi-Request/shared-Planning behavior follows the first-class Request relationship model and never
waives explicit Request coverage.

### 35.13 DF-RULE-013 — Specification sequence and work tracking

#### Requirement

Specification proceeds in one direction, and each stage is settled before implementation depends on
it:

```text
this document  →  accepted ADRs when a durable architecture decision is required  →  Request/Planning
```

- **Issues track settled intent and executable work, not unresolved architecture debates.** An issue
  may be filed when its required outcome is settled by this document/§36 or when it is a concrete
  mechanical task whose outcome is not in question.
- **Open architecture questions stay with the owning product/ADR decision until settled.** Do not
  create speculative decision issues merely to move an unresolved argument into the tracker.
- **Decomposition follows delivery independence, not size alone.** A large tightly coupled body of
  settled work may remain one Request/Planning record and one delivery PR when the owner explicitly
  chooses one coherent integration/validation contract. Do not manufacture child Requests merely to
  satisfy a process shape.
- **Use an Epic when genuinely independent child Requests benefit from separate lifecycle,
  ownership, sequencing or delivery.** Epic relationships organize Requests; they are not mandatory
  wrappers around every large change and never waive child Planning/evidence when children exist.
The active Request/Planning record is the single live work ledger. Concrete current implementation
steps, checkboxes, approvals and evidence live there with the workflow graph and GitHub/project
state.

#### Rationale

Arguments converge in the document that owns the decision, while executable work converges in the
smallest useful tracking structure. This avoids both speculative issue sprawl and artificial
decomposition of tightly coupled work.

#### Enforcement

- `tests/test_governance.py` asserts the specification sequence and Request/Planning invariants are
  represented in the AGENTS projection.
- Request/Epic/project reconciliation enforces the active tracking relationships.

#### Exceptions

None.

#### Change control

Exact graph nodes and stage topology are owned by the declarable workflow graph. This rule owns only
the specification/tracking invariants.

### 35.14 DF-RULE-014 — Capability-driven agent runtime and resilience

#### Requirement

DarkFactory runs agentic work through the TypeScript df runtime, not a final Python harness registry.

- Core owns execution, routing primitives and persistence/resume; `@darkfactory/capability` owns capability discovery/loading/resolution.
- Agentic/product behaviors are versioned capabilities.
- One canonical capability implementation may generate native Pi, MCP and supported agent skill/plugin adapters.
- Pipeline stages pass explicit task kind where known; undeclared inference separates subject from required capability.
- Provider/account/model selection respects sensitivity, data-collection policy, capability requirements, quotas and capability tiers.
- Exhaustion/failure moves through the configured eligible failover chain without repeating deterministic effects.
- Every logical agent stage has one bounded elapsed-time budget across model failover and tools.
- Natural model stop is accepted; mutation truth comes from observed effects.
- Quota/provider interruption checkpoints durable state and resumes without duplicating completed effects.
- CI agent execution remains containerizable/non-root.

#### Rationale

The runtime should be resilient and harness-portable without duplicating product behavior for each external agent implementation.

#### Enforcement

Core/router/runtime tests plus capability adapter tests and live df-only acceptance.

#### Exceptions

Previous internal runtime implementations are not compatibility targets. External compatibility exists only when this document explicitly promises it; otherwise old orchestration is deleted when its final owner is live.

#### Change control

Provider/model/account data lives in final configuration/keychain/catalog owners; this rule defines runtime behavior only.

### 35.15 DF-RULE-015 — Commits, repository taxonomy and domains

#### Requirement

Commits use Conventional Commits: `<type>(<scope>): <description>`.

Allowed base types are `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, and `ci`.

Repository area labels/scopes are declared by the `repo` block.

Project classification separates:

- ecosystem/toolchain;
- package;
- semantic domain (initially including code, paper and math);
- capability.

A repository may contain multiple packages, ecosystems and domains. Capabilities are orthogonal and may apply across domains.

Request classification, commit-scope validation and repository labels consume the same declared taxonomy rather than copied lists.

#### Rationale

Separating domain from capability preserves multi-domain repositories while keeping extension behavior modular.

#### Enforcement

The configuration resolver, canonical detection/capability resolution and hooks validate the taxonomy.

#### Exceptions

Consumers define their own repository areas and installed/applicable capabilities.

#### Change control

Taxonomy changes occur through configuration and capability declarations; rule prose does not become a second list of consumer-specific areas.

### 35.16 DF-RULE-016 — Security and secrets

#### Requirement

No credential, access token, refresh token, cookie, client secret or private key may be committed, logged, written to issues/PRs, included in generated docs or embedded in static web assets.

`@darkfactory/keychain` is the sole machine/runtime credential-custody owner. Other packages/capabilities declare credential requirements and receive scoped access; they do not read raw credential files, secret environment variables or OS keychains directly.

`@darkfactory/auth` separately owns human/browser GitHub App authentication and sessions. Browser bundles cannot import keychain/private-key/server-confidential code.

The web auth broker may hold only credentials required for confidential user-token exchange/refresh and is not a DarkFactory state/execution backend.

GitHub user authority and GitHub App installation authority remain distinct.

Secret-bearing recovery material remains preserved locally and blocked from publication rather than leaked or discarded.

#### Rationale

Centralized custody and explicit browser/machine trust boundaries minimize secret lifetime and prevent capability/plugin code from silently widening access.

#### Enforcement

Keychain/auth import-boundary, redaction, secret-scan and credential-flow tests; workflow/browser artifact audits.

#### Exceptions

None.

#### Change control

Credential names/values are never copied into rule text. Provider-specific flows belong to keychain/provider capability contracts.

### 35.17 DF-RULE-017 — Final architecture, DRY, and deletion

#### Requirement

The repository targets the current final architecture directly.

- Every concern has one final owner and one source of truth. Duplicate implementations, registries,
  state stores, config contracts, command maps and generated/manual copies are forbidden.
- Reuse or move working code when it already implements the required behavior, but delete its old
  owner once the final owner is live. Final packages MUST NOT forward implementation to a
  deletion-bound/legacy tree.
- Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are
  forbidden unless an **external supported contract explicitly required by this document** needs them.
  Previous internal architecture is never a compatibility target and is not preserved "just in case".
- Delete unreachable/dead code, stale configuration, unused assets, obsolete tests, superseded docs,
  abandoned feature flags and transitional adapters instead of documenting or testing their presence.
- Abstract repeated mechanisms and invariants once at the lowest stable owner. Do not create
  speculative abstractions for one caller or hide unrelated behavior behind a generic helper merely
  to reduce line count.
- Public exports are intentional product/extension contracts. Keep internal helpers private; tests do
  not justify widening an API.
- Package/capability dependencies remain explicit and acyclic. Historical implementation belongs in
  Git/issues, not live source.

#### Rationale

A small current-only architecture is easier to reason about, test and change. Compatibility code for
unsupported internal history multiplies states and slows final delivery without protecting a user
contract.

#### Enforcement

Dependency/reachability analysis, package-boundary tests, current-truth docs checks and final
repository audits reject duplicate/deletion-bound ownership and unexplained unreachable first-party
code.

#### Exceptions

Only an external compatibility promise explicitly present in this document/§36 may survive. It
must have a named owner and invariant tests; internal migration convenience is not an exception.

#### Change control

Changing a final owner or adding an external compatibility promise is an architecture change and
requires the normal PRD/ADR process.

### 35.18 DF-RULE-018 — Concurrency, atomicity, and idempotency

#### Requirement

Authoritative state and external effects MUST remain correct under duplicate delivery, concurrent
execution, interruption and ambiguous transport failure.

- Serialize authoritative transitions at the identity they mutate (run, effect, account, branch,
  worktree, quota reservation, release, etc.). Check-then-act without an atomic claim/lease/CAS is not
  sufficient.
- A deterministic external effect ID may produce at most one logical mutation. Concurrent duplicates
  cannot both enter the mutation; crash recovery reconciles observed external state before retrying.
- Remote writes use expected-old-version/SHA or equivalent conditional semantics and fail closed on
  stale state.
- Mutation retries are method/effect aware. After an ambiguous write outcome, reconcile first; never
  blindly replay a non-idempotent POST/write because a transport or 5xx response failed.
- Authoritative file/state updates are crash-consistent. Multi-file logical state uses one
  generation/transaction boundary; lock recovery cannot delete a replacement owner's lock.
- Replicated state converges deterministically regardless of merge direction and represents deletion
  explicitly until it is safe to compact.
- Quota/capacity is reserved atomically before concurrent work is dispatched and settled from observed
  usage.
- Webhook/events are triggers, not authoritative snapshots; reconciliation derives desired state from
  current evidence so stale/out-of-order events cannot roll state backward.
- Concurrency, idempotency and atomicity claims are tested at the actual race/crash windows with
  simultaneous actors and fault injection.

#### Rationale

Sequential happy-path tests do not prove exactly-once or crash-safe behavior. DarkFactory coordinates
remote repositories and concurrent agents, so its correctness boundary is the transaction/effect
protocol rather than a single function call.

#### Enforcement

Runtime/effect-journal, git/GitHub, storage, auth/keychain, quota and release tests exercise duplicate
concurrent invocation, stale leases, ambiguous writes and injected interruption at durable boundaries.

#### Exceptions

Advisory telemetry/cache data may use weaker durability only when it cannot authorize work, affect
mutation truth, consume quota authority or change reconciliation decisions, and that weaker contract
is explicit.

#### Change control

New authoritative stores/effects must define identity, serialization, durable boundaries,
reconciliation and retry semantics before implementation.

### 35.19 DF-RULE-019 — Orchestrated integration and worker isolation

#### Requirement

Parallel implementation has one integration authority per delivery branch.

- The orchestrator alone advances the authoritative remote delivery branch and owns integration.
- Parallel workers use isolated local worktrees/branches with explicit prerequisites and disjoint
  subsystem/path ownership. They do not create competing remote delivery branches/PRs or mutate the
  integration branch.
- Shared integration surfaces (root manifests/lockfiles, package export maps, workflow/config,
  PRD/PLAN/rules/docs and generated projections) stay orchestrator-owned unless one non-overlapping
  edit is explicitly delegated.
- Workers return a coherent commit SHA, changed-file set, targeted verification and assumptions.
  The orchestrator integrates those commits in dependency order, resolves shared files semantically
  and re-runs affected gates.
- A dependent lane starts only after the interface it consumes is integrated and verified on the
  authoritative branch. Do not parallelize across unsettled shared interfaces.
- Keep coherent Conventional Commit boundaries. One delivery PR does not justify one opaque commit.
- CI is read-only on delivery branches; background automation does not race the orchestrator by
  pushing formatter/fix commits.
- Each implementation gate records exact-head evidence before downstream work treats it as satisfied.

#### Rationale

Parallelism is useful only when ownership and integration are deterministic. A single remote writer
plus isolated workers prevents lost updates, shared-file races and evidence attached to obsolete
heads.

#### Enforcement

Worktree/branch ownership, lease-safe git mutation, commit/evidence handoff, exact-head CI and final
alignment enforce the integration model.

#### Exceptions

A human may explicitly transfer integration authority, but there is still only one active integration
owner for a delivery branch at a time.

#### Change control

The concrete worker implementation may change; single integration authority, isolation and
exact-head evidence are invariants.

### 35.20 DF-RULE-020 — Paper authorship and publication

#### Requirement

`paper/index.typ` is the sole authored thesis manuscript. `paper/bib/`, `paper/fonts/`, and `paper/img/` contain its supporting bibliography, font, and image resources.

The canonical publication command generates the repository-root `PAPER.pdf` artifact. The Paper does not generate or own repository prose; this document is. `PAPER.pdf` is included in the release assets.

The Paper uses the shared documentation, capability, CI, and release contracts. Manuscript prose and supporting assets change only on explicit author request. The author reviews thesis changes before they are staged or delivered.

#### Rationale

One manuscript authority and one publication generator keep the thesis reproducible without creating a second Paper product or documentation structure.

#### Enforcement

Paper publication validation, release planning, capability detection, CI, and repository governance checks cover these invariants.

#### Exceptions

Quoted source material may retain its source language. A later accepted migration may move the Paper workbench into the shared web architecture; the standalone web app is not imported as a second owner.

#### Change control

Durable Paper product requirements belong in the generated PRD projection; Paper publication behavior changes through this rule and an accepted ADR.

## 36 Architecture decisions

Durable decisions and their rationale. Each names the rules it explains, and each rule is backed by at least one of these.

### 36.1 ADR-0006 — The pipeline runs only df

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-017`

#### Decision

All model-backed pipeline execution goes through the `df` runtime.

- External coding-agent CLIs are not invoked directly by the production pipeline.
- Provider/account/model selection, credentials, quota handling, failover and execution are owned by df.
- CI and workflow orchestration call one DarkFactory runtime surface rather than provider-specific harnesses.

#### Consequences

The production pipeline has one execution owner and one routing/credential/quota model. Provider-specific behavior is expressed through DarkFactory configuration and runtime interfaces.

### 36.2 ADR-0008 — Providers are configuration-driven

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-017`

#### Decision

Provider behavior is declared through configuration and generic dialect/runtime mechanisms.

Provider declarations cover endpoints, API dialect, authentication, credential slots, headers, model discovery and quota/error mapping. Provider-specific behavior does not get its own independent orchestration subsystem.

#### Consequences

Adding or changing a provider is primarily a configuration/data change. Shared runtime mechanisms own transport, routing, authentication integration and failure handling.

### 36.3 ADR-0009 — Accounts have named credential slots

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-016`

#### Decision

DarkFactory models credentials as:

`provider → accounts[] → named credential slots`.

An account may contain multiple required values such as access token, refresh token, API key, organization/project identifier, cookie or custom header.

#### Consequences

Routing and quota state can address accounts independently. Runtime adapters receive the selected account view without collapsing DarkFactory's full credential model.

### 36.4 ADR-0011 — The quota engine is the availability authority

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-018`

#### Decision

Provider/model/account availability is determined by DarkFactory's quota engine.

The engine combines declared limits with observed response headers, usage data, errors and provider usage endpoints. Routing does not spend requests merely to probe availability.

Capacity admission is authoritative state, not an advisory preflight. Concurrent model calls reserve request/token/concurrency capacity atomically before dispatch and settle or release that reservation from observed usage. Corrupt or unreadable authoritative quota state fails closed rather than being interpreted as empty usage.

#### Consequences

All routing and operator status surfaces consume one availability model. Quota accounting is shared across processes and supports deterministic wait/skip/failover behavior without concurrent calls consuming the same remaining capacity.

### 36.5 ADR-0012 — Routing is limit-aware and capability-tiered

**Status**: Accepted

**Related rules**: `DF-RULE-014`

#### Decision

The router selects candidates using task kind, required capabilities, context, sensitivity/data policy, live quota and configured capability tiers.

- Provider eligibility is evaluated before model strength.
- The lowest sufficient capability tier is preferred.
- Failure escalation moves deterministically to a stronger eligible tier.
- Explicit graph/CLI routing remains an override subject to hard eligibility/capacity constraints.

#### Consequences

Lightweight models can serve appropriate work without consuming scarce high-capability capacity, while sensitive and capability-constrained work still fails closed.

### 36.6 ADR-0013 — df runs the workflow graph

**Status**: Accepted

**Related rules**: `DF-RULE-010`, `DF-RULE-011`, `DF-RULE-012`, `DF-RULE-013`, `DF-RULE-014`, `DF-RULE-018`

#### Decision

DarkFactory executes delivery as a declarative graph of agent, gate, automation and check-reference nodes with explicit edges and loop semantics.

Planning, implementation, review/fix, alignment and deterministic effects are orchestrated by the graph/runtime. Static CI checks may remain external and are observed through check-reference nodes.

Execution is serializable per durable run identity. Concurrent ingress for the same run cannot execute the same transition concurrently or overwrite a newer persisted transition. External effects are separately serialized by deterministic effect identity and reconciled after ambiguous interruption.

#### Consequences

Execution state is durable and resumable. Workflow topology has one declarative source rather than duplicated script orchestration, and duplicate/out-of-order ingress cannot create duplicate logical mutations.

### 36.7 ADR-0015 — The engine owns deterministic steps

**Status**: Accepted

**Related rules**: `DF-RULE-007`, `DF-RULE-018`

#### Decision

DarkFactory owns deterministic workspace and delivery effects, including repository state inspection, checkout/update operations, scope verification, commits, pushes, pull-request operations and deterministic verification.

Models perform judgement and file edits. Natural model stop is valid completion. Code-result truth is derived from observed workspace/effect state; judgement results may be structurally extracted after the model stops.

Remote mutation uses observed evidence and conditional semantics. Git pushes identify the expected old remote SHA and the new local SHA, refuse stale remote state and verify the resulting ref. Ambiguous write outcomes are reconciled before retry rather than blindly replayed.

#### Consequences

Models are not required to print control JSON, perform git operations or submit completion tools. Mutation and completion claims are backed by observed effects, and deterministic retries cannot silently duplicate or overwrite newer external state.

### 36.8 ADR-0016 — Model resolution is live

**Status**: Accepted

**Related rules**: `DF-RULE-014`

#### Decision

DarkFactory discovers usable models from configured provider catalogs/accounts at runtime.

Provider configuration contains the minimum information required to reach and authenticate to the provider. Routing uses live/cached catalog state plus quota/runtime outcomes rather than depending on hand-maintained model inventories.

#### Consequences

Model availability can change without editing routing source. Invalid or unavailable models fall out of eligibility through the shared catalog/quota mechanisms.

### 36.9 ADR-0017 — Modular packages and first-class capabilities

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-017`

#### Decision

DarkFactory is a root Bun workspace with stable first-party package boundaries:

- `@darkfactory/protocol`
- `@darkfactory/core`
- `@darkfactory/capability`
- `@darkfactory/github`
- `@darkfactory/keychain`
- `@darkfactory/auth`
- `@darkfactory/docs`
- `@darkfactory/cli`
- `@darkfactory/web`

Agentic/product behavior is implemented as versioned capabilities under root `capabilities/`. Core owns execution mechanisms; capabilities own behavior.

Each concern has one final implementation owner. Final packages do not forward implementation to a deletion-bound legacy tree, and duplicate internal registries/state/config/command owners are not maintained for migration convenience.

#### Consequences

Package dependencies remain acyclic and browser-safe boundaries are explicit. Official and third-party capabilities use the same ABI/loader. No monolithic harness package is part of the public architecture, and internal historical architecture is not a compatibility surface.

### 36.10 ADR-0019 — GitHub backs the web control plane

**Status**: Accepted

**Related rules**: `DF-RULE-009`, `DF-RULE-011`, `DF-RULE-016`, `DF-RULE-018`

#### Decision

DarkFactory Web uses GitHub as the durable issue/PR/check/project/event/authorization control plane.

The browser application reads live GitHub state through browser-safe GitHub/auth interfaces. Human-attributed actions use the authenticated GitHub user; privileged automation uses the DarkFactory GitHub App identity.

Webhook/workflow events are triggers, not authoritative state snapshots. Reconciliation derives desired status, bindings and project state from current GitHub/runtime evidence so delayed or out-of-order events are idempotent and cannot roll newer state backward.

#### Consequences

The web application does not maintain a second project database or privileged mutation backend. Consumer Pages deployments reuse the shared application and repository-specific compiled content/data, while reconciliation remains current-state driven rather than event-order driven.

### 36.11 ADR-0020 — Browser auth and machine keychain are separate trust boundaries

**Status**: Accepted

**Related rules**: `DF-RULE-016`, `DF-RULE-018`

#### Decision

`@darkfactory/keychain` owns machine credentials, provider accounts, token refresh, secure storage and GitHub App machine identity.

`@darkfactory/auth` owns human/browser GitHub authentication and session management.

Browser-safe packages cannot import machine-secret/private-key implementations.

Credential/account updates are transactionally serialized. Multi-file logical credential state cannot expose mixed generations after interruption. Replicated vault state converges deterministically, represents deletion explicitly until safe compaction, and does not resolve equal-version conflicts by caller-local preference. Browser-session refresh/revoke also uses atomic state transitions so rotating refresh tokens cannot race a concurrent revocation.

#### Consequences

Human authorization and machine automation authority remain distinct. Secret-bearing machine state never enters static/browser artifacts, and concurrent/replicated credential operations converge without resurrecting stale secrets.

### 36.12 ADR-0021 — Repository declarations, runtime detection and capability-resolved actions

**Status**: Accepted

**Related rules**: `DF-RULE-003`, `DF-RULE-006`, `DF-RULE-015`

#### Decision

- One root `*.dfconfig` owns one combined configuration document, with any filename stem accepted and none canonical; root `config.dfconfig` and root `.dfconfig` are accepted aliases for that same document.
- The `repo` block is the repository/product declaration, `providers` is runtime/user/provider configuration, and `docs` is documentation configuration.
- Consumers select only their named block from the selected document.
- `DF_CONFIG_DIR` (default `.darkfactory`) is a supported fallback discovery folder, but `.darkfactory` is not a committed source in this repository.
- Root and folder candidates may not coexist, aliases may not coexist in one scope, and separate files are never silently merged.
- Repository/package/ecosystem/domain evidence is detected by the TypeScript runtime.
- Versioned capabilities resolve applicable test, typecheck, lint, format, docs, setup and release actions.
- Domain and capability are separate axes.
- Repository identity, taxonomy and non-detectable policy are data, not hard-coded source.
- The canonical/default branch is discovered from repository state/configuration.
- Detection and action resolution fail closed on malformed/unreadable declared evidence, unknown explicit declarations, ambiguous ownership and missing required quality actions.
- Every first-party package/capability is covered exactly once by an owning action or an explicit justified workspace-level/not-applicable declaration.

#### Consequences

Repository behavior is determined by current declarations plus detected evidence and capability resolution. The final runtime has one strict configuration/detection model, and a green quality result proves complete resolved coverage rather than silently skipping unsupported packages/actions.

### 36.13 ADR-0022 — Complete the final system directly

**Status**: Accepted

**Related rules**: `DF-RULE-003`, `DF-RULE-013`, `DF-RULE-017`, `DF-RULE-019`

#### Decision

DarkFactory implementation targets the final architecture directly.

- Missing behavior is implemented in its final TypeScript package/capability owner.
- Useful existing TypeScript is moved/reused rather than rewritten solely to change ownership.
- Duplicate production implementations are not maintained in parallel.
- Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are forbidden unless an external supported contract explicitly required by this document needs them.
- Previous internal architecture is not a compatibility target and is never kept "just in case".
- Dead/unreachable code, stale configuration, unused assets, obsolete tests, superseded docs and transitional adapters are deleted rather than documented or tested into permanence.
- Shared mechanisms are abstracted once at the lowest stable owner when repetition represents the same invariant; speculative abstraction and API widening solely for tests are avoided.
- Legacy DarkFactory Python and deletion-bound harness ownership are removed once their required behavior is represented by final owners; they are not maintained as parity/fallback paths.
- Independent final-product work proceeds concurrently whenever consumed interfaces are stable.
- Tightly coupled final completion work may be consolidated into one owner-approved Request/Planning record and one integration PR instead of being artificially split into child delivery PRs.
- Before that final integration PR merges, an unpublished source-free release candidate built from its exact head/tree is validated through the complete DarkFactory acceptance and declared consumer-fleet acceptance.
- Known defects found by exact-head/fleet acceptance are fixed on the integration branch and re-proven before merge.
- Final supported publication occurs from canonical after merge without introducing behavioral source changes; publication must reproduce the proven candidate behavior/assets aside from canonical provenance metadata.

#### Consequences

Completion sequencing is optimized for the shortest safe path to one final, proven merge. The repository remains current-only and small: unsupported internal history lives in Git/issues rather than compatibility code, and fleet defects cannot be deferred into a post-merge stabilization phase.

### 36.14 ADR-0023 — First-party docs use the combined docs block and one renderer

**Status**: Accepted

**Related rules**: `DF-RULE-002`, `DF-RULE-003`

#### Decision

- `@darkfactory/docs` is the headless documentation compiler/content-graph owner.
- The `docs` block of the combined DarkFactory configuration is the only documentation configuration contract.
- The compiler builds one typed content graph from canonical Markdown, ADRs/rules, TypeScript/TSDoc API extraction, capability-contributed documentation and repository/graph/workflow metadata.
- TypeDoc may be used internally as the TypeScript/TSDoc extractor.
- `@darkfactory/web` is the only first-party web renderer.
- this document is the product homepage. §35 and §36 are canonical, and this document is the only one. the root document is the canonical product document; §37 is the deterministic generated projection of canonical rules. Supported discovery aliases may point to canonical documents or generated projections, but internal legacy aliases are not retained.
- Consumer repositories use the released web bundle plus repository-specific compiled content/data; generated sites and JSON content graphs remain CI outputs rather than committed sources.

#### Consequences

Documentation has one compiler/configuration contract and one first-party renderer while product docs, rules and long-term notes retain distinct canonical sources and generated discovery projections.

### 36.15 ADR-0024 — Effects are serializable and authoritative state is crash-consistent

**Status**: Accepted

**Related rules**: `DF-RULE-018`

#### Decision

DarkFactory correctness is defined across duplicate delivery, concurrent execution, interruption and ambiguous external-write outcomes.

- Authoritative transitions serialize at the identity they mutate: run, effect, account, branch/worktree, quota reservation, release and other durable state.
- Check-then-act is insufficient without an atomic claim, lease, transaction or compare-and-set.
- A deterministic effect identity produces at most one logical external mutation, including concurrent duplicate invocation.
- After an ambiguous non-idempotent write outcome, DarkFactory reconciles current external state before retrying.
- Remote mutation uses expected-old-version/SHA semantics where available and fails closed on stale state.
- Multi-file logical state commits through one generation/transaction boundary.
- Lock recovery cannot remove another owner's replacement lock.
- Replicated state converges independent of merge direction and represents deletion until stale replicas can no longer resurrect it.
- Concurrency/idempotency/atomicity claims are tested with simultaneous actors and injected failures at real durable boundaries, not only sequential replay after success.

#### Consequences

Crash recovery and concurrency safety are one protocol rather than separate best-effort features. Advisory telemetry may use weaker durability only when it cannot authorize work, affect mutation truth, consume capacity authority or change reconciliation decisions.

### 36.16 ADR-0025 — Each delivery branch has one integration authority

**Status**: Accepted

**Related rules**: `DF-RULE-005`, `DF-RULE-007`, `DF-RULE-019`

#### Decision

Parallel implementation uses one authoritative remote delivery branch writer.

- The orchestrator alone advances the authoritative delivery branch and owns integration.
- Parallel workers use isolated local worktrees/branches with explicit prerequisites and disjoint subsystem/path ownership.
- Workers return coherent commits, changed-file sets, targeted verification and assumptions; they do not mutate the authoritative remote branch.
- Shared integration surfaces remain orchestrator-owned unless one non-overlapping edit is explicitly delegated.
- Dependent work begins only after its consumed interface is integrated and verified.
- CI is read-only on delivery branches.
- Each implementation gate records exact-head evidence before downstream work treats it as satisfied.
- Coherent commit boundaries are preserved; one PR does not imply one opaque squash commit.

#### Consequences

Parallelism improves throughput without introducing lost updates, shared-file races or evidence attached to obsolete heads. Integration authority may be transferred explicitly, but there is never more than one active authority for one delivery branch.

### 36.17 ADR-0026 — Verification proves invariants and fails closed

**Status**: Accepted

**Related rules**: `DF-RULE-001`, `DF-RULE-006`, `DF-RULE-008`

#### Decision

Tests and CI prove product/architecture invariants rather than freezing incidental repository shape.

- Behavioral tests live at the owning package/capability boundary and survive valid refactors.
- Static tests inspect semantic structure—parsed declarations/workflows, schemas, import/dependency graphs, public exports or generated artifacts—when static structure is the actual contract.
- Exact filenames, source substrings, internal symbol names and workflow step labels are not normally product invariants.
- Duplicate/shadowed tests are invalid verification.
- Concurrency/idempotency/atomicity tests exercise simultaneous actors and crash/failure windows.
- Typecheck is a first-class TypeScript quality action.
- CI fails closed on missing, unsupported, ambiguous or stale required quality actions and accounts for every detected first-party package/capability exactly once.
- Required skipped/neutral/missing/stale checks are not treated as proven success unless they were explicitly declared not applicable before matrix construction.
- CI validates but does not mutate delivery branches; deterministic formatting/fixes happen before the governed commit.
- Release proof executes the built/source-free candidate rather than substituting source-workspace imports.

#### Consequences

A green head means the declared invariants were actually evaluated. The suite remains useful during aggressive cleanup because it protects behavior and architecture rather than stale implementation text.

### 36.18 ADR-0027 — Repository-authored artifacts use English

**Status**: Accepted

**Related rules**: `DF-RULE-004`

#### Decision

Repository-authored code, identifiers, comments, docstrings, commit messages, issues, pull-request text and documentation use English as the common written language.

Quoted verbatim user input and fixtures/content whose meaning depends on another language are explicit exceptions.

Machine enforcement is limited to surfaces that can be checked deterministically. Natural-language prose remains a review invariant rather than being protected by a brittle heuristic language detector.

#### Consequences

Human and agent contributors share one review language across source, GitHub and generated documentation without pretending that unreliable natural-language classification is a correctness gate.

### 36.19 ADR-0028 — Integrate Paper as a repository domain

**Status**: Accepted

**Related rules**: `DF-RULE-020`

#### Decision

- DarkFactory has one first-party Paper domain for the thesis manuscript and its publication.
- The Paper has one authored manuscript source and one publication owner.
- Paper publication produces the repository release artifact `PAPER.pdf`; it does not own repository documentation Markdown.
- The Paper uses the shared documentation, capability, CI, and release contracts.

#### Consequences

The thesis remains a first-class repository concern without creating a second documentation owner or a second product surface.

## 37 Agent guidance

DarkFactory is developed by an autonomous agent pipeline under human approval gates. The rules
below are binding on every contributor — human or agent.
They are binding regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated. This file is a
projection of those canonical files: it carries the normative requirement text of every rule and an
index back to each canonical file for rationale and enforcement. Related notes are derived from
accepted ADR metadata; edit canonical rules/ADRs rather than this projection.

##### Index

| ID | Rule | Related notes | Canonical file |
|---|---|---|---|
| `DF-RULE-001` | Tests prove invariants | `ADR-0026` | §35.1 |
| `DF-RULE-002` | Inline documentation and generated documentation | `ADR-0023` | §35.2 |
| `DF-RULE-003` | Product requirements and ADRs | `ADR-0021`, `ADR-0022`, `ADR-0023` | §35.3 |
| `DF-RULE-004` | English language consistency | `ADR-0027` | §35.4 |
| `DF-RULE-005` | Commit granularity | `ADR-0025` | §35.5 |
| `DF-RULE-006` | CI readiness and verification | `ADR-0021`, `ADR-0026` | §35.6 |
| `DF-RULE-007` | Branch and pull request workflow | `ADR-0015`, `ADR-0025` | §35.7 |
| `DF-RULE-008` | Automated formatting and linting | `ADR-0026` | §35.8 |
| `DF-RULE-009` | Request binding, branch cleanup and board status | `ADR-0019` | §35.9 |
| `DF-RULE-010` | Reviewed Planning and implementation alignment | `ADR-0013` | §35.10 |
| `DF-RULE-011` | Pull request review approval and governed merge | `ADR-0013`, `ADR-0019` | §35.11 |
| `DF-RULE-012` | Verbatim Request capture and Planning gate | `ADR-0013` | §35.12 |
| `DF-RULE-013` | Specification sequence and work tracking | `ADR-0013`, `ADR-0022` | §35.13 |
| `DF-RULE-014` | Capability-driven agent runtime and resilience | `ADR-0006`, `ADR-0008`, `ADR-0009`, `ADR-0011`, `ADR-0012`, `ADR-0013`, `ADR-0016`, `ADR-0017` | §35.14 |
| `DF-RULE-015` | Commits, repository taxonomy and domains | `ADR-0021` | §35.15 |
| `DF-RULE-016` | Security and secrets | `ADR-0009`, `ADR-0019`, `ADR-0020` | §35.16 |
| `DF-RULE-017` | Final architecture, DRY, and deletion | `ADR-0006`, `ADR-0008`, `ADR-0017`, `ADR-0022` | §35.17 |
| `DF-RULE-018` | Concurrency, atomicity, and idempotency | `ADR-0011`, `ADR-0013`, `ADR-0015`, `ADR-0019`, `ADR-0020`, `ADR-0024` | §35.18 |
| `DF-RULE-019` | Orchestrated integration and worker isolation | `ADR-0022`, `ADR-0025` | §35.19 |
| `DF-RULE-020` | Paper authorship and publication | `ADR-0028` | §35.20 |

---

**Nothing restates the rules.** An agent reads §35 directly, and this section exists to say so and
to hold the index that points there. A projection of the rules is a second description of the rules,
which is the thing §5.2 exists to prevent, and the earlier version of this section was the clearest
instance of the failure in the document that argues against it: three thousand words restating
twenty rules that were already stated, in the same file, forty lines above.

## 38 How to tell if this is wrong

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
agent; whatever the internals do, the seam has leaked where it matters most and §11.1 is false.
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

## 39 Non-goals

Stating what a system refuses is part of its design, because a goal without refusals is a wish.
Each of the following is excluded deliberately, and several are excluded *because* pursuing them
would require a second description of the system.

**Not a workflow engine for any one domain.** The mechanism expresses "act on a system through a
declared interface" and has no domain built into it. Repository work is the first application, not
the definition. A paper is a domain, mathematics is a domain, and a fleet of machines is a domain,
and the system should not notice the difference. If it can only ever do what its first application
did, it is a tool that grew a pipeline.

**Not a faster build for any one workload.** A general mechanism will not beat a hand-tuned build
graph specialised to a repository, and it is not trying to. Trying would mean encoding per-project
knowledge into the mechanism, which is the second site of meaning wearing a performance budget. The
honest claim is about *maintenance*, not milliseconds: a system that describes itself once does not
drift, and drift is what makes builds slow over time.

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
produces a system that is either unusable or unsafe. §26 states what identity does not decide.

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

## 40 Related work

DarkFactory is not the first system to insist on a declarative description, and the comparison is
where the moat is either load-bearing or decorative. This section states the difference for each
body of related work; where the difference is thin, that is said.

| Work | What it shares | Where it differs |
| --- | --- | --- |
| **Terraform / OpenTofu** | Desired state, convergence, plan-before-apply | The description is a separate authored language (HCL), the plan is a text artifact reviewed separately from the system, and each resource type is a hand-written provider plugin. DarkFactory's description *is* the implementation, and the interface is derived from it. |
| **Nix / NixOS** | One declarative description, reproducible output, the most disciplined instance of the idea | Nix's description is a DSL with a fixed evaluator and it describes a *build*; DarkFactory's is the code, it describes a *running system*, and documentation is part of the description. Nix also needs `mkDefault`/`mkForce` and manual override plumbing — the friction of a language that is not the thing being described. |
| **Bazel / Buck2 / Pants** | Hermetic, derived from source, fast | `BUILD` files are hand-written beside the source. That is the second site of meaning exactly, and keeping it current is a tax the design accepts. They also describe *how to build* rather than what a system means. |
| **Dagger, CI-as-code, GitHub Actions** | Programmable pipelines, code as configuration | The pipeline is a second description of the same work the system is doing. DarkFactory's graph is a projection of the same resolution rather than an independent description of the work. |
| **Convergent design** | One declarative description, convergence, anti-entropy, no duplication of state | The framing is nearly identical; the contribution here is extending the declarative description from *configuration* to *interfaces and documentation*, which is what makes surfaces free and self-description possible. |
| **Category theory** (monoidal, CCC, monad) | The natural language for composition and for swappable interpreters | Algebraic composition fixes the product. DarkFactory's composition is structural discovery at runtime and its "tensor" is a folder, which is why adding a capability needs no change to a monoid instance. |
| **Algebraic effects, free monads** | The standard encoding of "small vocabulary, several interpreters" | A free monad is the right *shape*, but a program still names its interpreter. DarkFactory's declaration names a backend and the vocabulary is fixed; the difference is that the composition set is discovered rather than assembled. |
| **Protobuf / OpenAPI / GraphQL** | Interface descriptions that can be generated from code | The middle path this design rejects. A generated description is still a description, still a claim about the system, and still needs a component that must be current. Deriving the interface *from the code that implements it, including its documentation*, removes the claim. |
| **MCP, plugin manifests, extension APIs** | Published contracts for agent integration | All authored per integration, and therefore all a second place to update. DarkFactory derives the forms. |
| **Language servers, `tsc`** | The reason a systems layer need not invent syntax | Adopted rather than extended: the systems layer is TypeScript, so every editor, type package and published library works unchanged. |

Two comparisons are worth drawing out, because they are the ones a reader is most likely to
assume are equivalent.

**Nix is the strongest existing example and is still different in kind.** It has one declarative
description, and that is most of the idea. But its description is a purpose-built language with a
fixed evaluator, so the description is a *thing* the author writes rather than the thing they
wrote; the ecosystem around it is large precisely because the description cannot express what the
author already knows in their own language; and it describes a derivation to an artifact, not a
system that is running while you read it. DarkFactory's claim is that the description and the
implementation can be the same artifact, and that documentation belongs inside it.

**Generated descriptions are the near miss, and the gap is small enough to be easy to close by
accident.** The intuitive fix for "a manifest drifts from the code" is to generate the manifest,
and it is a genuine improvement on maintaining it. It is also a trap with a long fuse: the
generated description is still consumed as a description, so a consumer is reading a claim about the
system; the generator becomes something that must be correct; and the moment someone needs a field
the generator does not produce, the pressure to hand-write it is immediate and locally reasonable.
§4.2 and I1 exist to close that fuse.

## 41 Terminology

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
reconciliation. The completion condition. §2.

**Generation** — an applied declaration's recorded result: a parent, a diff and an author. Audit
and undo are one mechanism, not two.

**Proof** — the material that satisfies an authentication challenge. May be stored, derived, or
exist only during a flow. Not the same as a credential, and not the same as an authorization. §26.

**Holder** — a place identity material is kept. A holder is not authoritative when material is
split across several.

**Presenter** — a surface bound to a session so that a human and an agent see the same resolution.
§11.

**Authored meaning** — any description of a feature written beside the feature. The thing the count
in §5.3 measures, and the only number this design is honest about.

## 42 Relationship to the paper

Binding on every contributor, human or agent, regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated.

## 43 Provenance

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
not a place meaning is read. The structural frame in §3 — three unifiers and five operations — is
also not new: it is the shape those decisions had in common, which is why it is stated once instead
of being rediscovered per section.

The one place this document departs from its sources is deliberate and marked where it occurs:
§9.1 and §16 argue that owning `.df` is not the same decision as owning a declaration language,
because DarkFactory authors its own systems layer and binds everyone else's.
