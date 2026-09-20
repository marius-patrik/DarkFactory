import { test, expect } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DarkFactoryShell, Router } from "../src/index";
import { memoryLocation } from "wouter/memory-location";

test("DarkFactoryShell renders shell", () => {
  const output = renderToString(createElement(DarkFactoryShell));
  expect(output).toContain("DarkFactory Web");
});

test("DarkFactoryShell renders Dashboard at /", () => {
  const mem = memoryLocation({ path: "/" });
  const output = renderToString(createElement(Router, { hook: mem.hook }, createElement(DarkFactoryShell)));
  expect(output).toContain("Dashboard");
});

test("DarkFactoryShell renders System Status at /status", () => {
  const mem = memoryLocation({ path: "/status" });
  const output = renderToString(createElement(Router, { hook: mem.hook }, createElement(DarkFactoryShell)));
  expect(output).toContain("System Status");
});

test("DarkFactoryShell renders NotFound at /unknown", () => {
  const mem = memoryLocation({ path: "/unknown" });
  const output = renderToString(createElement(Router, { hook: mem.hook }, createElement(DarkFactoryShell)));
  expect(output).toContain("404 Not Found");
});
