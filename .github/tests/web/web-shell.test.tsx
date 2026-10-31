import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { DarkFactoryShell } from "../../../packages/web/src/index.ts";

function renderAt(path: string, repository = "marius-patrik/DarkFactory"): string {
	const hook = (): [string, (to: string) => void] => [path, () => undefined];
	return renderToString(<DarkFactoryShell hook={hook} repository={repository} />);
}
test("different live resource routes have distinct product headings", () => {
	const overview = renderAt("/");
	const requests = renderAt("/requests");
	const graph = renderAt("/graph");
	expect(overview).toContain("Authoritative repository identity");
	expect(requests).toContain("Recently updated issues labeled Request");
	expect(graph).toContain("Graph execution");
	expect(requests).not.toContain("DarkFactory operator UI and runtime shell.");
	expect(graph).not.toBe(requests);
});
test("Pages-safe operator navigation exposes hash links and static Docs entry", () => {
	const output = renderAt("/configuration");
	expect(output).toContain('aria-current="page"');
	expect(output).toContain("Live read-only canonical repository configuration file.");
	expect(output).toContain("Skip to main content");
	expect(output).toContain('id="df-main"');
	expect(output).toContain("#/configuration");
	expect(output).toContain("docs/");
});
test("unknown routes fail closed with recovery navigation", () => {
	const output = renderAt("/unknown");
	expect(output).toContain("Page not found");
	expect(output).toContain("Return to overview");
});
test("unconfigured broker cannot fake authenticated operator actions", () => {
	const output = renderAt("/approvals");
	expect(output).toContain("Public read-only");
	expect(output).not.toContain("Approved successfully");
	expect(output).not.toContain("Mutation complete");
});
