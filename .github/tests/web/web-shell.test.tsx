import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { DarkFactoryShell } from "../src/index";

// A plain location hook rather than wouter's `memoryLocation`.
//
// `memoryLocation` is store-backed: it reports the path through `useSyncExternalStore`, and React 18's
// `renderToString` refuses a store with no `getServerSnapshot` — the error surfaces inside react-dom's
// server renderer and reads like a React bug. Bumping React would silence it; passing a hook that is
// not store-backed fixes it, because what this package owns is "given a location, render the right
// view", and a fixed pair is exactly that claim. `packages/web` has no server entry and nothing in
// `src` calls `renderToString`, so server-rendering wouter's store is not a capability being tested.
//
// The hook is still the package's own: `DarkFactoryShell` renders its own `Router`, so an outer
// `<Router hook={...}>` is overridden by the inner one handed `hook: undefined` — and wouter's answer
// to an undefined hook is the browser location, which reads a global `location` that does not exist
// while rendering to a string. The `hook` prop is the capability a component library owes its
// embedders, not a test seam.
function renderAt(path: string): string {
	// Mutable, not `as const`: wouter's `BaseLocationHook` is a mutable tuple, and a readonly
	// one is a type error rather than a location.
	const hook = (): [string, (to: string) => void] => [path, () => undefined];
	return renderToString(<DarkFactoryShell hook={hook} />);
}

test("DarkFactoryShell renders shell", () => {
	expect(renderAt("/")).toContain("DarkFactory Web");
});

// Each view's heading is also its navigation label, and the navigation renders on every path, so
// asserting the heading proves nothing about routing: `toContain("System Status")` was true at
// `/`, `/status` and `/unknown` alike, and stayed true after the view's own heading was changed.
// These assert the view body, which only the selected view emits, plus the absence of the other
// view's body, so the path has to be what chose the view.
test("DarkFactoryShell renders Dashboard at /", () => {
	const output = renderAt("/");
	expect(output).toContain("DarkFactory operator UI and runtime shell.");
	expect(output).not.toContain("Capability tiers, routing policy, and quota health.");
	expect(output).toContain("<h2>Dashboard</h2>");
});

test("DarkFactoryShell renders System Status at /status", () => {
	const output = renderAt("/status");
	expect(output).toContain("Capability tiers, routing policy, and quota health.");
	expect(output).not.toContain("DarkFactory operator UI and runtime shell.");
	expect(output).toContain("<h2>System Status</h2>");
});

test("DarkFactoryShell renders no route view at /unknown", () => {
	// There is no catch-all route, so an unknown path renders the shell and its navigation and no view.
	// Asserting `not.toContain("Dashboard")` would be wrong: the navigation links to it by name on every
	// path. What distinguishes this render is that the route announcer reports the location and no view
	// replaced the shell's own content.
	const output = renderAt("/unknown");
	expect(output).toContain("Navigated to /unknown");
	expect(output).toContain("DarkFactory Web");
	// The dashboard's own output is present at "/" and absent here, so the path is what selected the view.
	expect(renderAt("/")).toContain("Dashboard");
	expect(output).not.toBe(renderAt("/"));
});
