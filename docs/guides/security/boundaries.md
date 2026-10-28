# Security and authorization boundaries

The public Pages artifact is **static and public**. Never publish GitHub App private keys, provider credentials, session secrets, bearer tokens, keychain state or internal runner environment snapshots.

## Identities

An App installation token is automation identity; browser user authorization must remain tied to the authenticated user and permitted GitHub scopes. Server-side auth broker/session mechanisms are not embedded in frontend assets. Machine keychain and browser session storage have separate owners.

## Untrusted input

Docs Markdown is repository-controlled but still must be escaped by the renderer and checked for executable schemes/control characters, unsafe HTML, missing assets and malformed links. No `javascript:`, `data:`, protocol-relative script URLs or HTML injection may become clickable content.

## Governance

Every mutation must be approval-bound where required and later verified by readback. Webhook event arrival is not a current-state proof. PR source and secrets must never be combined in a privileged CI job without an independent trust decision.

## Incident

On suspicion of credential leakage, stop deployment, rotate affected credentials, invalidate sessions as appropriate, collect non-secret provenance and review the exact artifact. #2700/#2706 own runtime security and negative-case acceptance.
