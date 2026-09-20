import { describe, expect, test } from "bun:test";
import { validateAnswerContract } from "../../src/graph/answer-contract.ts";

describe("answer contract", () => {
	test("rejects false write claims on text-only action", () => {
		const r = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"I have successfully resolved these conflicts by integrating the latest changes",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r.valid).toBe(false);
	});

	test("accepts clean text response", () => {
		const r = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"The PR needs a branch update first.",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r.valid).toBe(true);
	});
});
