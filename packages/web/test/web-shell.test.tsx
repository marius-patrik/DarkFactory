import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { DarkFactoryShell } from "../src/index";

// wouter 3 dropped `MemoryRouter` and the `wouter/memory` subpath: pinning a location is now a
// `Router` whose location hook comes from `wouter/memory-location`, and `memoryLocation` returns an
// object whose `hook` field is the function `Router` wants. This is the v3 spelling of what the
// test previously asked for.
function renderAt(path: string): string {
	const { hook } = memoryLocation({ path });
	return renderToString(
		<Router hook={hook}>
			<DarkFactoryShell />
		</Router>,
	);
}

test("DarkFactoryShell renders shell", () => {
	const output = renderToString(<DarkFactoryShell />);
	expect(output).toContain("DarkFactory Web");
});

test("DarkFactoryShell renders Dashboard at /", () => {
	expect(renderAt("/")).toContain("Dashboard");
});

test("DarkFactoryShell renders System Status at /status", () => {
	expect(renderAt("/status")).toContain("System Status");
});

test("DarkFactoryShell renders NotFound at /unknown", () => {
	expect(renderAt("/unknown")).toContain("404 Not Found");
});
