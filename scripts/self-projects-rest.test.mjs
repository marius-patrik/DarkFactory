import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPECTED_SELF_PROJECTS, nextProjectsUrl, parseProjectsPage, readProjectsRest } from "./self-projects-rest.mjs";

test("Projects REST pages cannot silently resolve to empty on unexpected response", () => {
	assert.deepEqual(
		parseProjectsPage([{ title: "Global", number: 3 }]).map((project) => project.title),
		["Global"],
	);
	assert.deepEqual(
		parseProjectsPage({ value: [{ title: "DarkFactory", number: 4 }] }).map((project) => project.number),
		[4],
	);
	assert.throws(() => parseProjectsPage({ message: "Bad credentials" }), /Unexpected Projects/);
	assert.throws(() => parseProjectsPage([{ title: "Global" }]), /lacks title\/number/);
});

test("pagination accepts only official GitHub user-project links", () => {
	const expected = "https://api.github.com/users/marius-patrik/projectsV2?per_page=100&after=abc";
	assert.equal(nextProjectsUrl("<" + expected + '>; rel="next"'), expected);
	assert.equal(nextProjectsUrl(null), null);
	assert.throws(() => nextProjectsUrl('<https://example.com/redirect>; rel="next"'), /leaves the official/);
});

test("owner Projects REST inventory pages without GraphQL and rejects duplicates", async () => {
	let reads = 0;
	const a = "https://api.github.com/users/marius-patrik/projectsV2?per_page=100";
	const b = a + "&after=123";
	const fetcher = async (url, options) => {
		reads++;
		assert.equal(options.headers["X-GitHub-Api-Version"], "2026-03-10");
		assert.equal(options.headers.Authorization, "Bearer example");
		assert.equal(url, reads === 1 ? a : b);
		return {
			ok: true,
			json: async () => (reads === 1 ? [{ title: "DarkFactory", number: 4 }] : [{ title: "Global", number: 3 }]),
			headers: { get: () => (reads === 1 ? "<" + b + '>; rel="next"' : null) },
		};
	};
	const projects = await readProjectsRest("marius-patrik", "example", fetcher);
	assert.equal(projects.get("Global").number, 3);
	assert.equal(projects.get("DarkFactory").number, 4);
	assert.equal(reads, 2);
	assert.deepEqual(EXPECTED_SELF_PROJECTS, ["DarkFactory", "Global"]);
	await assert.rejects(readProjectsRest("marius-patrik", ""), /classic project-scoped/);
});

test("self-hosted selection ignores unrelated duplicate Project titles, not managed duplicates", async () => {
	const url = "https://api.github.com/users/marius-patrik/projectsV2?per_page=100";
	const page = (entries) => async (request) => {
		assert.equal(request, url);
		return {
			ok: true,
			json: async () => entries,
			headers: { get: () => null },
		};
	};
	const inventory = [
		{ title: "Features", number: 1 },
		{ title: "Features", number: 2 },
		{ title: "Global", number: 3, node_id: "PVT_G" },
		{ title: "DarkFactory", number: 4, node_id: "PVT_D" },
	];
	const managed = await readProjectsRest("marius-patrik", "example", page(inventory), EXPECTED_SELF_PROJECTS);
	assert.deepEqual([...managed.keys()], ["Global", "DarkFactory"]);
	await assert.rejects(
		readProjectsRest(
			"marius-patrik",
			"example",
			page([...inventory, { title: "Global", number: 5, node_id: "PVT_DUP" }]),
			EXPECTED_SELF_PROJECTS,
		),
		/Ambiguous duplicate owner Project: Global/,
	);
});

test("closed Projects are ignored before duplicate-title checks, including closed managed boards", async () => {
	const requestUrl = "https://api.github.com/users/marius-patrik/projectsV2?per_page=100";
	const fetcher = async (url) => {
		assert.equal(url, requestUrl);
		return {
			ok: true,
			json: async () => [
				{ title: "Features", number: 1, state: "closed", closed_at: "2026-01-01T00:00:00Z" },
				{ title: "Features", number: 2, state: "closed" },
				{ title: "Global", number: 3, state: "closed" },
				{ title: "Global", number: 4, state: "open", closed_at: null, node_id: "PVT_OPEN_GLOBAL" },
				{ title: "DarkFactory", number: 5, state: "open", node_id: "PVT_OPEN_DF" },
			],
			headers: { get: () => null },
		};
	};
	const selected = await readProjectsRest("marius-patrik", "example", fetcher, EXPECTED_SELF_PROJECTS);
	assert.deepEqual([...selected.keys()], ["Global", "DarkFactory"]);
	assert.equal(selected.get("Global").number, 4);
	assert.equal(selected.get("Global").closed, false);
});

test("closed-only managed projects are absent from active REST inventory", async () => {
	const selected = await readProjectsRest(
		"marius-patrik",
		"example",
		async () => ({
			ok: true,
			json: async () => [
				{ title: "Global", number: 3, state: "closed" },
				{ title: "DarkFactory", number: 4, closed_at: "2026-01-01T00:00:00Z" },
			],
			headers: { get: () => null },
		}),
		EXPECTED_SELF_PROJECTS,
	);
	assert.equal(selected.size, 0);
});
