import { beforeEach, describe, expect, test } from "bun:test";
import {
	clearSession,
	completeAuthCallback,
	initiateAuth,
	persistSession,
	restoreSession,
	restoreSessionWithRefresh,
} from "../../../packages/auth/src/client.ts";

class MemoryStorage implements Storage {
	#values = new Map<string, string>();
	get length(): number {
		return this.#values.size;
	}
	clear(): void {
		this.#values.clear();
	}
	getItem(key: string): string | null {
		return this.#values.get(key) ?? null;
	}
	key(index: number): string | null {
		return [...this.#values.keys()][index] ?? null;
	}
	removeItem(key: string): void {
		this.#values.delete(key);
	}
	setItem(key: string, value: string): void {
		this.#values.set(key, value);
	}
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

	test("expired session can be restored through broker refresh without browser token custody", async () => {
		persistSession({ id: "opaque-session", expiresAt: 2_000 });
		const restored = await restoreSessionWithRefresh(
			async (sessionId) => ({ id: sessionId, expiresAt: 5_000, userId: "octocat" }),
			3_000,
		);
		expect(restored).toEqual({ id: "opaque-session", expiresAt: 5_000, userId: "octocat" });
		expect(localStorage.getItem("df-auth-session")).not.toContain("token");
	});

	test("failed broker refresh clears expired browser state", async () => {
		persistSession({ id: "opaque-session", expiresAt: 2_000 });
		expect(
			await restoreSessionWithRefresh(async () => {
				throw new Error("refresh failed");
			}, 3_000),
		).toBeNull();
		expect(localStorage.getItem("df-auth-session")).toBeNull();
	});

	test("a pending refresh cannot resurrect an account after logout", async () => {
		persistSession({ id: "old", expiresAt: 2_000 });
		let complete!: (value: { id: string; expiresAt: number }) => void;
		const refresh = new Promise<{ id: string; expiresAt: number }>((resolve) => {
			complete = resolve;
		});
		const pending = restoreSessionWithRefresh(() => refresh, 3_000);
		clearSession();
		complete({ id: "old", expiresAt: 5_000 });
		expect(await pending).toBeNull();
		expect(restoreSession(3_000)).toBeNull();
	});

	test("stale refresh success or failure cannot replace a newer login", async () => {
		for (const fail of [false, true]) {
			persistSession({ id: "old", expiresAt: 2_000 });
			let complete!: () => void;
			const gate = new Promise<void>((resolve) => {
				complete = resolve;
			});
			const pending = restoreSessionWithRefresh(async () => {
				await gate;
				if (fail) throw new Error("Expired broker token");
				return { id: "old", expiresAt: 5_000 };
			}, 3_000);
			persistSession({ id: "new", expiresAt: 10_000 });
			complete();
			expect(await pending).toEqual({ id: "new", expiresAt: 10_000 });
			expect(restoreSession(3_000)?.id).toBe("new");
		}
	});

	test("a broker cannot silently replace the refreshed session identity", async () => {
		persistSession({ id: "old", expiresAt: 2_000 });
		expect(await restoreSessionWithRefresh(async () => ({ id: "other", expiresAt: 5_000 }), 3_000)).toBeNull();
		expect(restoreSession(3_000)).toBeNull();
	});

	test("clearSession removes the opaque browser descriptor", () => {
		persistSession({ id: "opaque-session", expiresAt: Date.now() + 10_000 });
		clearSession();
		expect(restoreSession()).toBeNull();
	});
});


describe("@darkfactory/auth negative callback handling", () => {
	beforeEach(() => {
		installStorage("localStorage");
		installStorage("sessionStorage");
	});
	test("OAuth error callbacks and ambiguous codes consume CSRF material", async () => {
		const url = await initiateAuth("client", "https://example.test/callback", "read:user");
		const state = new URL(url).searchParams.get("state")!;
		expect(() => completeAuthCallback(new URLSearchParams({ state, error: "access_denied" }))).toThrow("denied");
		expect(() => completeAuthCallback(new URLSearchParams({ state, code: "replay" }))).toThrow(
			"No pending authentication flow",
		);
		const next = await initiateAuth("client", "https://example.test/callback", "read:user");
		const secondState = new URL(next).searchParams.get("state")!;
		expect(() => completeAuthCallback(`state=${secondState}&code=a&code=b`)).toThrow("ambiguous");
	});
	test("rejects non-HTTPS OAuth callback destinations before persisting PKCE state", async () => {
		await expect(initiateAuth("client", "http://attacker.test/callback", "read:user")).rejects.toThrow("HTTPS");
		expect(sessionStorage.length).toBe(0);
	});
});
