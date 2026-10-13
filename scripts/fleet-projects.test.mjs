import { test } from "node:test";
import assert from "node:assert/strict";
import { isProjectsQuotaExceeded, managedRepositories, projectsFor } from "./fleet-projects.mjs";

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
