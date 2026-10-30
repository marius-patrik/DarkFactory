/** Immutable frontend packaging interface for the DF-04 release/site builder. */
export interface WebSiteRuntimeConfig {
	version: 1;
	repository: string;
	/** Page-local URL of the headless documentation content graph. */
	docsContentUrl: string;
	/** Public OAuth metadata only; no secret values. */
	auth?: { clientId: string; scope: string; redirectUri: string; brokerUrl: string };
}
/** Normalize a GitHub Pages project path, preserving / for root deployments. */
export function normalizeSiteBasePath(value: string): string {
	if (
		!value.startsWith("/") ||
		value.includes("..") ||
		value.includes("?") ||
		value.includes("#") ||
		value.includes("\\")
	)
		throw new Error("Invalid Pages base path");
	const clean = value.replace(/\/+/gu, "/").replace(/\/$/u, "");
	return clean ? `${clean}/` : "/";
}
export function operatorPathFromLocation(pathname: string, basePath: string): string {
	const base = normalizeSiteBasePath(basePath);
	if (!pathname.startsWith(base)) return "/";
	const suffix = pathname.slice(base.length).replace(/\/(?:index\.html)?$/u, "");
	return suffix === "docs" || suffix.startsWith("docs/") ? `/${suffix}` : "/";
}
/** Static host route files are app-entry wrappers, not a second docs renderer. */
export function operatorStaticRoutes(ids: readonly string[]): readonly string[] {
	const routes = new Set<string>(["index.html", "docs/index.html"]);
	for (const id of ids) {
		if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(id)) throw new Error("Unsafe documentation¶»§q«^