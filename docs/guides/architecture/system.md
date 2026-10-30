# System architecture

The normative package table is in the [README](../../../README.md); decisions are exclusively maintained in the [ADRs](../../../.darkfactory/ADRs.md).

## Ownership

`@darkfactory/protocol` contains serialized browser-safe contracts; `core` contains reusable mechanisms; `capability` owns ABI/action machinery; `plugins` owns loading; `harness` owns agentic graph execution; `github` owns GitHub REST/GraphQL; `keychain` owns machine secrets; `auth` owns user/browser sessions; `cli` owns command/TUI; `docs` compiles a headless graph; `web` renders the one application.

## Graph and recovery

A Request flows through Planning, Approval, implementation, checks, review, final alignment and merge/reconciliation. Each transition requires durable state and observed evidence. Concurrent ingress of one run identity and concurrent same-key effects must serialize. Ambiguous GitHub writes require external reconciliation before retry.

## Browser boundary

The static Pages bundle contains no GitHub App private key, runtime provider keys or machine vault. Privileged installation token operations occur on a server-side credential boundary. Browser users must authorize user-scoped operations; GitHub App scope never silently substitutes for user approval.

## Deployment

One immutable Web bundle is shared by producer and approved consumers, with repository-specific non-secret configuration. `/docs/` is the static docs subtree; app root is the Pages base. See [site build contract](../development/site-build.md).

## Implementation status

#2696, #2698, #2699, #2700 and #2703 own acceptance. This architecture is a required boundary, not evidence that every component is deployed.
