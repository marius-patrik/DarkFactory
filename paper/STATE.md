# STATE — DarkFactory thesis

Updated 2026-10-01 after the final content-alignment pass.

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
  1.1 Motivace: Vývoj a adopce generativní AI
  1.2 Cíl, výzkumná otázka a vymezení
  1.3 Terminologie
2 Teoretická část
  2.1 Agent: Co to je a jak funguje
  2.2 Agentické inženýrství
  2.3 Softwareová továrna
3 Praktická část
  3.1 Metodika
  3.2 Návrh systému DarkFactory
  3.3 Architektura systému
  3.4 Průchod požadavku systémem
  3.5 Implementace pomocí coding agentů
4 Zjištění a diskuse
5 Závěr
```

## Final practical framing

- DarkFactory is a deliberately small GitHub-native bootstrap implementation of a software factory.
- The practical chapter is grounded in the pinned case-study revision `d576ec8f`.
- GitHub carries durable workflow state; GitHub Actions dispatch work; Docker isolates runs;
  the runner orchestrates stages; commercial coding-agent harnesses provide the agent loop.
- Inline API documentation and canonical repository documents feed generated documentation,
  which acts as the bridge between the implementation and the human operator.
- The end-to-end description covers request interpretation, plan approval, implementation,
  deterministic checks, bounded model review, plan alignment, human review, merge and cleanup.
- DarkFactory itself was implemented with commercial coding agents. Its initial scope was kept
  small enough to bootstrap a pipeline that can then be used to extend the same system.

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

## Completed final alignment

- Czech annotation and English abstract match the final findings; Czech annotation is within the
  school guide's recommended 150–250-word range.
- Production software-factory framing is cited with Stripe and Meta primary-source examples.
- Every numbered figure/table has an explicit prose reference.
- Stale hypothesis/K1–K5/TODO source notes have been removed from manuscript files.
- Chapter 4 answers the research question and states case-bounded limitations.
- Chapter 5 explicitly states that the goal was fulfilled and introduces no new claim.
- Final publication PDF was generated from CI, visually inspected across all 40 pages, and confirmed to embed the bundled Caladea family. The tracked `PAPER.pdf` was regenerated from the same publication build. No manuscript work remains.
