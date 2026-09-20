import React, { createContext, useContext, useEffect, type FC, type ReactNode } from "react";
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
  component?: FC<{ params: Record<string, string> }>;
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

export interface DarkFactoryShellProps {
  basename?: string;
}

export const DarkFactoryShell: FC<DarkFactoryShellProps> = ({ basename }) => {
  return (
    <Router basename={basename}>
      <div className="darkfactory-shell" aria-live="polite">
        <header>
          <h1>DarkFactory Web</h1>
          <nav>
            <RouteLink to="/">Dashboard</RouteLink>
            <RouteLink to="/status">Status</RouteLink>
            <RouteLink to="/docs">Docs</RouteLink>
          </nav>
        </header>
        <main>
          <Switch>
            <Route path="/" component={HomeView} />
            <Route path="/status" component={StatusView} />
            <Route path="/docs" component={DocsView} />
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
