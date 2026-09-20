import { test, expect } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { App } from "../src/app";

test("App renders shell", () => {
  const output = renderToString(createElement(App));
  expect(output).toContain("DarkFactory Web");
});
