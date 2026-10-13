import { test } from "node:test";
import assert from "node:assert/strict";
import {
	inspectConfig,
	inspectWorkflow,
	mergeConfigSources,
	planMainInstallation,
	retireMergedProposalRef,
	refreshPendingInstallation,
	isFleetExcluded,
	renderConfig,
	renderLegacyWorkflow,
	renderWorkflow,
} from "./fleet-sync.mjs";
import {
	CONTROL_CONFIG,
	CONTROL_RECEIPT,
	SUBMODULE_CONTROL_RECEIPT,
	CONTROL_WORKFLOW,
	DEFAULT_BRIDGE,
	controlFiles,
	renderDefaultBridge,
	renderLegacyDefaultBridge,
} from "./fleet-control.mjs";

const old = {
	tag: "v0.3.2",
	sha: "a".repeat(40),
	digest: "b".repeat(64),
};
const next = {
	tag: "v0.3.3",
	sha: "c".repeat(40),
	digest: "d".repeat(64),
};
const slug = "marius-patrik/example";

test("initial integration is additive and pinned to the released binary checksum", () => {
	const result = inspectWorkflow(null, next);
	assert.equal(result.kind, "create");
	assert.match(result.content, /name: DarkFactory Runtime/);
	assert.match(result.content, /sha256sum --check -/);
	assert.match(result.content, /ci matrix --repo/);
	assert.match(result.content, /df-linux-x64\.tar\.gz/);
	assert.match(result.content, /official capabilities/);
	assert.doesNotMatch(result.content, /secrets:/);
});
test("an unchanged fleet-managed workflow updates deterministically", () => {
	const previous = renderWorkflow(old);
	const result = inspectWorkflow(previous, next);
	assert.equal(result.kind, "update");
	assert.equal(result.content, renderWorkflow(next));
	assert.equal(inspectWorkflow(result.content, next).kind, "current");
});
test("migrates untouched v1 workflows but refuses customized legacy workflows", () => {
	const prior = renderLegacyWorkflow(old);
	const migrated = inspectWorkflow(prior, next);
	assert.equal(migrated.kind, "update");
	assert.equal(migrated.content, renderWorkflow(next));
	assert.equal(inspectWorkflow(prior + "# user-owned edit\\n", next).kind, "conflict");
});

test("unmanaged or customized project workflow is never overwritten", () => {
	assert.equal(inspectWorkflow("name: My custom setup\n", next).kind, "conflict");
	assert.equal(inspectWorkflow(renderWorkflow(old) + "# my change\n", next).kind, "conflict");
	assert.equal(inspectWorkflow(renderWorkflow(old).replace("ci matrix", "ci quality"), next).kind, "conflict");
});
test("config is created only when missing; arbitrary user fields are preserved", () => {
	assert.equal(inspectConfig(null, slug, "develop", next.sha).kind, "create");
	const current = JSON.parse(renderConfig(slug, "develop", next.sha));
	current.repo.protection = { lanes: [{ branch: "develop" }] };
	assert.equal(inspectConfig(JSON.stringify(current), slug, "develop", next.sha).kind, "preserve");
});
test("fleet-owned config repins; noncanonical upstream is a user decision", () => {
	const existing = renderConfig(slug, "main", old.sha);
	const result = inspectConfig(existing, slug, "main", next.sha);
	assert.equal(result.kind, "update");
	assert.equal(result.content, renderConfig(slug, "main", next.sha));
	const fork = JSON.parse(existing);
	fork.repo.upstream.repo = "other-owner/other-pipeline";
	assert.equal(inspectConfig(JSON.stringify(fork), slug, "main", next.sha).kind, "preserve");
});
test("invalid or unverified releases fail closed", () => {
	assert.throws(() => renderWorkflow({ ...next, digest: "bad" }), /Invalid stable release/);
	assert.throws(() => renderWorkflow({ ...next, tag: "main" }), /Invalid stable release/);
});

