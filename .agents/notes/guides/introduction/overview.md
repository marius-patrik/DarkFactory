# What DarkFactory is

**Product contract:** [README](../../../README.md). **Decisions:** [ADRs](../../../.darkfactory/ADRs.md). **Delivery status:** [finish master #2070](https://github.com/marius-patrik/DarkFactory/issues/2070).

DarkFactory is a TypeScript/Bun software-delivery system designed to turn governed GitHub Requests into planned, reviewed, verifiable changes. GitHub holds durable work records and authorization; the runtime executes the graph and owns effects. Capabilities contribute domain-specific work.

## How to read these docs

Start with [installation](../getting-started/installation.md) and [the first Request](../getting-started/first-request.md). Operators should follow [request lifecycle](../operator/lifecycle.md), then [recovery](../operator/recovery.md). Contributors should read [architecture](../architecture/system.md).

## Implementation maturity

**Target, not accepted release:** v1.0.0. Until the exact-head candidate and deployment gates in #2070 pass, feature descriptions are contracts, not independently verified shipped behavior. Individual commands below are transcribed from source definitions; their presence does not prove successful live operation.

## Components

The named first-party package owners and their required boundaries are in the [README](../../../README.md). Browser sessions, runtime secrets and GitHub App installation tokens are separate trust boundaries by design.

## System requirements

Development uses Bun, TypeScript and the repository's frozen workspace lockfile. Native distribution, supported host platforms, self-contained install/update and container execution require candidate proof under #2709; do not infer availability from source build configuration alone.
