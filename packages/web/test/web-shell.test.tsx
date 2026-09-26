import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import type { BaseLocationHook, Path } from "wouter";
import { DarkFactoryShell } from "../src/index";

// wouter 3.11 dropped the `MemoryRouter` component and its `wouter/memory` subpath in favour of a
// `memoryLocation` hook. That hook calls `useSyncExternalStore` with no `getServerSnapshot`, so it
// throws `Missing getServerSnapshot` under `renderToString` and cannot server-render.
//
// These cases assert what the shell renders at a route, not how it navigates, so a static hook is
// both sufficient and honest: a fixed path, no subscription, no store. A `searchHook` is attached
// because `Router` inherits the query hook from the location hook.
function staticLocation(path: Path): BaseLocationHook {
	const hook = (() => [path, () => {}]) as unknown as BaseLocationHook;
	hook.searchHook = () => "";
	return hook;
}

function renderAt(path: string): string {
	return renderToString(
		<Router hook={staticLocation(path)}>
			<DarkFactoryShell />
		</Router>,
	);
}

test("DarkFactoryShell renders shell", () => {
	// Even the route-less case needs a Router: the shell calls useLocation internally, and without
	// one wouter falls back to the browser location hook, which does not exist under renderToString.
	expect(renderAt("/")).toContain("DarkFactory Web");
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
