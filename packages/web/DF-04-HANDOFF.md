# DF-03 â†’ DF-04: Unified operator + documentation site

**Status:** Build contract available; end-to-end deployed acceptance outstanding.

## Immutable frontend

Build from the DarkFactory repository root:

```sh
bun packages/web/scripts/build.ts packages/web/dist
```

Outputs: `packages/web/dist/index.html`, `app.js`, `web-manifest.json` and `darkfactory-web.example.json`. `web-manifest.json` lists the SHA-256 and byte size of each generated file. The builder deliberately does not emit a live configuration file. Build once, then copy these identical bytes into all eligible consumer sites; verify manifest hashes before packaging.

`index.html` is the public app entrypoint and MUST replace the docs-only root entry. The workflow owner must not invoke `renderDocsSite` as the deployed root renderer. The root page embeds a public `meta[name="darkfactory-base-path"]` describing the deployment prefix (`/DarkFactory/` on producer project Pages, `/` on a root site). The current frontend reads the public configuration relative to `app.js`, so the same distribution can work at arbitrary Pages prefixes.

## Deployment-specific public files

DF-04 produces a **public** `darkfactory-web.json` next to `app.js`:

```json
{"version":1,"repository":"marius-patrik/DarkFactory","docsContentUrl":"./content.json"}
```

Optional `auth`: `{ "clientId", "scope", "redirectUri", "brokerUrl" }`. These values are public metadata and the HTTPS confidential broker URL. No GitHub App private key, GitHub O¶»§q«^