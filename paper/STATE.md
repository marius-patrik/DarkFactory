# STATE — DarkFactory thesis

Updated 2026-10-01 after the final manuscript and typography pass.

## Identity

- Thesis: *Agentické inženýrství ve vývoji softwaru — Návrh a implementace DarkFactory*
- Author: Patrik Marius
- Supervisor: Michal Dočekal
- School: Gymnázium J. K. Tyla
- Year: 2026
- Source: Typst under `paper/`
- Branch: `docs/thesis`

## Final framing

The paper is an **engineering case study of contemporary agentic software-development practice**,
not an experiment measuring general model reliability.

### Goal

> Cílem práce je popsat a systematizovat principy současného agentického inženýrství ve vývoji softwaru a na systému DarkFactory ukázat, co jejich propojení umožňuje v praxi.

### Research question

> Jaké architektonické a procesní principy se opakují v současném agentickém vývoji softwaru a jak jsou realizovány v systému DarkFactory?

There is no formal reliability hypothesis and no K1–K5 evaluation scheme.

## Final structure

```
1 Úvod
  1.1 Motivace – vývoj a adopce generativní AI
  1.2 Cíl, výzkumná otázka a vymezení
  1.3 Terminologie
2 Teoretická část
  2.1 Agent – co to je a jak funguje
  2.2 Agentic Engineering (agentické inženýrství)
  2.3 Software Factory (softwarová továrna)
3 Praktická část
  3.1 Metodika
  3.2 Návrh systému DarkFactory
  3.3 Architektura systému
  3.4 Průchod požadavku systémem
  3.5 Implementace pomocí agentů
4 Zjištění a diskuse
5 Závěr
```

## Final practical framing

- DarkFactory is a deliberately small GitHub-native bootstrap implementation of a software factory.
- The practical chapter is grounded in the pinned case-study revision `d576ec8f`.
- GitHub carries durable workflow state; GitHub Actions dispatch work; Docker isolates runs;
  the runner orchestrates stages; commercial agent harnesses provide the agent loop.
- Inline API documentation and canonical repository documents feed generated documentation,
  which acts as the bridge between the implementation and the human operator.
- The end-to-end description covers request interpretation, plan approval, implementation,
  deterministic checks, bounded model review, plan alignment, human review, merge and cleanup.
- DarkFactory itself was implemented with commercial coding agents. Its initial scope was kept
  small enough to bootstrap a process that can then be used to extend the same system.

## Final findings

The case supports a recurring composition rather than a universal architecture:

- durable state outside the model;
- a deliberate split between model judgment, harness capabilities and programmatic orchestration;
- specification and explicit human decision gates;
- deterministic checks where the result can be computed;
- integration through ordinary repository artifacts such as branches and pull requests;
- documentation generated from canonical sources as a human-facing view over the implementation.

The discussion also records the concrete limits of the pinned bootstrap revision: model-based
review is not deterministic verification, the bounded review loop can exhaust without a clean
verdict, verification is not repeated after its one automated fix attempt, and an out-of-scope
review finding can amend the plan without a renewed human approval.

## Final presentation conventions

- Czech annotation and English abstract match the final findings.
- Keywords are stored in `components/metadata.typ`.
- Czech body text is justified, hyphenation is disabled and paragraphs do not split across pages.
- English industry terms are introduced as bold italic `*English (česky)` terms when a Czech
  equivalent is useful; concise definitions are moved to footnotes.
- Figure and table captions are deliberately minimal.
- Prose, headings, labels and caption separators avoid colons; bibliography URLs keep their
  required URL-scheme colons.
- Chapters 4 and 5 are intentionally concise and avoid repeating the practical walkthrough.

## Verification

- All figure and table references resolve.
- Publication build uses bundled Caladea fonts.
- CI publication build and paper tests compile the manuscript successfully.
- The tracked `PAPER.pdf` was regenerated after the final source changes.
- Final PDF contains 33 pages and was visually inspected after the layout pass.
