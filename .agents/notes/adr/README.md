# Architecture Decision Records

This directory contains only architecture decisions that are currently in force.

Every record has `Status: Accepted`. Repository files do not preserve superseded or historical architecture; GitHub issues are the sole record for previous decisions and superseded work.

Current records:

- ADR-0006 — pipeline execution goes through df;
- ADR-0008 — provider behavior is configuration-driven;
- ADR-0009 — providers support named multi-account credential slots;
- ADR-0011 — quota state is the availability authority;
- ADR-0012 — routing is limit-aware and capability-tiered;
- ADR-0013 — df executes the workflow graph;
- ADR-0015 — deterministic steps belong to the engine;
- ADR-0016 — model resolution is live;
- ADR-0017 — root workspace packages and first-class capabilities;
- ADR-0019 — GitHub backs the web control plane;
- ADR-0020 — machine keychain and browser auth are separate trust boundaries;
- ADR-0021 — repository declarations and capability-driven detection;
- ADR-0022 — complete the final system directly;
- ADR-0023 — first-party docs use docs.df and one renderer.

When a current architecture decision changes, update the active architecture set and keep the previous decision only in its GitHub issue.
