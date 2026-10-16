import { test } from "node:test";
import assert from "node:assert/strict";
import {
	isProjectsQuotaExceeded,
	managedRepositories,
	projectsFor,
	readOwnerProjects,
	registerProjectTitle,
	selectedManagedProject,
} from "./fleet-projects.mjs";

test("distinguishes exhausted owner GraphQL budget from normal failures", () => {
	assert.equal(
		isProjectsQuotaExceeded(
			new Error(
				'Projects GraphQL: [{"type":"RATE_LIMIT","code":"graphql_rate_limit","message":"API rate limit already exceeded for user ID 69584331."}]',
			),
		),
		true,
	);
	assert.equal(isProjectsQuotaExceeded(new Error("GraphQL quota exhausted (0 remaining)")), true);
	assert.equal(isProjectsQuotaExceeded(new Error("Projects GraphQL: Bad credentials")), false);
	assert.equal(isProjectsQuotaExceeded(new Error("Not Found")), false);
});

test("producer-only reconciliation preserves scope until explicit authorization", () => {
	const repos = [
		{ full_name: "marius-patrik/DarkFactory", archived: false, disabled: false },
		{ full_name: "marius-patrik/OASIS", archived: false, disabled: false },
		{ full_name: "marius-patrik/data-agents-os", archived: false, disabled: false },
		{ full_name: "marius-patrik/test-old", archived: false, disabled: false },
	];
	const allowed = managedRepositories(repos, "marius-patrik", "marius-patrik/DarkFactory");
	assert.deepEqual(
		allowed.map((r) => r.full_name),
		["marius-patrik/DarkFactory", "marius-patrik/OASIS"],
	);
	assert.deepEqual(projectsFor("DarkFactory"), ["Global", "DarkFactory"]);
});

test("unrelated duplicated project titles do not prevent managed board reconciliation", () => {
	const index = new Map();
	for (const project of [
		{ id: "features-1", title: "Features" },
		{ id: "global", title: "Global" },
		{ id: "features-2", title: "Features" },
		{ id: "consumer", title: "OASIS" },
	])
		registerProjectTitle(index, project);
	assert.equal(selectedManagedProject(index, "Global")?.id, "global");
	assert.equal(selectedManagedProject(index, "OASIS")?.id, "consumer");
	assert.equal(selectedManagedProject(index, "Missing"), undefined);
	assert.throws(() => selectedManagedProject(index, "Features"), /Ambiguous duplicate managed Project/);
});

test("reuses REST project IDs instead of querying shared GraphQL inventory", async () => {
	const records = new Map([
		["DarkFactory", { title: "DarkFactory", id: "PVT_kwDOabc", number: 31, closed: false }],
		["Global", { title: "Global", id: "PVT_kwDOdef", number: 21, closed: false }],
	]);
	const seen = [];
	const read = async (owner, token) => {
		seen.push({ type: "projects", owner, token });
		return records;
	};
	const rest = async (method, path, token) => {
		seen.push({ type: "owner", method, path, token });
		return { node_id: "MDQ6VXNlcjE=" };
	};
	const result = await readOwnerProjects("marius-patrik", "owner-pat", "app-token", read, rest);
	assert.equal(result.ownerId, "MDQ6VXNlcjE=");
	assert.deepEqual([...result.byTitle.keys()], ["DarkFactory", "Global"]);
	assert.equal(result.byTitle.get("Global").id, "PVT_kwDOdef");
	assert.deepEqual(seen, [
		{ type: "projects", owner: "marius-patrik", token: "owner-pat" },
		{ type: "owner", method: "GET", path: "/users/marius-patrik", token: "app-token" },
	]);
});

test("missing REST project node ids fail closed without creating duplicate boards", async () => {
	await assert.rejects(
		readOwnerProjects(
			"marius-patrik",
			"owner-pat",
			"app-token",
			async () => new Map([["Global", { title: "Global", id: null, number: 21, closed: false }]]),
			async () => ({ node_id: "MDQ6VXNlcjE=" }),
		),
		/lacks a GraphQL node id/,
	);
});
