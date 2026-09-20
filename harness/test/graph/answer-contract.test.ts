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

	test("allows mutation claims on tool/mutation 'run' actions", () => {
		const r = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"I have successfully resolved these conflicts and pushed the changes.",
			{ type: "run", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r.valid).toBe(true);
	});

	test("accepts benign uses of monitored words", () => {
		const r = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"I am committed to helping you resolve this issue once the branch is updated.",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r.valid).toBe(true);
	});

	test("defensive runtime type and presence checks", () => {
		const action = { type: "comment", node: "resp", status: "Blocked" as const, message: "ok" };
		expect(validateAnswerContract({ login: "a", association: "OWNER", is_bot: false }, null as any, action).valid).toBe(
			true,
		);
		expect(
			validateAnswerContract({ login: "a", association: "OWNER", is_bot: false }, undefined as any, action).valid,
		).toBe(true);
		expect(validateAnswerContract({ login: "a", association: "OWNER", is_bot: false }, "", action).valid).toBe(true);
		expect(validateAnswerContract({ login: "a", association: "OWNER", is_bot: false }, "   ", action).valid).toBe(true);
	});

	test("ignores mutation claims nested in markdown blockquotes", () => {
		const r = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"> I have successfully resolved these conflicts\n\nI am still working on the remaining issues.",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r.valid).toBe(true);
	});

	test("ignores mutation claims inside markdown fenced code blocks", () => {
		const r = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"Here is the code block where I put the suggestion:\n```bash\ngit commit -m 'I committed the changes'\n```",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r.valid).toBe(true);
	});

	test("ignores instructional or second-person comments", () => {
		const r1 = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"Please make sure you have committed the changes to your branch before proceeding.",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r1.valid).toBe(true);

		const r2 = validateAnswerContract(
			{ login: "a", association: "OWNER", is_bot: false },
			"Once you have resolved the conflicts manually, run the pipeline again.",
			{ type: "comment", node: "resp", status: "Blocked", message: "ok" },
		);
		expect(r2.valid).toBe(true);
	});
});
