# DarkFactory — Roadmap & Epics

This roadmap documents the strategic evolution of the DarkFactory autonomous software engineering platform.
Each epic represents a coherent capability increment with explicit entry gates and deliverables.

---

## Roadmap Overview

```
Phase 1: Foundation & Resiliency
  E1: Multi-Harness Expansion & Dynamic Registry
  E2: Multi-Model Quota Optimization & Fallback Ladder
  E3: Automated Test Matrix & Sandbox Verification

Phase 2: Governance & Collaboration
  E4: Multi-Agent Coordination & Peer Review Swarms
  E5: Autonomous Dependency & Vulnerability Remediation
  E6: Interactive CLI & TUI Operator Dashboard

Phase 3: Intelligence & Scale
  E7: Semantic Memory & Context Caching Layer
  E8: Repository Fleet Orchestration & Multi-Repo DAGs
  E9: Workflow Telemetry, Audit Logs & Performance Analytics
  E10: Enterprise Provider & Policy Enforcement Engine
```

---

## Epics & Specifications

### E1: Multi-Harness Expansion & Dynamic Registry
- **Objective**: Expand CLI harness support beyond Antigravity, Claude, and Codex to support custom local and remote LLM runners via standard input/output protocols.
- **Entry Gate**: D1 approved and established in `ARCHITECTURE.md`.
- **Deliverables**: Pluggable harness config in YAML/JSON, runtime environment detection, custom prompt template rendering.

### E2: Multi-Model Quota Optimization & Fallback Ladder
- **Objective**: Dynamically track provider token limits and cost metrics to intelligently route tasks to the most cost-effective and capable model.
- **Entry Gate**: E1 completed; provider quota telemetry available.
- **Deliverables**: Cost-aware harness selector, proactive token budgeting, adaptive rate-limit backoff algorithms.

### E3: Automated Test Matrix & Sandbox Verification
- **Objective**: Extend containerized runner to execute multi-language test suites (Python, Rust, TypeScript, Go) in isolated network namespaces.
- **Entry Gate**: D4 containerized execution.
- **Deliverables**: Hermetic test runner script, ephemeral test database provisioning, code coverage reporting integration.

### E4: Multi-Agent Coordination & Peer Review Swarms
- **Objective**: Split implementation and review between distinct agent harnesses (e.g. Claude generates code, Antigravity performs security audit).
- **Entry Gate**: E1 multi-harness registry.
- **Deliverables**: Adversarial self-review protocol, consensus scoring before PR dispatch, automated diff remediation.

### E5: Autonomous Dependency & Vulnerability Remediation
- **Objective**: Continuous security scanning with automated patch generation and test verification for vulnerable dependencies.
- **Entry Gate**: E3 automated test verification.
- **Deliverables**: Dependabot and Renovate webhook consumers, automated patch testing pipeline, automated PR submission with test reports.

### E6: Interactive CLI & TUI Operator Dashboard
- **Objective**: Provide a local terminal dashboard (`darkfactory-tui`) for human maintainers to inspect pipeline state, review plans, and dispatch runs.
- **Entry Gate**: D3 GitHub Projects v2 integration.
- **Deliverables**: Charm Bubble Tea / Ink TUI interface, live issue timeline viewer, one-key approval dispatch.

### E7: Semantic Memory & Context Caching Layer
- **Objective**: Persistent cross-run codebase index using embeddings and AST graphs to accelerate agent comprehension and reduce token consumption.
- **Entry Gate**: E1 harness architecture.
- **Deliverables**: Local vector store cache, incremental AST chunking, prompt context injector.

### E8: Repository Fleet Orchestration & Multi-Repo DAGs
- **Objective**: Coordinate cross-repository changes across umbrella or federated repositories.
- **Entry Gate**: E1 and E4.
- **Deliverables**: Multi-repository dependency graph solver, atomic cross-repo PR dispatch, synchronized auto-merge.

### E9: Workflow Telemetry, Audit Logs & Performance Analytics
- **Objective**: End-to-end auditability of every model inference, prompt token, test result, and lifecycle transition.
- **Entry Gate**: Continuous across all epics.
- **Deliverables**: OpenTelemetry traces, Prometheus metrics exporter, structured JSONL audit logs.

### E10: Enterprise Provider & Policy Enforcement Engine
- **Objective**: Configurable compliance rulesets (license compatibility, secret scanning, forbidden imports) checked before PR creation.
- **Entry Gate**: D6 repository settings and branch protection.
- **Deliverables**: OPA/Rego policy engine integration, compliance status checks, automated compliance badge generation.
