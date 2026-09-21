import { test, expect } from "bun:test";
/** Verify release artifact version source is real and publishable. */
test("df package version is set", () => {
  const pkg = require("../../packages/df-release/package.json");
  expect(pkg.version).toBeTruthy();
  expect(pkg.name).toContain("darkfactory");
});
