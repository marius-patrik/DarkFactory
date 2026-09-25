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

`paper/index.typ` is the sole authored thesis manuscript. `paper/bib/`, `paper/fonts/`, and `paper/img/` contain its supporting bibliography, font, and image resources.

The canonical publication command generates the repository-root `PAPER.pdf` artifact. The Paper does not generate or own repository Markdown; the repository README is generated from `.agents/notes/`. `PAPER.pdf` is included in the release assets.

The Paper uses the shared documentation, capability, CI, and release contracts. Manuscript prose and supporting assets change only on explicit author request. The author reviews thesis changes before they are staged or delivered.

## Rationale

One manuscript authority and one publication generator keep the thesis reproducible without creating a second Paper product or documentation structure.

## Enforcement

Paper publication validation, release planning, capability detection, CI, and repository governance checks cover these invariants.

## Exceptions

Quoted source material may retain its source language. A later accepted migration may move the Paper workbench into the shared web architecture; the standalone web app is not imported as a second owner.

## Change control

Durable Paper product requirements belong in the generated PRD projection; Paper publication behavior changes through this rule and an accepted ADR.
