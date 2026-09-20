import type { FC, ReactNode } from "react";
import { Router as WouterRouter, Route as WouterRoute, Link, useLocation, Switch } from "wouter";

export interface RouterProps {
  basename?: string;
  children: ReactNode;
}

export const Router: FC<RouterProps> = ({ basename, children }) => {
  return (
    <WouterRouter base={basename}>
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

const HomeView: FC = () => (
  <div>
    <h2>Dashboard</h2>
    <p>DarkFactory operator UI and runtime shell.</p>
  </div>
);

const StatusView: FC = () => (
  <div>
    <h2>System Status</h2>
    <p>Capability tiers, routing policy, and quota health.</p>
  </div>
);

const DocsView: FC = () => (
  <div>
    <h2>Documentation</h2>
    <p>Architecture, ADRs, and pipeline operations guide.</p>
  </div>
);

const NotFoundView: FC = () => (
  <div>
    <h2>404 Not Found</h2>
    <p>The requested page does not exist.</p>
  </div>
);

export interface RouteConfig {
  path: string;
  component: FC<{ params: Record<string, string | undefined> }>;
  label: string;
}

const DefaultRoutes: RouteConfig[] = [
  { path: "/", component: HomeView, label: "Dashboard" },
  { path: "/status", component: StatusView, label: "System Status" },
  { path: "/docs", component: DocsView, label: "Documentation" },
];

const RouteAnnouncer: FC = () => {
  const [location] = useLocation();
  return <div className="sr-only" aria-live="polite">{`Navigated to ${location}`}</div>;
};

export interface DarkFactoryShellProps {
  basename?: string;
  routes?: RouteConfig[];
}

export const DarkFactoryShell: FC<DarkFactoryShellProps> = ({ basename, routes = DefaultRoutes }) => {
  return (
    <Router basename={basename}>
      <RouteAnnouncer />
      <div className="darkfactory-shell">
        <header>
          <h1>DarkFactory Web</h1>
          <nav>
            {routes.map((route) => (
              <RouteLink key={route.path} to={route.path}>{route.label}</RouteLink>
            ))}
          </nav>
        </header>
        <main>
          <Switch>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} component={route.component} />
            ))}
            <Route>
              <NotFoundView />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
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
