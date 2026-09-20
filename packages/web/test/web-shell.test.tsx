import { test, expect } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DarkFactoryShell, Router } from "../src/index";

// Mock location and window for SSR testing with wouter
global.window = { location: { pathname: "/" } } as any;
global.location = { pathname: "/" } as any;

test("DarkFactoryShell renders shell", () => {
  const output = renderToString(createElement(DarkFactoryShell));
  expect(output).toContain("DarkFactory Web");
});

test("DarkFactoryShell renders Dashboard at /", () => {
  global.location = { pathname: "/" } as any;
  const output = renderToString(createElement(DarkFactoryShell, { basename: "/" }));
  expect(output).toContain("Dashboard");
});

test("DarkFactoryShell renders System Status at /status", () => {
  global.location = { pathname: "/status" } as any;
  const output = renderToString(createElement(DarkFactoryShell, { basename: "" }));
  expect(output).toContain("System Status");
});

test("DarkFactoryShell renders NotFound at /unknown", () => {
  global.location = { pathname: "/unknown" } as any;
  const output = renderToString(createElement(DarkFactoryShell, { basename: "" }));
  expect(output).toContain("404 Not Found");
});
