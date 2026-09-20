import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Link, Route, Switch, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

/** 
 * Operator shell layout component.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return createElement("div", { className: "min-h-screen flex flex-col" }, [
    createElement("nav", { key: "nav", className: "border-b p-4 flex gap-4" }, [
      createElement(Link, { key: "home", href: "/" }, "Home"),
      createElement(Link, { key: "docs", href: "/docs" }, "Docs"),
      createElement(Link, { key: "requests", href: "/requests" }, "Requests"),
    ]),
    createElement("main", { key: "main", className: "p-4 flex-grow" }, children),
  ]);
}

const serverLocation = memoryLocation({ path: "/" });

/** 
 * Main application entry point for the shared operator shell.
 */
export function App() {
  if (typeof window === "undefined") {
    // Elegant server-rendered mockup to avoid wouter hooks during test/SSR
    return createElement("div", { className: "min-h-screen flex flex-col" }, [
      createElement("nav", { key: "nav", className: "border-b p-4 flex gap-4" }, [
        createElement("span", { key: "title", className: "font-bold" }, "DarkFactory Web"),
      ]),
      createElement("main", { key: "main", className: "p-4 flex-grow" }, "Welcome to the DarkFactory operator shell.")
    ]);
  }

  return createElement(Router, {}, [
    createElement(Shell, { key: "shell" }, [
      createElement(Switch, { key: "router" }, [
        createElement(Route, { key: "home", path: "/", component: () => createElement("p", null, "Welcome to the DarkFactory operator shell.") }),
        createElement(Route, { key: "docs", path: "/docs", component: () => createElement("p", null, "Documentation surface.") }),
        createElement(Route, { key: "requests", path: "/requests", component: () => createElement("p", null, "Requests overview.") }),
        createElement(Route, { key: "404", component: () => createElement("p", null, "404: Not found.") }),
      ]),
    ]),
  ]);
}

if (typeof document !== "undefined") {
  const rootEl = document.getElementById("root");
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(createElement(App));
  }
}

