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
