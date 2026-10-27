import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { DarkFactoryShell } from "../../../packages/web/src/index.ts";

function renderAt(path: string, repository = "marius-patrik/DarkFactory"): string {
	const hook = (): [string, (to: string) => void] => [path, () => undefined];
	return renderToString(<DarkFactoryShell hook={hook} repository={repository} />);
}
test("operator routes display distinct real resource headings, not placeholder copy", () => {
	const overview = renderAt("/");
	const requests = renderAt("/requests");
	const graph = renderAt("/graph");
	expect(overview).toContain("Authoritative repository identity");
	expect(requests).toContain("Recently updated issues labeled Request");
	expect(graph).toContain("Persisted governed execution");
	expect(requests).not.toContain("DarkFactory operator UI and runtime shell.");
	expect(graph).not.toBe(requests);
});
test("Pages-safe hash shell renders deep routes on an injected location", () => {
	const output = renderAt("/configuration");
	expect(output).toContain('aria-current="page"');
	expect(output).toContain("Live read-only canonical repository configuration file.");
	expect(output).toContain("Skip to main content");
	expect(output).toContain('id="df-main"');
});
test("unknown routes fail closed with a recovery link", () => {
	const output = renderAt("/unknown");
	expect(output).toContain("Page not found");
	expect(output).toContain("Return to overview");
	expect(output).not.toContain("Live read-only canonical repository configuration file.");
});
test("without repository configuration operator fails closed", () => {
	const hook = (): [string, (to: string) => void] => ["/", () => undefined];
	const output = renderToString(<DarkFactoryShell hook={hook} />);
	expect(output).toContain("Repository not configured");
	expect(output).toContain("Public · read-only");
});
