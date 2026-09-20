import React, { createContext, useContext, useEffect, type FC, type ReactNode } from "react";
import { Router as WouterRouter, Route as WouterRoute, Link, useLocation, useRouter as useWouter } from "wouter";

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
  component?: FC;
  children?: ReactNode;
}

export const Route: FC<RouteProps> = ({ path, component: Component, children }) => {
  if (path) {
    return (
      <WouterRoute path={path}>
        {(params) => (Component ? <Component /> : <>{children}</>)}
      </WouterRoute>
    );
  }
  return <WouterRoute>{(params) => (Component ? <Component /> : <>{children}</>)}</WouterRoute>;
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

export const DarkFactoryShell: FC = () => {
  return (
    <Router basename={typeof window !== "undefined" ? window.location.pathname.split("/").slice(0, -1).join("/") : ""}>
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
          <Route path="/" component={HomeView} />
          <Route path="/status" component={StatusView} />
          <Route path="/docs" component={DocsView} />
          <WouterRoute>
            <NotFoundView />
          </WouterRoute>
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
