import { createElement } from "react";

/**
 * Navigation header for DarkFactory Web.
 */
export function Navigation() {
  return createElement("nav", { className: "flex gap-4 p-4 border-b border-gray-200 dark:border-gray-800" }, [
    createElement("a", { key: "home", href: "/", className: "font-semibold" }, "DarkFactory"),
    createElement("a", { key: "requests", href: "/requests", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Requests"),
    createElement("a", { key: "epics", href: "/epics", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Epics"),
    createElement("a", { key: "planning", href: "/planning", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Planning"),
    createElement("a", { key: "prs", href: "/prs", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "PRs"),
    createElement("a", { key: "checks", href: "/checks", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Checks"),
    createElement("a", { key: "runs", href: "/runs", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Runs"),
    createElement("a", { key: "graph", href: "/graph", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Graph"),
    createElement("a", { key: "capability", href: "/capability", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Capability"),
    createElement("a", { key: "config", href: "/config", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Config"),
    createElement("a", { key: "audit", href: "/audit", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Audit"),
    createElement("a", { key: "docs", href: "/docs", className: "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" }, "Docs"),
  ]);
}
