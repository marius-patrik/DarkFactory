import { describe, expect, it } from "bun:test";
import { CAPABILITY_ABI_VERSION, type CapabilityHookContext, defineCapability } from "../src/abi.ts";
import { hooksForEvent, runHooks } from "../src/hooks.ts";

const runtime = { repositoryRoot: "/repo" } as never;
const context: CapabilityHookContext = { repositoryRoot: "/repo", changedFiles: [] };

function capabilityWith(hooks: NonNullable<Parameters<typeof defineCapability>[0]["hooks"]>) {
	return defineCapability({
		abiVersion: CAPABILITY_ABI_VERSION,
		id: "probe",
		version: "0.0.0",
		description: "capability used only by this test",
		hooks,
	});
}

describe("hooksForEvent", () => {
	it("selects a hook by its events list, in declaration order", () => {
		const capability = capabilityWith([
			{ id: "first", events: ["ci"], execute: () => ({ status: "pass" }) },
			{ id: "second", events: ["pre-commit", "ci"], execute: () => ({ status: "pass" }) },
			{ id: "third", events: ["pre-push"], execute: () => ({ status: "pass" }) },
		]);
		expect(hooksForEvent(capability, "ci").map((hook) => hook.id)).toEqual(["first", "second"]);
	});

	it("honours the legacy single-event declaration", () => {
		const capability = capabilityWith([{ id: "legacy", event: "pr-open", execute: () => ({ status: "pass" }) }]);
		expect(hooksForEvent(capability, "pr-open").map((hook) => hook.id)).toEqual(["legacy"]);
		expect(hooksForEvent(capability, "ci")).toEqual([]);
	});
});

describe("runHooks", () => {
	it("calls execute, which nothing in the repository previously did", async () => {
		let called = 0;
		const capability = capabilityWith([
			{
				id: "counter",
				events: ["ci"],
				execute: () => {
					called += 1;
					return { status: "pass" };
				},
			},
		]);
		const result = await runHooks([capability], "ci", context, runtime);
		expect(called).toBe(1);
		expect(result.ok).toBe(true);
		expect(result.outcomes).toEqual([{ capability: "probe", hook: "counter", status: "pass" }]);
	});

	it("passes the evidence the hook declares it needs, not a subset", async () => {
		let seen: CapabilityHookContext | undefined;
		const capability = capabilityWith([
			{
				id: "reader",
				events: ["pre-commit"],
				execute: (input) => {
					seen = input;
					return { status: "pass" };
				},
			},
		]);
		const input: CapabilityHookContext = {
			repositoryRoot: "/repo",
			changedFiles: ["packages/harness/src/a.ts"],
			commitMessage: "feat: a",
			branch: "feat/a",
		};
		await runHooks([capability], "pre-commit", input, runtime);
		expect(seen).toEqual(input);
	});

	it("attributes a failure to the capability and hook that produced it", async () => {
		const capability = capabilityWith([
			{ id: "strict", events: ["ci"], execute: () => ({ status: "fail", message: "no" }) },
		]);
		const result = await runHooks([capability], "ci", context, runtime);
		expect(result.ok).toBe(false);
		expect(result.outcomes).toEqual([{ capability: "probe", hook: "strict", status: "fail", message: "no" }]);
	});

	it("reports a throwing hook as a failure, so a broken rule is not a passing rule", async () => {
		const capability = capabilityWith([
			{
				id: "explodes",
				events: ["ci"],
				execute: () => {
					throw new Error("boom");
				},
			},
		]);
		const result = await runHooks([capability], "ci", context, runtime);
		expect(result.ok).toBe(false);
		expect(result.outcomes[0]?.status).toBe("fail");
		expect(result.outcomes[0]?.message).toContain("boom");
	});

	it("treats fix as reported rather than failed, so a suggestion does not block", async () => {
		const capability = capabilityWith([{ id: "suggests", events: ["ci"], execute: () => ({ status: "fix" }) }]);
		const result = await runHooks([capability], "ci", context, runtime);
		expect(result.ok).toBe(true);
		expect(result.outcomes[0]?.status).toBe("fix");
	});

	it("evaluates every capability, so one passing capability cannot mask another failing", async () => {
		const passing = capabilityWith([{ id: "ok", events: ["ci"], execute: () => ({ status: "pass" }) }]);
		const failing = defineCapability({
			abiVersion: CAPABILITY_ABI_VERSION,
			id: "other",
			version: "0.0.0",
			description: "second capability",
			hooks: [{ id: "bad", events: ["ci"], execute: () => ({ status: "fail" }) }],
		});
		const result = await runHooks([passing, failing], "ci", context, runtime);
		expect(result.ok).toBe(false);
		expect(result.outcomes.map((outcome) => outcome.capability)).toEqual(["probe", "other"]);
	});

	it("runs nothing for an event no hook declares", async () => {
		const capability = capabilityWith([{ id: "only-ci", events: ["ci"], execute: () => ({ status: "fail" }) }]);
		const result = await runHooks([capability], "pre-push", context, runtime);
		expect(result).toEqual({ outcomes: [], ok: true });
	});
});
