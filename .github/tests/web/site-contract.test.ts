import { expect, test } from "bun:test";
import {
	normalizeSiteBasePath,
	operatorPathFromLocation,
	operatorStaticRoutes,
} from "../../../packages/web/src/site-contract.ts";

test("normalizes root and nested Pages prefixes", () => {
	expect(normalizeSiteBasePath("/")).toBe("/");
	expect(normalizeSiteBasePath("/DarkFactory/")).toBe("/DarkFactory/");
	expect(() => normalizeSiteBasePath("/../x")).toThrow();
});
test("preserves direct documentation routes under project Pages prefix", () => {
	expect(operatorPathFromLocation("/DarkFactory/docs/adr-0001/", "/DarkFactory/")).toBe("/docs/adr-0001");
	expect(operatorPathFromLocation("/DarkFactory/docs/", "/DarkFactory/")).toBe("/docs");
	expect(operatorPathFromLocation("/DarkFactory/", "/DarkFactory/")).toBe("/");
});
test("enumerates safe static documentation wrappers", () => {
	expect(operatorStaticRoutes(["home", "adr-0019"])).toContain("docs/adr-0019/index.html");
	expect(() => operatorStaticRoutes(["../escape"])).toThrow();
});
