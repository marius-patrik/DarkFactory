import { test, expect } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DarkFactoryShell } from "../src/index";

test("DarkFactoryShell renders shell and routing", () => {
  const output = renderToString(createElement(DarkFactoryShell));
  expect(output).toContain("DarkFactory Web");
  expect(output).toContain("Dashboard");
});
