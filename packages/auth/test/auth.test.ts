import { beforeEach, describe, expect, test } from "bun:test";
import {
	clearSession,
	completeAuthCallback,
	initiateAuth,
	persistSession,
	restoreSession,
} from "../src/client.ts";

class MemoryStorage implements Storage {
	#values = new Map<string, string>();
	get length(): number { return this.#values.size; }
	clear(): void { this.#values.clear(); }
	getItem(key: string): string | null { return this.#values.get(key) ?? null; }
	key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
	removeItem(key: string): void { this.#values.delete(key); }
	setItem(key: string, value: string): void { this.#values.set(key, value); }
}

function installStorage(name: "localStorage" | "sessionStorage"): void {
	Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true, writable: true });
}

describe("@darkfactory/auth browser client", () => {
	beforeEach(() => {
		installStorage("localStorage");
		installStorage("sessionStorage");
	});

	test("PKCE callback validates state and consumes state/verifier once", async () => {
		const url = await initiateAuth("client", "https://example.test/callback", "read:user");
		const state = new URL(url).searchParams.get("state");
		expect(state).toBeTruthy();
		const result = completeAuthCallback(new URLSearchParams({ code: "code-1", state: state! }));
		expect(result.code).toBe("code-1");
		expect(result.codeVerifier.length).toBeGreaterThan(20);
		expect(() => completeAuthCallback(new URLSearchParams({ code: "code-1", state: state! }))).toThrow(
			"No pending authentication flow",
		);
	});

	test("state mismatch is rejected and cannot be replayed", async () => {
		await initiateAuth("client", "https://example.test/callback", "read:user");
		expect(() => completeAuthCallback("code=code-1&state=wrong")).toThrow("Authentication state mismatch");
		expect(() => completeAuthCallback("code=code-1&state=wrong")).toThrow("No pending authentication flow");
	});

	test("browser persistence contains only opaque session state and expires fail closed", () => {
		persistSession({ id: "opaque-session", expiresAt: 2_000, userId: "octocat" });
		const raw = localStorage.getItem("df-auth-session")!;
		expect(raw).toContain("opaque-session");
		expect(raw).not.toContain("access_token");
		expect(raw).not.toContain("refresh_token");
		expect(restoreSession(1_000)?.id).toBe("opaque-session");
		expect(restoreSession(2_000)).toBeNull();
		expect(localStorage.getItem("df-auth-session")).toBeNull();
	});

	test("clearSession removes the opaque browser descriptor", () => {
		persistSession({ id: "opaque-session", expiresAt: Date.now() + 10_000 });
		clearSession();
		expect(restoreSession()).toBeNull();
	});
});