test("release updater permanently excludes old and Agent OS repositories without skipping active code or data", () => {
	for (const name of [
		"marius-patrik/andromeda-old-2",
		"marius-patrik/Andromeda-OLD",
		"marius-patrik/ams-old",
		"marius-patrik/genesis-old",
		"marius-patrik/paes-old",
		"marius-patrik/data-agents-os",
		"marius-patrik/agent-os",
	])
		assert.equal(isFleetExcluded(name), true, name);
	for (const name of [
		"marius-patrik/DarkFactory",
		"marius-patrik/dsh-stack",
		"marius-patrik/data-gemini",
		"marius-patrik/data-agents",
		"marius-patrik/OASIS",
		"marius-patrik/SkyAgent",
	])
		assert.equal(isFleetExcluded(name), false, name);
});

test("fresh consumer install proposes all four managed files on its default branch", () => {
	const plan = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles: {},
		legacy: null,
	});
	assert.deepEqual(plan.conflicts, []);
	assert.deepEqual(
		plan.changes.map((x) => x.path).sort(),
		[CONTROL_CONFIG, CONTROL_RECEIPT, CONTROL_WORKFLOW, DEFAULT_BRIDGE].sort(),
	);
	assert.ok(
		plan.changes.some(
			(x) => x.path === DEFAULT_BRIDGE && x.content.includes("uses: ./.github/workflows/darkfactory-control.yml"),
		),
	);
	assert.ok(plan.changes.every((x) => !x.content.includes("@darkfactory")));
});

test("migration replaces only a provably canonical old bridge and imports sealed legacy config", () => {
	const oldFiles = controlFiles(slug, "main", old, "marius-patrik/DarkFactory");
	const legacy = { sha: "e".repeat(40), files: oldFiles };
	const mainFiles = { [DEFAULT_BRIDGE]: { content: renderLegacyDefaultBridge(slug, "main"), sha: "f".repeat(40) } };
	const plan = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles,
		legacy,
	});
	assert.deepEqual(plan.conflicts, []);
	assert.equal(plan.changes.length, 4);
	assert.equal(plan.changes.find((x) => x.path === DEFAULT_BRIDGE).sha, "f".repeat(40));
	const expected = controlFiles(slug, "main", next, "marius-patrik/DarkFactory", oldFiles[CONTROL_CONFIG]);
	assert.equal(plan.changes.find((x) => x.path === CONTROL_CONFIG).content, expected[CONTROL_CONFIG]);
});

test("reinstall is idempotent with valid receipt and no legacy branch", () => {
	const files = controlFiles(slug, "main", next, "marius-patrik/DarkFactory");
	const mainFiles = Object.fromEntries(
		Object.entries({ ...files, [DEFAULT_BRIDGE]: renderDefaultBridge(slug) }).map(([path, content]) => [
			path,
			{ content, sha: "f".repeat(40) },
		]),
	);
	const plan = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles,
		legacy: null,
	});
	assert.deepEqual(plan.changes, []);
	assert.deepEqual(plan.conflicts, []);
});

test("modified receipt, workflow or custom bridge blocks partial install", () => {
	const files = controlFiles(slug, "main", old, "marius-patrik/DarkFactory");
	const previous = Object.fromEntries(
		Object.entries(files).map(([path, content]) => [path, { content, sha: "f".repeat(40) }]),
	);
	const patched = { ...previous, [CONTROL_WORKFLOW]: { content: "name: edited\n", sha: "f".repeat(40) } };
	const plan = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles: patched,
		legacy: null,
	});
	assert.equal(plan.changes.length, 0);
	assert.match(plan.conflicts.join(" "), /modified or missing/);
	const bridge = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles: { [DEFAULT_BRIDGE]: { content: "name: custom\n" } },
		legacy: null,
	});
	assert.equal(bridge.changes.length, 0);
	assert.match(bridge.conflicts.join(" "), /customized or unowned/);
});

