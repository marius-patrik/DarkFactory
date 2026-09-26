/** @packageDocumentation
 * Shared DarkFactory web rendering and operator-UI package boundary.
 *
 * Build-time documentation rendering is exposed from `@darkfactory/web/docs`. Browser code consumes only browser-safe
 * protocol/GitHub/auth contracts and never imports machine-secret keychain implementations.
 */
export type { RouteResult, TaskProfile } from "@darkfactory/protocol/model";
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
export { DarkFactoryShell, Route, type RouteConfig, RouteLink, Router, useRouter } from "./web-shell";
