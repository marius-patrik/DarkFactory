# ADR-0019 — GitHub-backed web control plane with GitHub App user authentication

**Status**: Accepted  
**Date**: 2026-09-19  
**Resolves**: Final DarkFactory Web control-plane model and human authentication

## Context

DarkFactory already uses GitHub issues, pull requests, reviews, checks, projects and the DarkFactory GitHub App as its durable coordination surface. The desired web UI should replace normal day-to-day use of the GitHub website without introducing a second state database or a full DarkFactory application server.

A static GitHub Pages bundle cannot safely contain a GitHub App client secret or private key.

## Decision

DarkFactory Web is a dynamic GitHub-backed client hosted on GitHub Pages. It reads live repository state through browser-safe GitHub APIs and combines that with compiled repository content.

`@darkfactory/auth` owns human/browser authentication using the existing DarkFactory GitHub App. The normal login uses GitHub App user authorization with PKCE and a minimal confidential token exchange/refresh broker.

The broker is authentication infrastructure only. It has no repository/Request/pipeline/model state, no project database and no DarkFactory execution API.

User authority comes from GitHub: the intersection of the App installation, App permissions and the authenticated user's own repository permissions. DarkFactory does not maintain a parallel RBAC database.

Human-attributed actions use user authority where appropriate. Privileged automation remains owned by the GitHub App installation identity and df. The UI represents those operations as canonical GitHub-backed intents/events rather than performing privileged automation itself.

The target product is that DarkFactory Web becomes the primary day-to-day operator interface; direct use of github.com remains optional except where GitHub itself requires a consent/review surface.

## Rejected alternatives

### Put GitHub App secrets into Pages

Rejected because browser/static assets cannot securely hold confidential App credentials.

### Add a full DarkFactory web backend

Rejected because GitHub already provides the durable state/event/control plane and duplicating it would create reconciliation and authorization problems.

### Use a separate DarkFactory permission database

Rejected because GitHub user + installation permissions already define the authoritative access boundary.

## Consequences

- #423 owns the auth package/broker.
- #425 owns the reusable web app.
- Browser bundles have strict import boundaries from server/keychain code.
- Web UI and CLI may share protocol schemas without sharing secret custody.
