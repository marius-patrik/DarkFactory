import { describe, expect, test } from "bun:test";
import type { GitHubRepository } from "../src/github/repository";
import { parseQuotaRecord, QUOTA_VARIABLE_PREFIX, sweepQuotaResumes } from "../src/limits/resume-sweep";

/** Minimal stand-in recording what the sweep asked GitHub to do. */
function fakeRepo(variables: { name: string; value: string }[], failures: number[] = []) {
	const dispatched: { event: string; payload: Record<string, unknown> }[] = [];
	const deleted: string[] = [];
	let attempts = 0;
	const repo = {
		async listVariables() {
			return variables.map((entry) => ({ ...entry }));
		},
		async deleteVariable(name: string) {
			deleted.push(name);
		},
		async dispatchRepositoryEvent(event: string, payload: Record<string, unknown>) {
			attempts++;
			if (failures.includes(attempts)) throw new Error("dispatch rejected");
			dispatched.push({ event, payload });
		},
	} as unknown as GitHubRepository;
	return { repo, dispatched, deleted };
}

const past = new Date("2026-01-01T00:00:00Z");
const future = new Date("2099-01-01T00:00:00Z");

describe("quota resume sweep", () => {
	test("resumes a blocked item whose reset has passed and clears its record", async () => {
		const { repo, dispatched, deleted } = fakeRepo([
			{
				name: `${QUOTA_VARIABLE_PREFIX}7`,
				value: JSON.stringify({ item: 7, is_pr: true, reset_at: past.toISOString() }),
			},
		]);
		const result = await sweepQuotaResumes({ repo, now: new Date("2026-01-02T00:00:00Z") });
		expect(result.resumed).toEqual([7]);
		expect(dispatched).toEqual([{ event: "agent-dispatch", payload: { stage: "resume", item: 7, is_pr: true } }]);
		expect(deleted).toEqual([`${QUOTA_VARIABLE_PREFIX}7`]);
	});

	test("leaves a record that has not reset yet", async () => {
		const { repo, dispatched, deleted } = fakeRepo([
			{ name: `${QUOTA_VARIABLE_PREFIX}9`, value: JSON.stringify({ item: 9, reset_at: future.toISOString() }) },
		]);
		const result = await sweepQuotaResumes({ repo, now: past });
		expect(result.resumed).toEqual([]);
		expect(dispatched).toEqual([]);
		expect(deleted).toEqual([]);
	});

	test("a failed dispatch keeps the record so the next sweep retries", async () => {
		const { repo, dispatched, deleted } = fakeRepo(
			[{ name: `${QUOTA_VARIABLE_PREFIX}3`, value: JSON.stringify({ item: 3, reset_at: past.toISOString() }) }],
			[1],
		);
		const result = await sweepQuotaResumes({ repo, now: new Date("2026-01-02T00:00:00Z") });
		expect(result.resumed).toEqual([]);
		expect(result.keptAfterFailure).toEqual([`${QUOTA_VARIABLE_PREFIX}3`]);
		expect(dispatched).toEqual([]);
		expect(deleted).toEqual([]);
	});

	test("an unreadable record is deleted rather than retried forever", async () => {
		const { repo, deleted } = fakeRepo([{ name: `${QUOTA_VARIABLE_PREFIX}4`, value: "not json" }]);
		const result = await sweepQuotaResumes({ repo, now: past });
		expect(result.deletedUnreadable).toEqual([`${QUOTA_VARIABLE_PREFIX}4`]);
		expect(deleted).toEqual([`${QUOTA_VARIABLE_PREFIX}4`]);
	});

	test("variables belonging to something else are left alone", async () => {
		const { repo, dispatched, deleted } = fakeRepo([{ name: "UNRELATED", value: "{}" }]);
		const result = await sweepQuotaResumes({ repo, now: new Date("2026-01-02T00:00:00Z") });
		expect(result).toEqual({ resumed: [], deletedUnreadable: [], keptAfterFailure: [] });
		expect(dispatched).toEqual([]);
		expect(deleted).toEqual([]);
	});

	test("an issue record defaults to not a pull request", async () => {
		const { repo, dispatched } = fakeRepo([
			{ name: `${QUOTA_VARIABLE_PREFIX}5`, value: JSON.stringify({ item: 5, reset_at: past.toISOString() }) },
		]);
		await sweepQuotaResumes({ repo, now: new Date("2026-01-02T00:00:00Z") });
		expect(dispatched[0]?.payload).toEqual({ stage: "resume", item: 5, is_pr: false });
	});
});

describe("parseQuotaRecord", () => {
	test("rejects a record with no item", () => {
		expect(() => parseQuotaRecord(JSON.stringify({ reset_at: past.toISOString() }))).toThrow();
	});
	test("rejects a non-numeric item", () => {
		expect(() => parseQuotaRecord(JSON.stringify({ item: "seven", reset_at: past.toISOString() }))).toThrow();
	});
	test("rejects a record with no reset time", () => {
		expect(() => parseQuotaRecord(JSON.stringify({ item: 1 }))).toThrow();
	});
});
