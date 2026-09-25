<!-- Generated from .agents/notes/** by @darkfactory/docs. Do not edit .agents/README.md directly. -->

# DarkFactory

DarkFactory is a self-hosting autonomous software-delivery system built around a declarable workflow graph, versioned capabilities, and GitHub as its durable control plane.

## Repository contract

- `.agents/rules/` is the canonical source for normative repository rules.
- `.agents/adr/` is the canonical source for accepted architecture decisions.
- `.agents/notes/` is the canonical source for non-normative repository and domain notes.
- `.agents/AGENTS.md`, `.agents/PRD.md`, and `.agents/README.md` are generated projections of those three sources.
- Root `AGENTS.md`, `CONTRIBUTING.md`, `PRD.md`, and `README.md` are symlinks to the generated projections.

The generated projections are checked in CI for drift. The source notes remain the authority; generated documents must not be edited directly.

# Paper domain

The repository contains a first-party Paper domain for the DarkFactory thesis manuscript and its publication.

## Publication

- The authored manuscript lives at `paper/index.typ`.
- Bibliographic, font, and image resources live under `paper/`.
- The publication command compiles the manuscript to the repository-root `PAPER.pdf` artifact.
- `PAPER.pdf` is a release asset.
- Paper publication does not generate or own repository Markdown; the repository README is generated from `.agents/notes/`.

The imported Paper source revision and delivery evidence belong to the delivery record, not to the normative repository rule or the architecture decision.
