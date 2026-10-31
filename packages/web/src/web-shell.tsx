import {
	createContext,
	type FC,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";
import type { BaseLocationHook } from "wouter";
import {
	type AuthState,
	beginOperatorLogin,
	createHttpOperatorBroker,
	finishOperatorLogin,
	logoutOperator,
	type OperatorBroker,
	operatorSession,
	resolveAuthority,
} from "./operator-auth.ts";
import {
	createGitHubOperatorSource,
	type OperatorReadSource,
	type OperatorResourceData,
	type ResourceState,
} from "./operator-data.ts";
import { OperatorView, SURFACES } from "./operator-views.tsx";
import type { QuotaDashboardState } from "./quota.tsx";
import { normalizeSiteBasePath, operatorPathFromLocation, type WebSiteRuntimeConfig } from "./site-contract.ts";
import { operatorStyles } from "./web-style.ts";

interface RouterProps {
	basename?: string;
	hook?: BaseLocationHook;
	children: ReactNode;
}
interface RouterContextValue {
	path: string;
	navigate: (path: string) => void;
	basename: string;
}
const Context = createContext<RouterContextValue>({ path: "/", navigate: () => undefined, basename: "/" });
function subscribeHash(listener: () => void): () => void {
	if (typeof window === "undefined") return () => undefined;
	window.addEventListener("hashchange", listener);
	window.addEventListener("popstate", listener);
	return () => {
		window.removeEventListener("hashchange", listener);
		window.removeEventListener("popstate", listener);
	};
}
function currentHashPath(): string {
	if (typeof window === "undefined") return "/";
	const hash = decodeURI(window.location.hash.replace(/^#/u, ""));
	if (hash.startsWith("/") && !hash.startsWith("//")) return hash.replace(/\/+$/u, "") || "/";
	const base = document.querySelector<HTMLMetaElement>('meta[name="darkfactory-base-path"]')?.content ?? "/";
	return operatorPathFromLocation(window.location.pathname, base);
}
function useHashLocation(): [string, (path: string) => void] {
	const path = useSyncExternalStore(subscribeHash, currentHashPath, () => "/");
	const navigate = (next: string) => {
		if (typeof window !== "undefined") window.location.hash = next;
	};
	return [path, navigate];
}
/** Dependency-free view routing; the URL hash is the only operator route state on Pages. */
export const Router: FC<RouterProps> = ({ basename = "/", hook, children }) => {
	const useLocationHook = hook ?? useHashLocation;
	const [path, navigate] = useLocationHook();
	return (
		<Context.Provider value={{ path, navigate, basename: normalizeSiteBasePath(basename) }}>
			{children}
		</Context.Provider>
	);
};
export function useRouter(): RouterContextValue {
	return useContext(Context);
}
export const Route: FC<{ path: string; children: ReactNode }> = ({ path, children }) =>
	useRouter().path === path ? <>{children}</> : null;
export interface RouteConfig {
	path: string;
	label: string;
}
export const RouteLink: FC<{ to: string; children: ReactNode; className?: string }> = ({ to, children, className }) => {
	const router = useRouter();
	const active = router.path === to;
	return (
		<a
			className={[className ?? "route-link", active ? "is-active" : ""].filter(Boolean).join(" ")}
			href={`${router.basename}#${to}`}
			aria-current={active ? "page" : undefined}
			onClick={(event) => {
				if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				event.preventDefault();
				router.navigate(to);
			}}
		>
			{children}
		</a>
	);
};
export interface DarkFactoryShellProps {
	repository?: string;
	hook?: BaseLocationHook;
	config?: WebSiteRuntimeConfig;
	source?: OperatorReadSource;
	quotaState?: QuotaDashboardState;
}
const Body: FC<Omit<DarkFactoryShellProps, "hook">> = ({
	repository = "marius-patrik/DarkFactory",
	config,
	source,
	quotaState,
}) => {
	const { path, basename } = useRouter();
	const page = SURFACES.find((surface) => surface.id === path);
	const reader = useMemo(() => source ?? createGitHubOperatorSource(repository), [repository, source]);
	const [refresh, setRefresh] = useState(0);
	const [resource, setResource] = useState<ResourceState<OperatorResourceData>>({ status: "idle" });
	const [auth, setAuth] = useState<AuthState>({ status: "signed-out" });
	const [authBusy, setAuthBusy] = useState(false);
	const broker: OperatorBroker | undefined = useMemo(
		() => (config?.auth ? createHttpOperatorBroker(config.auth) : undefined),
		[config?.auth],
	);
	useEffect(() => {
		const controller = new AbortController();
		void refresh; // A changed refresh counter deliberately reruns the GitHub request.
		setResource({ status: "loading" });
		if (page?.resource && page.resource !== "quota") {
			void reader.read(page.resource, controller.signal).then(
				(result) => {
					if (!controller.signal.aborted) setResource(result);
				},
				() => {
					if (!controller.signal.aborted) setResource({ status: "failed", detail: "GitHub read was interrupted" });
				},
			);
		}
		return () => controller.abort();
	}, [reader, page?.resource, refresh]);
	useEffect(() => {
		if (!broker) {
			setAuth({ status: "signed-out" });
			return;
		}
		let cancelled = false;
		setAuth({ status: "checking" });
		const callback = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).has("code");
		const action =
			callback && typeof window !== "undefined"
				? finishOperatorLogin(broker, window.location.search)
				: operatorSession(broker);
		void action
			.then(async (session) => {
				if (!session) {
					if (!cancelled) setAuth({ status: "signed-out" });
					return;
				}
				const authority = await resolveAuthority(broker, session, repository);
				if (!cancelled) setAuth({ status: "authenticated", session, authority });
			})
			.catch(() => {
				if (!cancelled) setAuth({ status: "denied", detail: "Sign-in or authority verification failed" });
			});
		return () => {
			cancelled = true;
		};
	}, [broker, repository]);
	const signIn = async () => {
		if (!config?.auth || !broker) return;
		setAuthBusy(true);
		try {
			await beginOperatorLogin(config.auth);
		} catch {
			setAuth({ status: "denied", detail: "Authorization redirect could not be started" });
		} finally {
			setAuthBusy(false);
		}
	};
	const signOut = async () => {
		if (!broker || auth.status !== "authenticated") return;
		setAuthBusy(true);
		try {
			await logoutOperator(broker, auth.session);
			setAuth({ status: "signed-out" });
		} catch {
			setAuth({ status: "denied", detail: "Signed out locally; remote session revocation was not confirmed" });
		} finally {
			setAuthBusy(false);
		}
	};
	return (
		<div className="darkfactory-shell">
			<a href="#df-main" className="df-skip">
				Skip to main content
			</a>
			<aside className="df-side" aria-label="Primary navigation">
				<div className="df-side-brand">
					<span className="df-brand-icon" aria-hidden="true">
						DF
					</span>
					<span>
						DarkFactory<small>GitHub operator</small>
					</span>
				</div>
				<nav aria-label="Operator sections">
					{(["Workspace", "Delivery", "System"] as const).map((group) => (
						<div key={group} className="df-nav-group">
							<p className="df-nav-group-label">{group}</p>
							{SURFACES.filter((surface) => surface.group === group).map((surface) => (
								<RouteLink key={surface.id} to={surface.id}>
									{surface.title}
								</RouteLink>
							))}
						</div>
					))}
					<div className="df-nav-group">
						<p className="df-nav-group-label">Reference</p>
						<a className="route-link" href={`${basename}docs/`}>
							Documentation ↗
						</a>
					</div>
				</nav>
			</aside>
			<header className="df-top">
				<span className="df-breadcrumb">
					{repository} / {page?.title ?? "Not found"}
				</span>
				<div className="df-auth">
					{!broker ? (
						<span className="df-auth-status">Public read-only · no confidential broker configured</span>
					) : auth.status === "authenticated" ? (
						<>
							<span className="df-auth-status">
								{auth.authority.userId} · {auth.authority.canMutate ? "Authorized" : "Read-only/denied"}
							</span>
							<button type="button" disabled={authBusy} onClick={() => void signOut()}>
								Sign out
							</button>
						</>
					) : (
						<>
							<span className="df-auth-status">{auth.status === "denied" ? auth.detail : "Not signed in"}</span>
							<button type="button" disabled={authBusy || auth.status === "checking"} onClick={() => void signIn()}>
								Sign in with GitHub
							</button>
						</>
					)}
				</div>
			</header>
			<main id="df-main" className="df-main" tabIndex={-1}>
				{page ? (
					<OperatorView
						key={page.id}
						surface={page}
						repository={repository}
						state={resource}
						quotaState={quotaState}
						onRefresh={() => setRefresh((counter) => counter + 1)}
					/>
				) : (
					<section role="alert" className="df-section">
						<h2>Page not found</h2>
						<p>The requested operator route is not part of this release candidate.</p>
						<RouteLink to="/">Return to overview</RouteLink>
					</section>
				)}
				{auth.status === "authenticated" && auth.authority.canMutate ? (
					<p className="df-caveat">
						Authenticated GitHub authority is visible, but privileged actions remain disabled until the confidential
						mutation contract and readback have been deployed and independently verified.
					</p>
				) : null}
			</main>
		</div>
	);
};
/** React operator entry. Does not import machine credentials or provide false mutation success. */
export const DarkFactoryShell: FC<DarkFactoryShellProps> = ({ hook, config, repository, source, quotaState }) => {
	const basename =
		typeof document !== "undefined"
			? (document.querySelector<HTMLBaseElement>("base")?.getAttribute("href") ?? "/")
			: "/";
	return (
		<Router hook={hook} basename={basename}>
			<style>{operatorStyles}</style>
			<Body repository={repository ?? config?.repository} config={config} source={source} quotaState={quotaState} />
		</Router>
	);
};
