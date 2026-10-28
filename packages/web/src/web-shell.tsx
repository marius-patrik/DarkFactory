import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FC, type ReactNode } from "react";
import {
	type BaseLocationHook, Link, Switch, useLocation,
	Route as WouterRoute, Router as WouterRouter,
} from "wouter";
import {
	beginOperatorLogin, finishOperatorLogin, logoutOperator, operatorSession, resolveAuthority,
	type AuthState, type BrowserLoginConfig,
} from "./operator-auth.ts";
import { createGitHubOperatorSource, type OperatorReadSource } from "./operator-data.ts";
import { OperatorView, SURFACES } from "./operator-views.tsx";
import { type QuotaDashboardState } from "./quota.tsx";
import { operatorStyles } from "./web-style.ts";

interface RouterProps {
	basename?: string;
	/** Embedders/tests can provide their own wouter location source. Web defaults to Pages-safe hash routing. */
	hook?: BaseLocationHook;
	children: ReactNode;
}
function hashPath(): string {
	if (typeof window === "undefined") return "/";
	const raw = window.location.hash.replace(/^#/u, "");
	return raw.startsWith("/") ? raw : "/";
}
function subscribeHash(onChange: () => void): () => void {
	if (typeof window === "undefined") return () => undefined;
	window.addEventListener("hashchange", onChange);
	window.addEventListener("popstate", onChange);
	return () => {
		window.removeEventListener("hashchange", onChange);
		window.removeEventListener("popstate", onChange);
	};
}
/** GitHub Pages requires fragment routes; direct navigation never depends on server fallback. */
export function usePagesHashLocation(): [string, (path: string) => void] {
	const path = useSyncExternalStore(subscribeHash, hashPath, () => "/");
	const navigate = useCallback((to: string) => {
		if (typeof window !== "undefined") window.location.hash = `#${to.startsWith("/") ? to : "/"}${to.startsWith("/") ? "" : to}`;
	}, []);
	return [path, navigate];
}
export const Router: FC<RouterProps> = ({ basename, hook, children }) => (
	<WouterRouter base={basename} hook={hook ?? usePagesHashLocation}>{children}</WouterRouter>
);
export const useRouter = () => {
	const [location, setLocation] = useLocation();
	return { path: location, navigate: (to: string) => setLocation(to) };
};
interface RouteProps {
	path?: string;
	component?: FC<{ params: Record<string, string | undefined> }>;
	children?: ReactNode;
}
export const Route: FC<RouteProps> = ({ path, component: Component, children }) => (
	<WouterRoute path={path}>{(params) => Component ? <Component params={params} /> : <>{children}</>}</WouterRoute>
);
export interface RouteConfig {
	path: string;
	component: FC<{ params: Record<string, string | undefined> }>;
	label: string;
}
export interface DarkFactoryShellProps {
	basename?: string;
	routes?: RouteConfig[];
	hook?: BaseLocationHook;
	repository?: string;
	source?: OperatorReadSource;
	docsContentUrl?: string;
	auth?: BrowserLoginConfig;
	quota?: QuotaDashboardState;
}
const RouteAnnouncer: FC = () => {
	const [location] = useLocation();
	useEffect(() => {
		if (typeof document === "undefined") return;
		const title = document.getElementById("df-section-title");
		if (title instanceof HTMLElement) title.focus({ preventScroll: true });
	}, [location]);
	return <div className="sr-only" aria-live="polite" aria-atomic="true">Navigated to {location}</div>;
};
function NotFoundView() {
	return <section className="df-section"><h2>Page not found</h2>
		<p>This operator route does not exist.</p><RouteLink to="/">Return to overview</RouteLink></section>;
}
function AuthPanel({ config, repository, onState }: {
	config?: BrowserLoginConfig; repository?: string; onState: (auth: AuthState) => void;
}) {
	const [state, setState] = useState<AuthState>({ status: config ? "loading" : "unavailable" });
	const [actionError, setActionError] = useState("");
	useEffect(() => {
		let current = true;
		if (!config) {
			const next: AuthState = { status: "unavailable" };
			setState(next); onState(next); return;
		}
		async function hydrate() {
			try {
				const query = new URLSearchParams(window.location.search);
				let session: Awaited<ReturnType<typeof operatorSession>>;
				if (query.has("code") || query.has("state") || query.has("error")) {
					const url = new URL(window.location.href);
					url.searchParams.delete("code"); url.searchParams.delete("state");
					url.searchParams.delete("error"); url.searchParams.delete("error_description");
					window.history.replaceState({}, "", url.href);
					if (query.has("error")) throw new Error("GitHub authorization was denied.");
					session = await finishOperatorLogin(config!, query);
				} else {
					session = await operatorSession(config!);
				}
				if (!current) return;
				if (!session) {
					const next: AuthState = { status: "signed-out" };
					setState(next); onState(next); return;
				}
				if (!repository) throw new Error("Repository identity is required to resolve access.");
				const authority = await resolveAuthority(config!.broker, session, repository);
				if (!current) return;
				const next: AuthState = { status: "signed-in", session, authority, config };
				setState(next); onState(next);
			} catch (error) {
				if (!current) return;
				const next: AuthState = { status: "error", error: error instanceof Error ? error.message : "Authentication unavailable." };
				setState(next); onState(next);
			}
		}
		void hydrate();
		return () => { current = false; };
	}, [config, repository, onState]);
	async function login() {
		if (!config) return;
		setActionError("");
		try { window.location.assign(await beginOperatorLogin(config)); }
		catch (error) { setActionError(error instanceof Error ? error.message : "Unable to initiate authorization."); }
	}
	async function logout() {
		if (!config || !state.session) return;
		const prior = state.session;
		const next: AuthState = { status: "signed-out" };
		setState(next); onState(next);
		try { await logoutOperator(config, prior); }
		catch { setActionError("Signed out locally; server revocation could not be confirmed. Verify broker availability."); }
	}
	if (state.status === "unavailable") return <span className="df-auth-status" title="Confidential user-authentication broker is not connected">Public · read-only</span>;
	if (state.status === "loading") return <span role="status">Checking session…</span>;
	if (state.status === "signed-in") return <div className="df-auth">
		<span>{state.authority?.userId ?? state.session?.userId} · {state.authority?.canMutate ? "authorized writes" : "read-only"}</span>
		<button type="button" onClick={() => void logout()}>Sign out</button>
		{actionError ? <span role="alert">{actionError}</span> : null}
	</div>;
	return <div className="df-auth">
		{state.status === "error" ? <span role="alert">{state.error}</span> : null}
		<button type="button" onClick={() => void login()}>Sign in with GitHub</button>
		{actionError ? <span role="alert">{actionError}</span> : null}
	</div>;
}
function SurfaceRoutes({ source, repository, auth, quota, routes }: {
	source?: OperatorReadSource; repository?: string; auth?: AuthState; quota: QuotaDashboardState; routes?: RouteConfig[];
}) {
	const defaults = SURFACES.map((entry) => ({
		path: entry.path, label: entry.label,
		component: () => <OperatorView
			resource={entry.resource} title={entry.label}
			description={surfaceDescription(entry.resource)}
			source={source} repository={repository} auth={auth} quota={quota}
		/>,
	}));
	const activeRoutes = routes ?? defaults;
	return <>
		<aside className="df-side" aria-label="Primary navigation">
			<div className="df-side-brand"><span className="df-brand-icon" aria-hidden="true">DF</span>
				<span>DarkFactory<small>Operator console</small></span></div>
			<nav aria-label="Operator">
				{routes ? activeRoutes.map((route) =>
					<RouteLink key={route.path} to={route.path}>{route.label}</RouteLink>) :
					[...new Set(SURFACES.map((surface) => surface.group))].map((group) =>
						<div className="df-nav-group" key={group}>
							<p className="df-nav-group-label">{group}</p>
							{SURFACES.filter((surface) => surface.group === group).map((surface) =>
								<RouteLink key={surface.path} to={surface.path}>{surface.label}</RouteLink>)}
						</div>)}
			</nav>
		</aside>
		<main className="df-main" id="df-main" tabIndex={-1}>
			<Switch>
				{!routes ? <Route path="/docs/:id" component={({ params }) => <OperatorView
					resource="docs" title="Documentation" description="Compiled repository documentation."
					source={source} repository={repository} docsPage={params.id}
				/>} /> : null}
				{activeRoutes.map((route) => <Route key={route.path} path={route.path} component={route.component} />)}
				<Route component={() => <NotFoundView />} />
			</Switch>
		</main>
	</>;
}
function surfaceDescription(resource: string): string {
	switch (resource) {
		case "repository": return "Authoritative repository identity, branch and visible GitHub metadata.";
		case "requests": return "Recently updated issues labeled Request; open a record to inspect its full planning context.";
		case "planning": return "Planning discovery from issue labels; final artifacts and fingerprints require governed runtime.";
		case "approvals": return "Human review and approval queue. No approval is inferred from a label.";
		case "epics": return "Candidate parent issues and references; explicit dependency edges require authoritative graph binding.";
		case "pulls": return "Pull request branches, relationships, review status and delivery activity.";
		case "checks": return "Observed GitHub workflow conclusions; required checks need protected-branch policy resolution.";
		case "runs": return "Latest GitHub Actions runs, their conclusion and source branches.";
		case "recovery": return "GitHub issues tagged as blocked or requiring recovery; local checkpoints are not synthesized.";
		case "projects": return "GitHub Projects v2 reads and updates require human/App authorized GraphQL.";
		case "quota": return "Redacted live provider, account and model availability.";
		case "capabilities": return "Official and installed capability metadata from verified repository evidence.";
		case "configuration": return "Live read-only canonical repository configuration file.";
		case "releases": return "Observed GitHub Releases and immutable asset metadata.";
		case "audit": return "GitHub issue events; not a substitute for the governed execution journal.";
		default: return "Repository-authored documentation from the canonical content compiler.";
	}
}
export const DarkFactoryShell: FC<DarkFactoryShellProps> = ({
	basename, routes, hook, repository, source, docsContentUrl, auth, quota = { status: "disconnected" },
}) => {
	const [authState, setAuthState] = useState<AuthState>({ status: auth ? "loading" : "unavailable" });
	const liveSource = useMemo(() => {
		if (source || !repository) return source;
		const authenticated = authState.status === "signed-in" && authState.session &&
			authState.authority?.canRead && auth?.broker.read;
		return createGitHubOperatorSource(repository, {
			...(docsContentUrl ? { docsContentUrl } : {}),
			...(authenticated ? { readThroughBroker: (path: string, signal?: AbortSignal) =>
				auth.broker.read!(authState.session!.id, repository, path, signal) } : {}),
		});
	}, [source, repository, docsContentUrl, auth, authState]);
	return <Router basename={basename} hook={hook}>
		<style>{operatorStyles}</style>
		<a className="df-skip" href="#df-main" onClick={(event) => {
			event.preventDefault(); document.getElementById("df-main")?.focus();
		}}>Skip to main content</a>
		<RouteAnnouncer />
		<div className="darkfactory-shell">
			<header className="df-top">
				<div className="df-breadcrumb">{repository ? <span>{repository}</span> : <span>Repository not configured</span>}</div>
				<AuthPanel config={auth} repository={repository} onState={setAuthState} />
			</header>
			<SurfaceRoutes routes={routes} source={liveSource} repository={repository} auth={authState} quota={quota} />
		</div>
	</Router>;
};
interface RouteLinkProps { to: string; children: ReactNode }
export const RouteLink: FC<RouteLinkProps> = ({ to, children }) => {
	const [location] = useLocation();
	return <Link href={to} className={location === to ? "route-link is-active" : "route-link"}
		aria-current={location === to ? "page" : undefined}>{children}</Link>;
};
