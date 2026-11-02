---
name: paper-authorship-and-publication
description: Use when changing the thesis manuscript, its bibliography, fonts or images, or the paper build and release: treat the paper repository's main.typ as the sole authored manuscript, generate its PDF with the canonical publication command, include it in release assets, and change prose only on explicit author request with author review before staging.
title: Paper authorship and publication
status: normative
applies_to: [paper, authors, contributors]
activation: paper-changes
owners: [paper, release]
license: MIT
---

# Paper authorship and publication

## Requirement

The manuscript lives in the paper repository (`marius-patrik/DarkFactory-Paper`), not in this one: its `main.typ` is the sole authored thesis manuscript, its `typst.toml` names that as the entrypoint, and its components directory holds the bibliography, font and image resources. This repository keeps the *paper capability* — the typesetting behaviour — and no manuscript.

The canonical publication command generates the repository-root `THESIS_CASE_STUDY.pdf` artifact. The Paper does not generate or own repository Markdown; the repository README is the canonical product document at `README.md`, and the rules are skills rather than a generated projection. `THESIS_CASE_STUDY.pdf` is included in the release assets.

The Paper uses the shared documentation, capability, CI, and release contracts. Manuscript prose and supporting assets change only on explicit author request. The author reviews thesis changes before they are staged or delivered.

## Rationale

One manuscript authority and one publication generator keep the thesis reproducible without creating a second Paper product or documentation structure.

## Enforcement

Paper publication validation, release planning, capability detection, CI, and repository governance checks cover these invariants.

## Exceptions

Quoted source material may retain its source language. A later accepted migration may move the Paper workbench into the shared web architecture; the standalone web app is not imported as a second owner.

## Change control

Durable Paper product requirements belong in the generated PRD projection; Paper publication behavior changes through this rule and an accepted ADR.
