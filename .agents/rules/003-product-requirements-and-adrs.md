---
id: DF-RULE-003
title: Product requirements and ADRs
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [pr206, merge-gates]
---
# Rule 3 — Product requirements and ADRs

## Requirement

Product requirements are defined by `PRD.md`, the single normative product document. Executable
declarations (providers, taxonomy, workflow graph, installed consumers) live in
`.darkfactory/manifest.json`, and mandatory contribution behavior in `.agents/rules/*.md`. Any
deviation from `PRD.md` MUST be explicitly approved by the user and recorded as a discrete ADR
under `.agents/notes/adr/` before it is implemented.

## Rationale

One product contract prevents two documents overriding each other. Decisions justify themselves in
discrete ADRs; the requirement that changed stays in the PRD.

## Enforcement

- `tests/test_governance.py::test_prd_is_the_only_normative_product_document`
- `tests/test_governance.py::test_legacy_knowledge_files_are_absent`

## Exceptions

None.

## Change control

Owned jointly with `merge-gates` (interpretation/plan wording) and `workflow-graph` (node
topology). ADR numbering is per-file under `.agents/notes/adr/`; the deprecated multi-record
`architecture_decisions.md` ledger was split into one discrete file per decision on 2026-09-13 and
removed.