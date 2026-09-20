import React, { createContext, useContext, useState, useEffect, type FC, type ReactNode } from "react";

interface RouterContextType {
  path: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  path: "/",
  navigate: () => {},
});

export const useRouter = () => useContext(RouterContext);

export interface RouterProps {
  initialPath?: string;
  children: ReactNode;
}

export const Router: FC<RouterProps> = ({ initialPath, children }) => {
  const [path, setPath] = useState<string>(
    initialPath ?? (typeof window !== "undefined" ? window.location.pathname : "/")
  );

  const navigate = (to: string) => {
    setPath(to);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", to);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export interface RouteProps {
  path: string;
  component?: FC;
  children?: ReactNode;
}

export const Route: FC<RouteProps> = ({ path, component: Component, children }) => {
  const router = useRouter();
  if (router.path !== path) {
    return null;
  }
  if (Component) {
    return <Component />;
  }
  return <>{children}</>;
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

export const DarkFactoryShell: FC = () => {
  return (
    <Router>
      <div className="darkfactory-shell">
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
  const router = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        router.navigate(to);
      }}
    >
      {children}
    </a>
  );
};
