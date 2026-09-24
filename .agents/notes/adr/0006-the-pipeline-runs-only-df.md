# ADR-0006 — The pipeline runs only df

**Status**: Accepted

## Decision

All model-backed pipeline execution goes through the `df` runtime.

- External coding-agent CLIs are not invoked directly by the production pipeline.
- Provider/account/model selection, credentials, quota handling, failover and execution are owned by df.
- CI and workflow orchestration call one DarkFactory runtime surface rather than provider-specific harnesses.

## Consequences

The production pipeline has one execution owner and one routing/credential/quota model. Provider-specific behavior is expressed through DarkFactory configuration and runtime interfaces.
