import { test, expect } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DarkFactoryShell, Router, useRouter, validateRoutes } from "../src/index";

const mockLocationHook = (initialPath: string) => {
  let current = initialPath;
  const navigate = (to: string) => {
    current = to;
  };
  const hook = () => [current, navigate] as const;
  return { hook, navigate, searchHook: () => "" };
};

test("DarkFactoryShell renders shell", () => {
  const { hook, searchHook } = mockLocationHook("/");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("DarkFactory Web");
});

test("DarkFactoryShell renders Dashboard at /", () => {
  const { hook, searchHook } = mockLocationHook("/");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Dashboard");
});

test("DarkFactoryShell renders System Status at /status", () => {
  const { hook, searchHook } = mockLocationHook("/status");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("System Status");
});

test("DarkFactoryShell renders Requests at /requests", () => {
  const { hook, searchHook } = mockLocationHook("/requests");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Requests, Epics &amp; Planning");
});

test("DarkFactoryShell renders Recovery at /recovery", () => {
  const { hook, searchHook } = mockLocationHook("/recovery");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Recovery &amp; Workspace");
});

test("DarkFactoryShell renders PRs at /prs", () => {
  const { hook, searchHook } = mockLocationHook("/prs");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Pull Requests &amp; Stacks");
});

test("DarkFactoryShell renders Runs at /runs", () => {
  const { hook, searchHook } = mockLocationHook("/runs");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Checks, Runs &amp; Releases");
});

test("DarkFactoryShell renders Graph at /graph", () => {
  const { hook, searchHook } = mockLocationHook("/graph");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Execution Flow Graph");
});

test("DarkFactoryShell renders Capabilities at /capabilities", () => {
  const { hook, searchHook } = mockLocationHook("/capabilities");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Capabilities &amp; Tools");
});

test("DarkFactoryShell renders Config at /config", () => {
  const { hook, searchHook } = mockLocationHook("/config");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Configuration (repo.df)");
});

test("DarkFactoryShell renders Audit at /audit", () => {
  const { hook, searchHook } = mockLocationHook("/audit");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("Operator Audit Logs");
});

test("DarkFactoryShell renders NotFound at /unknown", () => {
  const { hook, searchHook } = mockLocationHook("/unknown");
  const output = renderToString(createElement(DarkFactoryShell, { hook, searchHook }));
  expect(output).toContain("404 Not Found");
});

test("useRouter navigation updates location state", async () => {
  const { hook, navigate, searchHook } = mockLocationHook("/");
  
  const TestComponent = () => {
    const { path } = useRouter();
    return <span>Current: {path}</span>;
  };

  // 1. Initial render
  const output1 = renderToString(
    createElement(Router, { hook, searchHook }, createElement(TestComponent))
  );
  expect(output1.replaceAll("<!-- -->", "")).toContain("Current: /");
  
  // 2. Trigger navigation
  navigate("/status");
  
  // 3. Re-render
  const output2 = renderToString(
    createElement(Router, { hook, searchHook }, createElement(TestComponent))
  );
  expect(output2.replaceAll("<!-- -->", "")).toContain("Current: /status");
});

test("validateRoutes validates correctly", () => {
  const Placeholder = () => null;
  expect(() => validateRoutes([
    { path: "/", component: Placeholder, label: "Home" },
    { path: "/status", component: Placeholder, label: "Status" },
  ])).not.toThrow();

  expect(() => validateRoutes([
    { path: "invalid", component: Placeholder, label: "Invalid" },
  ])).toThrow('Route path must start with "/"');

  expect(() => validateRoutes([
    { path: "/", component: Placeholder, label: "Home" },
    { path: "/", component: Placeholder, label: "Home" },
  ])).toThrow('Route collision detected for path: /');

  expect(() => validateRoutes([
    { path: "/missing", component: null as any, label: "Missing" },
  ])).toThrow('Route component missing for path: /missing');
});
