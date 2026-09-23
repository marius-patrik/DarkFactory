import { type FC, type ReactNode, Component, type ErrorInfo, useMemo, createContext, useContext } from "react";
import { Router as WouterRouter, Route as WouterRoute, Link, useLocation, Switch } from "wouter";
import type { BaseLocationHook } from "wouter";
import { QuotaDashboardView, type QuotaDashboardState } from "./quota";
import { PlaceholderView } from "./views/PlaceholderView";
import { HomeView } from "./views/HomeView";
import { StatusView } from "./views/StatusView";
import { DocsView } from "./views/DocsView";
import { NotFoundView } from "./views/NotFoundView";

export interface RouterProps {
  basename?: string;
  hook?: BaseLocationHook;
  searchHook?: BaseLocationHook | (() => string);
  children?: ReactNode;
}

const isBaseLocationHook = (hook: unknown): hook is BaseLocationHook => {
  return typeof hook === "function";
};

export const Router: FC<RouterProps> = ({ basename, hook, searchHook, children }) => {
  if (hook && !isBaseLocationHook(hook)) {
    console.error("Invalid hook provided to Router; falling back to default router behavior.");
    return (
      <WouterRouter base={basename}>
        {children}
      </WouterRouter>
    );
  }
  return (
    <WouterRouter base={basename} hook={hook} searchHook={searchHook}>
      {children}
    </WouterRouter>
  );
};

