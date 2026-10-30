# Fleet scope and installation policy

App installation access is not authorization to modify every accessible repository. `repo.app.sweep.repositories` in the producer's [repo.dfconfig](../../../repo.dfconfig) is the explicit allowlist; at the integration base it is empty. Consumer eligibility requires an approved stable repository identity and observed permissions.

## Before an update

1. Inventory repository ID, current installed version and exact release artifact digest.
2. Exclude archived, inaccessible, renamed, retired or unapproved projects according to recorded policy.
3. Confirm branch protections and current consumer-owned configuration.
4. Propose non-destructive changes through appropriately reviewed PRs.
5. Verify installed receipt, release digest, consumer tests and Projects permission readback.

## Safety

Do not infer a fleet from `GET /installation/repositories` alone. Do not rewrite consumer-owned files to match the producer's ID or app configuration. A failed or unreachable repository remains reported, not silently skipped.

**Status:** installer and fleet candidate acceptance are gated by #2705 and #2709. This guide is a decision procedure, not a claim that an all-fleet update has run.
