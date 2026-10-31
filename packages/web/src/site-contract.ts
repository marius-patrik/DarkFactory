/** Contract shared by the operator entry and the unified GitHub Pages packager. */
export interface WebSiteRuntimeConfig {
	version: 1;
	repository: string;
	docsContentUrl: string;
	/** Public OAuth metadata, with the confidential service reached only over HTTPS. */
	auth?: { clientId: string; scope: string; redirectUri: string; brokerUrl: string };
}
export interface WebAsset {
	path: string;
	sha256: string;
}
export interface WebBundleManifest {
	schemaVersion: 1;
	kind: "darkfactory-operator";
	status: "candidate";
	entry: "index.html";
	basePath: string;
	routeMode: "hash";
	sourceSha: string;
	assets: WebAsset[];
}
/** Exactly the grammar accepted by packages/docs/src/site.ts. */
export function normalizeSiteBasePath(input: string): string {
	const path = input.endsWith("/") ? input : `${input}/`;
	if (
		!/^\/(?:[A-Za-z0-9._~-]+\/)*$/u.test(path) ||
		path.includes("//") ||
		path.split("/").some((part) => part === "." || part === "..")
	)
		throw new Error("Invalid Pages base path");
	return path;
}
/** The hash holds operator deep links. The pathname selects real static documentation. */
export function operatorPathFromLocation(pathname: string, basePath: string): string {
	const base = normalizeSiteBasePath(basePath);
	if (!pathname.startsWith(base)) return "/";
	const path = pathname.slice(base.length).replace(/\/(?:index\.html)?$/u, "");
	if (!path) return "/";
	return path === "docs" || path.startsWith("docs/") ? `/${path}` : "/";
}
export function operatorStaticRoutes(ids: readonly string[]): readonly string[] {
	const routes = new Set<string>(["index.html", "docs/index.html"]);
	for (const id of ids) {
		if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(id)) throw new Error("Unsafe documentation route");
		if (id !== "home") routes.add(`docs/${id}/index.html`);
	}
	return [...routes].sort();
}
export function repositoryIdentity(slug: string): { owner: string; name: string; slug: string } {
	if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]+$/u.test(slug) || slug.includes("..") || slug.endsWith("."))
		throw new Error("Invalid repository identity");
	const [owner = "", name = ""] = slug.split("/");
	return { owner, name, slug };
}
export function validateWebConfig(value: unknown): WebSiteRuntimeConfig {
	if (!value || typeof value !== "object") throw new Error("Missing public Web configuration");
	const v = value as Record<string, unknown>;
	if (v.version !== 1 || typeof v.repository !== "string" || typeof v.docsContentUrl !== "string")
		throw new Error("Invalid public Web configuration");
	repositoryIdentity(v.repository);
	if (!/^(?:\.\/)?docs\/content\.json$/u.test(v.docsContentUrl))
		throw new Error("Documentation content must resolve inside the site");
	if (v.auth !== undefined) {
		if (!v.auth || typeof v.auth !== "object") throw new Error("Invalid public OAuth metadata");
		const a = v.auth as Record<string, unknown>;
		if (
			typeof a.clientId !== "string" ||
			!a.clientId ||
			typeof a.scope !== "string" ||
			typeof a.redirectUri !== "string" ||
			typeof a.brokerUrl !== "string" ||
			!/^https:\/\/[^/]+/u.test(a.brokerUrl) ||
			!/^https:\/\//u.test(a.redirectUri)
		)
			throw new Error("Invalid public OAuth metadata");
		return {
			version: 1,
			repository: v.repository,
			docsContentUrl: v.docsContentUrl,
			auth: { clientId: a.clientId, scope: a.scope, redirectUri: a.redirectUri, brokerUrl: a.brokerUrl },
		};
	}
	return { version: 1, repository: v.repository, docsContentUrl: v.docsContentUrl };
}
