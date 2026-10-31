# DF-07 → DF-04: unified Web / Docs contract

The operator Web and the static documentation are **one packaged Pages site**. Frontend entry is the root `index.html`; documentation is independently rendered by the existing headless docs compiler at `docs/` (including `docs/content.json` and `docs/search.json`). Do not deploy a second Docs home at root.

Build from the *exact checkout*:

```sh
DF_WEB_BASE_PATH=/DarkFactory/ DF_WEB_REPOSITORY=marius-patrik/DarkFactory bun packages/web/scripts/build.ts packages/web/dist
bun scripts/build-docs.ts --web-dist packages/web/dist --base-path /DarkFactory/ --out site
```

The Web build emits **one** `darkfactory-web-manifest.json`, matching `packages/docs/src/site.ts::WebBundleManifest` exactly: `schemaVersion:1`, `kind:"darkfactory-operator"`, `status:"candidate"`, `entry:"index.html"`, normalized `basePath`, `routeMode:"hash"`, Git HEAD `sourceSha`, and sorted `assets:[{path,sha256}]` covering *every* generated regular file except the manifest. The `index.html` <base> equals the declared path. DF-04 verifies SHA-256 and includes these bytes, adding `docs/**` and final `site-manifest.json`. There is no `web-manifest.json`.

The Web build supplies **public** `darkfactory-web.json`, containing `version:1`, `repository` and `docsContentUrl:"./docs/content.json"`. Optional `auth` is public metadata: `clientId`, `scope`, `redirectUri`, and HTTPS `brokerUrl`. The confidential broker (not Pages) owns tokens, GitHub App credentials, authority and mutations. When broker metadata is absent the UI remains read-only and fails closed. Environment variables are `DF_WEB_CLIENT_ID`, `DF_WEB_SCOPE`, `DF_WEB_REDIRECT_URI`, `DF_WEB_BROKER_URL`. No secret env vars are accepted by the Web builder.

Operator navigation uses `#/<route>` so Pages hard refresh always serves the root; docs pages use physical `docs/<page>/index.html` and normal links (not SPA rewrites). Root-hosted sites use `DF_WEB_BASE_PATH=/`. Each site gets its own *public config and manifest*, while the compiled `app.js` is the same application bundle. Cross-repository byte-identical full bundles require moving the per-site runtime config into DF-04 packaging, an ownership change requiring an approved DF-04 patch.

**Verification requirements:** Run the exact Bun and docs build/test commands, confirm the final GitHub tree has no truncated files, inspect all manifest hashes and verify root/docs/static/hash routes under `/DarkFactory/` and `/`. Do not claim authenticated mutation acceptance until a real authorized broker and GitHub readback are available.
