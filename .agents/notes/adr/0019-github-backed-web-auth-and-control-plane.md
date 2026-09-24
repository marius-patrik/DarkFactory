# ADR-0019 — GitHub backs the web control plane

**Status**: Accepted

## Decision

DarkFactory Web uses GitHub as the durable issue/PR/check/project/event/authorization control plane.

The browser application reads live GitHub state through browser-safe GitHub/auth interfaces. Human-attributed actions use the authenticated GitHub user; privileged automation uses the DarkFactory GitHub App identity.

## Consequences

The web application does not maintain a second project database or privileged mutation backend. Consumer Pages deployments reuse the shared application and repository-specific compiled content/data.
