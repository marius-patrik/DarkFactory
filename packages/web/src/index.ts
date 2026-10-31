/** @packageDocumentation
 * Shared DarkFactory web rendering and operator-UI package boundary.
 *
 * Build-time documentation rendering is exposed from `@darkfactory/web/docs`. Browser code consumes only browser-safe
 * protocol/GitHub/auth contracts and never imports machine-secret keychain implementations.
 */
export type { RouteResult, TaskProfile } from "../../protocol/src/model.ts";
export type { AuthState, BrowserLoginConfig, OperatorBroker } from "./operator-auth.ts";
export { createHttpOperatorBroker, postVerifiedIssueComment } from "./operator-auth.ts";

export type {
	OperatorItem,
	OperatorReadSource,
	OperatorResource,
	OperatorResourceData,
	ResourceState,
} from "./operator-data.ts";
export { classifyReadFailure, createGitHubOperatorSource, repositoryIdentity } from "./operator-data.ts";
export { OperatorView, SURFACES } from "./operator-views.tsx";
export {
	type QuotaAccountView,
	type QuotaDashboardState,
	QuotaDashboardView,
	type QuotaLimitView,
	type QuotaModelView,
	type QuotaProviderView,
	quotaDashboardModels,
	quotaDashboardProviders,
} from "./quota";
export type { WebSiteRuntimeConfig } from "./site-contract.ts";

export { normalizeSiteBasePath, operatorPathFromLocation, operatorStaticRoutes } from "./site-contract.ts";
export { DarkFactoryShell, Route, type RouteConfig, RouteLink, Router, useRouter } from "./web-shell";
