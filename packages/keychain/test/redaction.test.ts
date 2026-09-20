import { expect, test, describe } from "bun:test";
import { CredentialRedactor } from "../src/redaction.js";

describe("keychain redaction", () => {
	test("redacts registered secrets", () => {
		const r = new CredentialRedactor();
		r.register(["my-secret-key"]);
		expect(r.redact("token=my-secret-key")).toBe("token=[REDACTED]");
	});

	test("scans for leaks", () => {
		const r = new CredentialRedactor();
		r.register(["leaked"]);
		expect(r.scan("leaked")).toBe(true);
		expect(r.scan("safe")).toBe(false);
	});
});
