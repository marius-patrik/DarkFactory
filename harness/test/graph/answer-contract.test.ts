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

	test("accepts benign uses of monitored words", () => {
		const r = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"I am committed to helping you resolve this issue once the branch is updated.",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r.valid).toBe(true);
	});
});
