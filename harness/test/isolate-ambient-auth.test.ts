import { describe, expect, test } from "bun:test";
import type { Provider } from "@earendil-works/pi-ai";
import { isolateAmbientAuth } from "../src/harness/runtime.ts";

// A provider with no api-key resolver is returned unchanged. `registerNativeProvider` stores the
// reference without mutating it, so identity is safe — but identity is exactly the kind of thing a
// future refactor to a shallow copy would silently change, so it is pinned here.
function providerWithoutResolver(): Provider {
	return { id: "no-auth", name: "No Auth", auth: {} } as unknown as Provider;
}

describe("isolateAmbientAuth", () => {
	test("returns the same instance when there is no api-key resolver", () => {
		const provider = providerWithoutResolver();
		expect(isolateAmbientAuth(provider)).toBe(provider);
	});

	test("returns a distinct instance when a resolver is present", async () => {
		const provider = {
			id: "with-auth",
			name: "With Auth",
			auth: {
				apiKey: {
					name: "with-auth",
					resolve: async () => ({ ok: true, apiKey: "k" }) as never,
				},
			},
		} as unknown as Provider;
		const isolated = isolateAmbientAuth(provider);
		expect(isolated).not.toBe(provider);
		expect(isolated.auth.apiKey).toBeDefined();
	});
});