test("never produce ambiguous config or replace an alternate selected upstream", () => {
	const alias = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles: { ".dfconfig": { content: "{}\n" } },
		legacy: null,
	});
	assert.equal(alias.changes.length, 0);
	assert.match(alias.conflicts.join(" "), /Alternate root/);
	const conflict = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles: {
			[CONTROL_CONFIG]: { content: JSON.stringify({ repo: { upstream: { repo: "other/repo", ref: old.sha } } }) },
		},
		legacy: null,
	});
	assert.equal(conflict.changes.length, 0);
	assert.match(conflict.conflicts.join(" "), /alternate DarkFactory upstream/);
});

test("merge config sources imports missing branch fields but never overwrites conflicting ones", () => {
	const main = JSON.stringify({ repo: { identity: { repo: "OASIS" }, app: { id: "main" } }, docs: { title: "main" } });
	const branch = JSON.stringify({
		repo: { identity: { repo: "OASIS" }, app: { id: "branch" }, labels: { status: [] } },
		docs: { title: "branch" },
		providers: { defaults: [] },
	});
	const result = mergeConfigSources(main, branch);
	assert.deepEqual(result.conflicts.sort(), ["docs.title", "repo.app.id"]);
	const obj = JSON.parse(result.content);
	assert.equal(obj.repo.app.id, "main");
	assert.ok(obj.repo.labels);
	assert.ok(obj.providers);
});

test("a consumer-owned .darkfactory gitlink installs the receipt in .github without modifying the submodule", () => {
	const result = planMainInstallation({
		slug,
		base: "main",
		release: next,
		upstream: "marius-patrik/DarkFactory",
		mainFiles: {},
		legacy: null,
		receiptPath: SUBMODULE_CONTROL_RECEIPT,
	});
	assert.deepEqual(result.conflicts, []);
	assert.deepEqual(
		result.changes.map((x) => x.path).sort(),
		[CONTROL_CONFIG, SUBMODULE_CONTROL_RECEIPT, CONTROL_WORKFLOW, DEFAULT_BRIDGE].sort(),
	);
	assert.ok(!result.changes.some((x) => x.path.startsWith(".darkfactory/")));
	const receipt = result.changes.find((x) => x.path === SUBMODULE_CONTROL_RECEIPT);
	assert.equal(JSON.parse(receipt.content).fileHashes[CONTROL_CONFIG].length, 64);
});

test("merged installation proposal is safely retired only with exact unchanged SHA", async () => {
	const endpoint = "/repos/marius-patrik/OASIS";
	const branch = "df-main/v0.291.0";
	const sha = "a".repeat(40);
	const requests = [];
	async function api(method, path) {
		requests.push({ method, path });
		if (method === "GET" && path.includes("/pulls?state=all")) {
			return [
				{
					head: { sha },
					merged_at: "2026-10-13T20:00:00Z",
					user: { login: "darkfactory-pipeline[bot]" },
					title: "feat(df): install managed configuration and workflows on main",
				},
			];
		}
		if (method === "GET" && path.endsWith("/git/ref/heads/" + branch)) return { object: { sha } };
		if (method === "DELETE" && path.endsWith("/git/refs/heads/" + branch)) return null;
		throw Error("unexpected " + method + " " + path);
	}
	const outcome = await retireMergedProposalRef({
		api,
		endpoint,
		slug: "marius-patrik/OASIS",
		branch,
		token: "test",
	});
	assert.equal(outcome, "retired");
	assert.equal(requests.filter((x) => x.method === "DELETE").length, 1);
});

