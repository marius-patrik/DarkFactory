# Unified Web + Docs site contract

The operator application is the root route at the selected Pages base path. Generated documentation is under `docs/` relative to that base. This contract is implemented by the DF-04 packager without writing into `packages/web/`.

## Inputs

- The DF-03 frontend build output directory must contain `index.html`, a non-empty bundle and `darkfactory-web-manifest.json`.
- The manifest must declare `schemaVersion:1`, `entry:"index.html"`, exact normalized `basePath`, `routeMode` and every bundle file with its SHA-256. The frontend entry must contain a matching HTML `<base href="...">`.
- Docs compile from the combined `docs` block, CLI source and canonical guides, rules and accepted ADRs.

## Commands

`bun scripts/build-docs.ts --check` validates the headless content graph without a frontend. `bun scripts/build-docs.ts --docs-only --out site-docs-preview` creates an **unpublishable** docs-only preview. `bun scripts/build-docs.ts --web-dist packages/web/dist --base-path /DarkFactory/ --out site` is the **target** unified packaging call, but must fail with the currently delivered DF-03 format (see below). The current build is not a working integrated frontend.

## Output

`site/index.html` is the Web entry; `site/docs/index.html` is the docs landing; `site/docs/content.json` is the documentation graph; `site/.nojekyll` disables Jekyll processing; `site/404.html` is the GitHub Pages SPA fallback; `site/site-manifest.json` lists source SHA, candidate SemVer, Pages base path, generated docs count and per-file SHA-256 digests. The optional `404.html` history fallback returns an HTTP 404 response even if the SPA subsequently renders successfully.

## Routing limitation

GitHub Pages serves `404.html` for unknown history routes with HTTP **404**, not HTTP 200. An app can recover after load, but true 200 deep-link semantics require hash routing, a static route prerender or another host. The route strategy must be confirmed with DF-03 and checked in a live browser.

## Clean extraction verification

After packaging, create an archive containing the site directory, extract it into an empty folder and run `bun scripts/build-docs.ts --verify-artifact /path/to/extracted --base-path /DarkFactory/`. This command verifies manifest schema and source/version, exact file inventory, mandatory documentation routes, SHA-256 of each file and credential signatures without needing application source. In CI the `GITHUB_SHA` must match the manifest. Do not regard a successful staged-folder build as equivalent to clean-extraction verification.

## Publication

The deployment workflow must not auto-publish an incomplete candidate. Only explicitly promoted tagged artifacts after complete gate evidence may reach live Pages. See [release policy](../release/publishing.md).

## DF-03 source-level contract reconciliation (blocking)

At DF-03 source SHA `68aa2c952c74da593b66e26e9f64d83aba7fb8b3`, run `bun packages/web/scripts/build.ts packages/web/dist` in the source root. The output is `index.html`, `app.js`, `web-manifest.json` (version/size/digests) and `darkfactory-web.example.json`, with a path meta tag rather than a matching HTML `<base href>`. The DF-04 package verifier **does not** accept that input. No adapter or manifest transform is accepted yet. In particular, renaming `web-manifest.json` is not sufficient: it lacks source SHA, Pages base path, route mode and the required schema/asset inventory. #2703 must supply the complete interoperable format, or #2704 and #2703 must explicitly review a secure format adapter before integration.

**Required producing workflow:** `.github/workflows/build-web.yml`, with a successful source-bound workflow run exporting exactly one nonexpired artifact named `darkfactory-web-candidate`. The workflow identity (numeric ID looked up by its precise path), head repository, commit, ref and run conclusion are checked by `deploy-docs.yml`. This workflow does not exist at the inspected SHA and therefore promotion intentionally fails closed. Untrusted PR code must not receive publishing or privileged tokens.

**Expected DF-04 manifest:** `darkfactory-web-manifest.json` with `schemaVersion: 1`, `kind: "darkfactory-operator"`, `status: "candidate"`, `entry: "index.html"`, normalized `basePath`, `routeMode: "history" | "hash"`, the 40-hex `sourceSha` matching the checked-out candidate and a full, unique list of `{path,sha256}` for each regular bundle asset. No unknown file, symlink, hidden source map, credential-like file or extra documentation root may be smuggled in. An immutable asset must not include embedded user/App/provider secrets. Runtime public per-repository `darkfactory-web.json`, if adopted, must be explicitly generated/validated without weakening the asset inventory.

## Required browser integration

DF-03 must expose the Web operator at `/DarkFactory/` (or the configured Pages base), and a shared Docs surface at `/DarkFactory/docs/`. The static Docs renderer currently produces per-page files, grouped `content.json` navigation metadata and `search.json`; DF-03 must consume those published assets, render the **hierarchical** navigation and provide useful search, not a flat source-file list. The current Web source expects `docsContentUrl` in public runtime configuration, currently `./content.json`; the actual deployed graph is under `docs/content.json`. Resolve URL relativity for app root, Docs root and individual direct-entry routes.

Browser acceptance must be conducted against a clean extracted artifact (not synthetic HTML) and a real authenticated session. Check root navigation, `/docs/`, `/docs/guide-getting-started-installation/`, a generated CLI reference, search results and selection, refresh/back/forward, keyboard focus, responsive layout, valid and invalid auth, and both Pages project and root-host base paths. For history routing, an unknown path must be tested as an **HTTP 404**, with explicit UX expectation for the fallback. If requiring HTTP 200 on deep links, switch to a compatible routing strategy and verify it before release; do not claim a fallback 404 is a 200.

## Publication security gate

Site promotion takes `candidate_sha`, `web_build_run_id` and explicit `promote` inputs. Build must validate source SHA/manifest and preserve the signed-off artifact as an unpublished candidate. Promotion additionally requires exact `v<package.json.version>` tag, candidate commit contained in protected `main`, a trusted Web-producing run on the identical ref, extracted checksums and the `github-pages` environment gate.

**External configuration that code cannot establish:** a repository admin must configure required human reviewers, self-approval prevention where available, deployment branch/tag restrictions, protected immutable release tags, and appropriate restrictions on who may dispatch production workflows. Capture environment protection API/UI readback and a denied unauthorized promotion attempt. If any is absent, do not dispatch `promote: true`. No Pages deployment is authorized merely because the build succeeds.