export const useRouter = () => {
  const [location, setLocation] = useLocation();
  return {
    path: location,
    navigate: (to: string) => setLocation(to)
  };
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, {hasError: boolean}> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error("Uncaught error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

export interface RouteProps {
  path?: string;
  component?: FC<{ params: Record<string, string | undefined> }>;
  children?: ReactNode;
}

export const Route: FC<RouteProps> = ({ path, component: Component, children }) => {
  return (
    <WouterRoute path={path}>
      {(params) => (Component ? <Component params={params} /> : <>{children}</>)}
    </WouterRoute>
  );
};

const RequestsView: FC = () => (
  <PlaceholderView
    title="Requests, Epics & Planning"
    description="View and prioritize incoming requests and epics. Generate and review planning artifacts before implementation."
  />
);

const RecoveryView: FC = () => (
  <PlaceholderView
    title="Recovery & Workspace"
    description="Recover local working directory snapshots, manage dirty changes, and import task recovery provenance."
  />
);

const PrsView: FC = () => (
  <PlaceholderView
    title="Pull Requests & Stacks"
    description="Track pull requests, review feedback loops, stacked branches, and merge approvals across consumer repositories."
  />
);

const RunsView: FC = () => (
  <PlaceholderView
    title="Checks, Runs & Releases"
    description="Observe CI required check states, active execution stages, and locked lockstep version releases."
  />
);

const GraphView: FC = () => (
  <PlaceholderView
    title="Execution Flow Graph"
    description="Visualize the DarkFactory workflow DAG, active step logs, loop counters, and parallel fan-out nodes."
  />
);

const CapabilitiesView: FC = () => (
  <PlaceholderView
    title="Capabilities & Tools"
    description="Explore discovered first-party domain capabilities, active tool definitions, and MCP/Pi adapters."
  />
);

const ConfigView: FC = () => (
  <PlaceholderView
    title="Configuration (repo.df)"
    description="Inspect active runtime settings, allowed task sizes, data-collection models, and failover chains."
  />
);

const AuditView: FC = () => (
  <PlaceholderView
    title="Operator Audit Logs"
    description="Audit system behavior, sensitive prompt routing indicators, and learned provider/model failover penalities."
  />
);

export interface RouteConfig {
  path: string;
  component: FC<{ params: Record<string, string | undefined> }>;
  label: string;
}

export function validateRoutes(routes: RouteConfig[]): void {
  const seenPaths = new Set<string>();
  for (const route of routes) {
    if (!route.path.startsWith("/")) {
      throw new Error(`Route path must start with "/": ${route.path}`);
    }
    const normalizedPath = route.path.replace(/\/+$/, "") || "/";
    if (seenPaths.has(normalizedPath)) {
      throw new Error(`Route collision detected for path: ${route.path}`);
    }
    if (!route.component) {
      throw new Error(`Route component missing for path: ${route.path}`);
    }
    seenPaths.add(normalizedPath);
  }
}

const QuotaContext = createContext<QuotaDashboardState | undefined>(undefined);

const useQuota = () => {
  const context = useContext(QuotaContext);
  if (context === undefined) {
    throw new Error("useQuota must be used within a QuotaProvider");
  }
  return context;
};

const QuotaView: FC<{ params: Record<string, string | undefined> }> = () => {
  const quota = useQuota();
  return <QuotaDashboardView state={quota} />;
};

function defaultRoutes(): RouteConfig[] {
  const routes: RouteConfig[] = [
    { path: "/", component: HomeView, label: "Dashboard" },
    { path: "/status", component: StatusView, label: "System Status" },
    { path: "/quota", component: QuotaView, label: "Quota" },
    { path: "/docs", component: DocsView, label: "Documentation" },
    { path: "/requests", component: RequestsView, label: "Requests & Planning" },
    { path: "/recovery", component: RecoveryView, label: "Recovery" },
    { path: "/prs", component: PrsView, label: "PRs & Stacks" },
    { path: "/runs", component: RunsView, label: "Runs & Releases" },
    { path: "/graph", component: GraphView, label: "Execution Graph" },
    { path: "/capabilities", component: CapabilitiesView, label: "Capabilities" },
    { path: "/config", component: ConfigView, label: "Configuration" },
    { path: "/audit", component: AuditView, label: "Audit Logs" },
  ];
  return routes;
}

const RouteAnnouncer: FC = () => {
  const [location] = useLocation();
  return <div className="sr-only" aria-live="polite">{"Navigated to " + location}</div>;
};

export interface DarkFactoryShellProps {
  basename?: string;
  hook?: BaseLocationHook;
  searchHook?: BaseLocationHook | (() => string);
  routes?: RouteConfig[];
  /** Browser-safe quota data state. Defaults to disconnected for public/static builds. */
  quota?: QuotaDashboardState;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  children?: ReactNode;
}

const ShellLayout: FC<{ activeRoutes: RouteConfig[]; errorFallback?: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void; }> = ({ activeRoutes, errorFallback, onError }) => {
  const [location] = useLocation();
  return (
    <div className="darkfactory-shell">
      <header>
        <h1>DarkFactory Web</h1>
        <nav>
          {activeRoutes.map((route) => (
            <RouteLink key={route.path} to={route.path}>{route.label}</RouteLink>
          ))}
        </nav>
      </header>
      <main>
        <ErrorBoundary key={location} fallback={errorFallback} onError={onError}>
          <Switch>
            {activeRoutes.map((route) => (
              <Route key={route.path} path={route.path} component={route.component} />
            ))}
            <Route>
              <NotFoundView />
            </Route>
          </Switch>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export const DarkFactoryShell: FC<DarkFactoryShellProps> = ({
  basename,
  hook,
  searchHook,
  routes,
  quota = { status: "disconnected" },
  errorFallback,
  onError,
  children,
}) => {
  const activeRoutes = useMemo(() => {
    const r = routes ?? defaultRoutes();
    validateRoutes(r);
    return r;
  }, [routes]);

  return (
    <QuotaContext.Provider value={quota}>
      <Router basename={basename} hook={hook} searchHook={searchHook}>
        {children}
        <RouteAnnouncer />
        <ShellLayout activeRoutes={activeRoutes} errorFallback={errorFallback} onError={onError} />
      </Router>
    </QuotaContext.Provider>
  );
};

interface RouteLinkProps {
  to: string;
  children: ReactNode;
}

export const RouteLink: FC<RouteLinkProps> = ({ to, children }) => {
  return (
    <Link href={to} className="route-link">
      {children}
    </Link>
  );
};
