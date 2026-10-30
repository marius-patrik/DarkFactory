# Unified Web + Docs site contract

The operator application is the root route at the selected Pages base path. Generated documentation is under `docs/` relative to that base. This contract is implemented by the DF-04 packager without writing into `packages/web/`.

## Inputs

- The DF-03 frontend build output directory must contain `index.html`, a non-empty bundle and `darkfactory-web-manifest.json`.
- The manifest must declare `schemaVersion:1`, `entry:"index.html"`, exact normalized `basePath`, `routeMode` and every bundle file with its SHA-256. The frontend entry must contain a matching HTML `<base href="...">`.
- Docs compile from the combined `docs` block, CLI source and canonical guides, rules and accepted ADRs.

## Commands

`bun scripts/build-docs.ts --check` validates the headless content graph without a frontend. `bun scripts/build-docs.ts --docs-only --out site-docs-preview` creates an **unpublishable** docs-only preview. `bun scripts/build-docs.ts --web-dist dist/web --base-path /DarkFactory/ --out site` packages the validated unified artifact; dist/web generation is DF-03's responsibility.

## Output

`site/index.html` is the Web entry; `site/docs/index.html` is the docs landing; `site/docs/content.json` is the documentation graph; `site/.nojekyll` disables Jekyll processing; `site/404.html` is the GitHub Pages SPA fallback; `site/site-manifest.json` lists source SHA, candidate SemVer, Pages base path, generated docs count and per-file SHA-256 digests. The optional `404.html` history fallback returns an HTTP 404 response even if the SPA subsequently renders successfully.

## Routing limitation

GitHub Pages serves `404.html` for unknown history routes with HTTP **404**, not HTTP 200. An app can recover after load, but true 200 deep-link semantics require hash routing, a static route prerender or another host. The route strategy must be confirmed with DF-03 and checked in a live browser.

## Clean extraction verification

After packaging, create an archive containing the site directory, extract it into an empty folder and run `bun scripts/build-docs.ts --verify-artifact /path/to/extracted --base-path /DarkFactory/`. This command verifies manifest schema and source/version, exact file inventory, mandatory documentation routes, SHA-256 of each file and credential signatures without needing application source. In CI the `GITHUB_SHA` must match the manifest. Do not regard a successful staged-folder build as equivalent to clean-extraction verification.

## Publication

The deployment workflow must not auto-publish an incomplete candidate. Only explicitly promoted tagged artifacts after complete gate evidence may reach live Pages. See [release policy](../release/publishing.md).
