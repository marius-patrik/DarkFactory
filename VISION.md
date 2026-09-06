# DarkFactory — Vision & Philosophical Foundation

> **Status: NON-NORMATIVE.**
> This document captures the foundational scoping discussions, design goals, and user conversations
> that inspired the DarkFactory paradigm. It serves as reference and historical intent.
> Normative specifications are defined strictly in [ARCHITECTURE.md](ARCHITECTURE.md).
> Provenance details and extraction history are documented in [notes/vision_capture.md](notes/vision_capture.md).

---

## 1. Provenance and Origin

This document captures the synthesis of foundational conversations held on [gemini.google.com](https://gemini.google.com)
regarding lights-out software engineering, autonomous developer agents, and strict quality gates.

The central inquiry was:
*Can we build an autonomous software factory that develops code with zero hallucinated scope drift,
zero unattended regressions, and total alignment with human intent?*

---

## 2. The Dark Factory Metaphor

In modern manufacturing, a "Dark Factory" is a production facility operated entirely by robotics and automated
systems. Lights remain off because machines do not require visual light to perform precision assembly.

In software engineering, a **Dark Factory** is a codebase where routine, multi-step engineering workflows:
1. Ingesting user feature requests and bug reports.
2. Formulating disambiguated, structured implementation plans.
3. Writing code, tests, and documentation.
4. Running iterative self-review passes and fixing defects.
5. Verifying against comprehensive test suites and formatters.
6. Opening bot-authored draft pull requests.
7. Auto-merging upon maintainer review approval.

...all proceed autonomously in the background ("with the lights off").

---

## 3. The Anti-Hallucination Philosophy

Unconstrained autonomous agents quickly diverge into speculative features, unwanted refactors, and broken contracts.
DarkFactory solves this through two architectural constraints:

### 3.1 Verbatim Ingestion
Requests must be captured in the issue verbatim, exactly as the user typed them. Agents are forbidden from rewriting
or summarizing the prompt prior to interpretation.

### 3.2 The Two-Gate Signoff Contract
No agent is permitted to write code until two explicit human checkpoints have occurred:
1. **Interpretation Signoff**: The human maintainer confirms: *"Yes, you correctly understand what I want."*
2. **Plan Signoff**: The human maintainer confirms: *"Yes, the technical implementation plan and modified files are correct."*

Only when both approvals are posted in the issue thread does the implementation engine check out a branch and generate code.

---

## 4. Review Notes & Open Topics

### Review notes on pipeline boundaries
1. **Self-Review Loop Limits**: Automated self-reviews must be bounded (maximum 3 iterations) to prevent infinite token-burning loops.
2. **Container Isolation**: Toolchains and runners must be hermetic. Containerized runners must not inherit ambient host credentials.
3. **Project Board Synchronization**: GitHub Projects v2 status movements must remain idempotent and self-healing.

For technical specifications, refer to [ARCHITECTURE.md](ARCHITECTURE.md).
