# GitHub administration

**Configuration authority:** the `repo.app`, `repo.board` and `repo.protection` blocks in [repo.dfconfig](../../../repo.dfconfig).

## Installation

Register/install the intended GitHub App with required repository permissions on an explicitly approved repository. Keep the App's private key exclusively in runtime/Actions secrets. Public App ID and client ID are identifiers, not credentials. Do not place a private key in public Pages or in static JavaScript.

Configure browser GitHub App authorization through the server-side broker and verify user-identity readback. Browser authorization must not be conflated with automation identity.

## Projects v2

Projects v2 access depends on the actual owner and permission scopes; some user-owned Projects cannot be managed through the App installation token. Do not assume that `repo.board` titles or an installation permission imply successful project read/write. Verify stable IDs, scope and field readback under #2488.

## Branch protection

Apply declared protected-lane required checks and approvals only after reading target current state. Required checks must be real, bound to exact head, and cannot be waived by an untrusted PR workflow. Merge requires a fresh independent human authorization.

## Audit

Preserve the Request-to-PR chain, run/effect identities, check conclusion and resulting remote SHAs. Never log tokens or sensitive payloads. Security/API end-to-end validation remains owned by #2699 and #2700.

## Permission and identity verification

The producer's `repo.app.permissions.repository` currently declares Actions, Checks, Contents, Issues, Pull requests and Workflows **write** plus Metadata **read**. Provision only the permissions required by the reviewed consumer workflow; this producer declaration is not universal permission guidance. The private key is read from the named secret `DARKFACTORY_APP_PRIVATE_KEY`; its existence/value cannot be established by this documentation. The user-scoped Projects token is a separate secret `GH_PROJECT_TOKEN` because App installation credentials cannot be assumed to administer user-owned Projects v2.

An administrator should inspect **GitHub Settings → Developer settings → GitHub Apps** for the actual App definition and installation, then verify the target repository appears in the App's approved installation scope. For browser access, check the OAuth broker is an authorized HTTPS server, its redirect URI matches the registered client, its session/cookie policy is enforced and a denied/expired user actually receives a denial. A public client ID is not proof of a functioning broker.

## Projects and protected merge verification

For Projects v2, inspect the exact owner and Project ID, user/token scope, field IDs and readback after each authorized edit. Title matches are not stable identifiers. If the actor lacks `project`/Projects scope or the board cannot be found, do not silently create an identically named board.

The producer's `repo.protection.lanes` declares `main` with required checks `quality`, `verify-bound-issue`, and `candidate`, one review and resolved conversations. Compare live GitHub branch rules to these declarations before any merge. **Declared** protection is not proof GitHub accepted those settings. A bot-authored PR and independent human approval must be verified at the exact PR head; source PR approval code alone is not a receipt.
