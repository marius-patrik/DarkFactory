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