test("closed-unmerged installer review cannot be silently deleted", async () => {
	const branch = "df-main/v0.291.0";
	const sha = "f".repeat(40);
	const calls = [];
	async function api(method, path) {
		calls.push(method);
		if (path.includes("/pulls?state=all")) {
			return [
				{
					head: { sha },
					merged_at: null,
					user: { login: "darkfactory-pipeline[bot]" },
					title: "feat(df): install managed configuration and workflows on main",
				},
			];
		}
		if (path.endsWith("/git/ref/heads/" + branch)) return { object: { sha } };
		throw Error("unapproved mutation");
	}
	const outcome = await retireMergedProposalRef({
		api,
		endpoint: "/repos/marius-patrik/OASIS",
		slug: "marius-patrik/OASIS",
		branch,
		token: "test",
	});
	assert.match(outcome, /retained/);
	assert.ok(!calls.includes("DELETE"));
});

test("repin the only verified installer review from latest default branch without changing user files", async () => {
	const slug = "marius-patrik/OASIS",
		branch = "df-main/v0.291.0";
	const oldSHA = "a".repeat(40),
		mainSHA = "b".repeat(40);
	const calls = [];
	const pending = {
		state: "open",
		number: 42,
		head: { ref: branch, sha: oldSHA, repo: { full_name: slug } },
		base: { ref: "main" },
		user: { login: "darkfactory-pipeline[bot]" },
	};
	async function api(method, path, _token, data) {
		calls.push({ method, path, data });
		if (method === "GET" && path.endsWith("/pulls/42/files?per_page=100"))
			return [{ filename: CONTROL_CONFIG }, { filename: CONTROL_WORKFLOW }];
		if (method === "GET" && path.endsWith("/git/ref/heads/" + branch)) return { object: { sha: oldSHA } };
		if (method === "GET" && path.endsWith("/contents/repo.dfconfig?ref=" + encodeURIComponent(branch)))
			return { type: "file", encoding: "base64", content: Buffer.from("old").toString("base64") };
		if (method === "GET" && path.endsWith("/git/ref/heads/main")) return { object: { sha: mainSHA } };
		if (method === "GET" && path.endsWith("/git/commits/" + oldSHA)) return { parents: [{ sha: "z".repeat(40) }] };
		if (method === "GET" && path.endsWith("/git/commits/" + mainSHA)) return { tree: { sha: "c".repeat(40) } };
		if (method === "POST" && path.endsWith("/git/trees")) return { sha: "d".repeat(40) };
		if (method === "POST" && path.endsWith("/git/commits")) return { sha: "e".repeat(40) };
		if (method === "PATCH" && path.endsWith("/git/refs/heads/" + branch)) return {};
		throw Error("Unexpected API " + method + " " + path);
	}
	const result = await refreshPendingInstallation({
		slug,
		base: "main",
		pending,
		changes: [{ path: CONTROL_CONFIG, content: "new" }],
		release: next,
		token: "token",
		api,
	});
	assert.equal(result.kind, "updated");
	assert.deepEqual(calls.find((x) => x.method === "POST" && x.path.endsWith("/git/commits")).data.parents, [oldSHA, mainSHA]);
	assert.equal(calls.find((x) => x.method === "POST" && x.path.endsWith("/git/trees")).data.base_tree, "c".repeat(40));
	assert.ok(calls.some((x) => x.method === "PATCH" && x.data.force === false));
});

test("repinning never replaces a PR containing unrelated edits", async () => {
	const slug = "marius-patrik/OASIS";
	const pending = {
		state: "open",
		number: 42,
		head: { ref: "df-main/v0.291.0", sha: "a".repeat(40), repo: { full_name: slug } },
		base: { ref: "main" },
		user: { login: "darkfactory-pipeline[bot]" },
	};
	const calls = [];
	async function api(method) {
		calls.push(method);
		return [{ filename: "README.md" }, { filename: CONTROL_CONFIG }];
	}
	await assert.rejects(
		refreshPendingInstallation({
			slug,
			base: "main",
			pending,
			changes: [{ path: CONTROL_CONFIG, content: "new" }],
			release: next,
			token: "token",
			api,
		}),
		/unowned edits/,
	);
	assert.deepEqual(calls, ["GET"]);
});
