# DarkFactory

DarkFactory is a self-hosting autonomous software-delivery system built around a declarable workflow graph, versioned capabilities, and GitHub as its durable control plane.

## Repository contract

- `.agents/rules/` is the canonical source for normative repository rules.
- `.agents/adr/` is the canonical source for accepted architecture decisions.
- `.agents/notes/` is the canonical source for non-normative repository and domain notes.
- `.agents/AGENTS.md`, `.agents/PRD.md`, and `.agents/README.md` are generated projections of those three sources.
- Root `AGENTS.md`, `CONTRIBUTING.md`, `PRD.md`, and `README.md` are symlinks to the generated projections.

The generated projections are checked in CI for drift. The source notes remain the authority; generated documents must not be edited directly.
