# Candidate, publishing and rollback

**Target:** `v1.0.0`, not an accepted public production release. [Master release plan #2070](https://github.com/marius-patrik/DarkFactory/issues/2070) controls progression.

## Candidate creation

Build exact frozen source using Bun, run invariant and failure-injection suites, test native Linux x64/arm64, macOS x64/arm64, Windows x64, Node/npm installation and non-root container, then validate a clean source-free extraction. Check package ABI, plugin adapters, fleet receipts, Web browser authentication and Docs navigation.

## Provenance

Record source SHA, immutable artifact digests, environment, build options, version, SBOM/license review, verification runs and independent reviewer. Verify checksums after downloading published artifacts; do not trust build-tree copies.

## Promotion gate

The final PR must be bot-authored and approved by an independent human for exact head; require all checks, candidate/fleet acceptance, merge under protected main and deliberate tagged release authorization. Do not auto-tag or auto-publish an ordinary main push. Do not deploy docs-only or placeholder Web from a candidate.

## Rollback

If an artifact, browser experience or consumer receipt differs from approved manifest, stop promotion and restore the last verified public artifact without rewriting immutable tags. Record the incident and reconcile consumer state safely.

**Owner:** #2707/#2708/#2709; successful documentation builds alone do not fulfill this release gate.

## Exact Pages candidate gate (not a release command)

`.github/workflows/deploy-docs.yml` accepts `candidate_sha`, `web_build_run_id` and explicit `promote`. The candidate job verifies the checked-out SHA and a successful run from the **specific** trusted `.github/workflows/build-web.yml` on the same repo/ref/commit, then composes a checksum-indexed unpublished site from that artifact and the validated documentation graph. That producing workflow does not yet exist at the inspected head; the secure behavior is to fail closed. A docs-only preview can never supply the required Web manifest.

For a live promotion, GitHub must be running this workflow on a `v<package.json.version>` tag whose commit is contained in protected main. Independent reviewer approval of the final PR and source-free release receipts are separate gates. The `github-pages` environment needs admin-configured **required external reviewers**, self-approval prevention where supported, and restricted deployment refs/tags, with recorded settings readback. Without those external controls, `promote: true` is **not authorized**, irrespective of workflow syntax. See [site packaging and handoff](../development/site-build.md).

## Rollback constraints

Do not move an immutable release tag backwards or publish source-tree docs as a recovery shortcut. Identify the last externally verified Pages artifact and its exact manifest digest, revoke further promotion, independently verify that archived artifact and obtain new protected environment authorization for a controlled redeployment. Reconfirm authentication, direct docs routes, search and visible version after rollback. Consumer update reversal is a separate version/receipt-driven decision owned by #2705/#2709, not automatically accomplished by restoring Pages.
