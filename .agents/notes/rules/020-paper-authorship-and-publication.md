---
id: DF-RULE-020
title: Paper authorship and publication
status: normative
applies_to: [paper, authors, contributors]
activation: paper-changes
owners: [paper, release]
---
# Rule 20 — Paper authorship and publication

## Requirement

`paper/index.typ` is the sole authored thesis manuscript. `paper/bib/`, `paper/fonts/`, and `paper/img/` contain its supporting bibliography, font, and image resources. The Paper-specific release and CI commands are declared in `repo.dfconfig`; the generic Paper capability remains available to other repositories.

The imported Paper snapshot is `marius-patrik/DarkFactory-Paper@f6a54b14a3980dc7e8eea366509e451557a85efe`. DarkFactory implementation claims in the thesis remain pinned to `e9c10221b40589512d262a0edb95f709b923150c`. The import does not include Paper history, a submodule, a second web application, or a second Paper governance file.

The canonical publication command generates `paper/ODBORNA_PRACE.pdf` and the repository-root `README.md` from the thesis source. The product documentation home remains `.agents/PRD.md`; generic documentation builds do not own or overwrite the Paper README.

Manuscript prose and supporting assets change only on explicit author request. The author reviews thesis changes before they are staged or delivered.

## Rationale

One manuscript authority and one publication generator keep the thesis reproducible without creating a second Paper product or documentation structure.

## Enforcement

Paper publication validation, release planning, capability detection, CI, and repository governance checks cover these invariants.

## Exceptions

Quoted source material may retain its source language. A later accepted migration may move the Paper workbench into the shared web architecture; the standalone web app is not imported as a second owner.

## Change control

Durable Paper product requirements belong in `.agents/PRD.md`; Paper publication behavior changes through this rule and an accepted ADR.
