import { test } from "node:test";
import assert from "node:assert/strict";
import {
	BRIDGE_MARKER,
	CONTROL_CONFIG,
	CONTROL_RECEIPT,
	CONTROL_WORKFLOW,
	DEFAULT_BRIDGE,
	controlFiles,
	digestOf,
	inspectManaged,
	readLegacyControl,
	renderControlConfig,
	renderControlWorkflow,
	renderDefaultBridge,
	renderLegacyDefaultBridge,
	retireLegacyControl,
	retireLegacyReleaseBranches,
	verifyControlReceipt,
	verifyRelease,
} from "./fleet-control.mjs";

const release = { tag: "v0.290.0", sha: "a".repeat(40), digest: "b".repeat(64) };
const slug = "marius-patrik/OASIS";

test("the event bridge only calls the same-commit local workflow on main", () => {
	const bridge = renderDefaultBridge(slug);
	assert.ok(bridge.startsWith(BRIDGE_MARKER));
	assert.match(bridge, /uses: \.\/\.github\/workflows\/darkfactory-control\.yml/);
	assert.doesNotMatch(bridge, /@darkfactory|ref: darkfactory|\.darkfactory-managed/);
	assert.match(bridge, / {2}issues:/);
	assert.match(bridge, / {2}pull_request:/);
	assert.match(bridge, / {2}schedule:/);
	assert.match(bridge, / {2}workflow_dispatch:/);
	assert.doesNotMatch(bridge, /curl |ci matrix|ci quality/);
	const legacy = renderLegacyDefaultBridge(slug);
	assert.match(legacy, /@darkfactory/);
	assert.notEqual(legacy, bridge);
});

test("control workflow uses main checkout, released quality and immutable governance refs", () => {
	const rendered = renderControlWorkflow(slug, release);
	assert.match(rendered, /sha256sum --check/);
	assert.match(rendered, / ci matrix --repo /);
	assert.match(rendered, /Run detected quality action/);
	assert.match(rendered, /needs: \[detect, execute-quality\]/);
	assert.match(rendered, /agent\.yml@a{40}/);
	assert.match(rendered, /verify-pr-issue\.yml@a{40}/);
	assert.match(rendered, /pr-approval-automerge\.yml@a{40}/);
	assert.doesNotMatch(rendered, /ref: darkfactory|\.darkfactory-managed/);
	assert.match(rendered, /name: Install inferred Python quality tooling/);
	assert.match(rendered, /python -m pip install pytest/);
	assert.match(rendered, /python -m pip install black/);
	assert.match(rendered, /DF_ACTION_COMMAND/);
	assert.match(rendered, /npm install --no-package-lock/);
	assert.ok(rendered.includes("node_modules/.bin"));
	assert.match(rendered, /! -f package-lock.json/);
	const workflow = Bun.YAML.parse(rendered);
	const bridge = Bun.YAML.parse(renderDefaultBridge(slug));
	assert.ok(Object.hasOwn(workflow.on, "workflow_call"));
	assert.deepEqual(Object.keys(workflow.jobs).sort(), [
		"agent",
		"approvals",
		"detect",
		"execute-quality",
		"issue-binding",
		"quality",
	]);
	assert.equal(bridge.jobs.governed.uses, "./.github/workflows/darkfactory-control.yml");
	assert.ok(workflow.jobs.detect.steps.every((step) => step.with?.ref !== "darkfactory"));
	assert.ok(workflow.jobs["execute-quality"].steps.every((step) => step.with?.ref !== "darkfactory"));
});

test("generated manifest keeps caller's other domains and scopes the boards", () => {
	const full = {
		repo: {
			identity: { owner: "marius-patrik", repo: "OASIS", agent_slug: "agent-1" },
			protection: { lanes: [{ branch: "main" }] },
			app: { app_id: 1234 },
		},
		docs: { home: "README.md" },
		providers: { default: "example" },
	};
	const config = JSON.parse(
		renderControlConfig(slug, "main", release, "marius-patrik/DarkFactory", JSON.stringify(full)),
	);
	assert.equal(config.repo.identity.agent_slug, "agent-1");
	assert.deepEqual(config.repo.board, { global: "Global", boards: ["Global", "OASIS"] });
	assert.equal(config.repo.upstream.ref, release.sha);
	assert.deepEqual(config.repo.protection, full.repo.protection);
	assert.deepEqual(config.docs, full.docs);
	assert.deepEqual(config.providers, full.providers);
});

test("receipt validates owner, SHA-256 bytes and canonical source branch", () => {
	const files = controlFiles(slug, "main", release, "marius-patrik/DarkFactory");
	const receipt = JSON.parse(files[CONTROL_RECEIPT]);
	assert.equal(receipt.schema, 2);
	assert.equal(receipt.fileHashes[CONTROL_CONFIG], digestOf(files[CONTROL_CONFIG]));
	assert.equal(receipt.fileHashes[CONTROL_WORKFLOW], digestOf(files[CONTROL_WORKFLOW]));
	assert.equal(
		verifyControlReceipt(files[CONTROL_RECEIPT], files[CONTROL_CONFIG], files[CONTROL_WORKFLOW], slug, "main").slug,
		slug,
	);
	assert.throws(
		() =>
			verifyControlReceipt(files[CONTROL_RECEIPT], files[CONTROL_CONFIG] + "\n", files[CONTROL_WORKFLOW], slug, "main"),
		/modified or missing/,
	);
	assert.throws(
		() =>
			verifyControlReceipt(
				files[CONTROL_RECEIPT],
				files[CONTROL_CONFIG],
				files[CONTROL_WORKFLOW],
				"other/name",
				"main",
			),
		/mismatch/,
	);
});

function legacyFixture(extraPath = null, changedReceipt = false) {
	const files = controlFiles(slug, "main", release, "marius-patrik/DarkFactory");
	if (changedReceipt) files[CONTROL_CONFIG] += "# tampered\n";
	const requests = [];
	async function api(method, path, _token, body, optional) {
		requests.push({ method, path, body, optional });
		if (method === "GET" && path.endsWith("/git/ref/heads/darkfactory")) return { object: { sha: "c".repeat(40) } };
		if (method === "GET" && path.includes("/git/commits/")) return { tree: { sha: "d".repeat(40) } };
		if (method === "GET" && path.includes("/git/trees/"))
			return {
				truncated: false,
				tree: Object.keys(files)
					.concat(extraPath ? [extraPath] : [])
					.map((key) => ({ path: key, type: "blob" })),
			};
		if (method === "GET" && path.includes("/contents/")) {
			const filename = path.split("/contents/")[1].split("?")[0];
			return { type: "file", encoding: "base64", content: Buffer.from(files[filename]).toString("base64") };
		}
		if (method === "GET" && path.includes("/pulls?state=open")) return [];
		if (method === "DELETE" && path.endsWith("/git/refs/heads/darkfactory")) return null;
		throw new Error("Unexpected request: " + method + " " + path);
	}
	return { files, api, requests };
}

test("old control branch is read without modifying refs, and extra files refuse migration", async () => {
	const fixture = legacyFixture();
	const state = await readLegacyControl({ slug, sourceBranch: "main", token: "test", api: fixture.api });
	assert.equal(state.files[CONTROL_CONFIG], fixture.files[CONTROL_CONFIG]);
	assert.equal(fixture.requests.filter((call) => call.method !== "GET").length, 0);
	const extra = legacyFixture("README.md");
	await assert.rejects(
		readLegacyControl({ slug, sourceBranch: "main", token: "test", api: extra.api }),
		/unowned paths/,
	);
	const tampered = legacyFixture(null, true);
	await assert.rejects(
		readLegacyControl({ slug, sourceBranch: "main", token: "test", api: tampered.api }),
		/modified or missing/,
	);
});

test("delete old control only after matching sealed main, with no reviews and unchanged ref", async () => {
	const fixture = legacyFixture();
	const legacy = await readLegacyControl({ slug, sourceBranch: "main", token: "test", api: fixture.api });
	const same = {
		...controlFiles(slug, "main", release, "marius-patrik/DarkFactory", fixture.files[CONTROL_CONFIG]),
		[DEFAULT_BRIDGE]: renderDefaultBridge(slug),
	};
	const result = await retireLegacyControl({
		slug,
		sourceBranch: "main",
		upstream: "marius-patrik/DarkFactory",
		token: "test",
		api: fixture.api,
		mainFiles: same,
		legacy,
	});
	assert.equal(result, "retired");
	assert.equal(fixture.requests.filter((call) => call.method === "DELETE").length, 1);
	const other = legacyFixture();
	const old = await readLegacyControl({ slug, sourceBranch: "main", token: "test", api: other.api });
	const retained = await retireLegacyControl({
		slug,
		sourceBranch: "main",
		upstream: "marius-patrik/DarkFactory",
		token: "test",
		api: other.api,
		mainFiles: { ...same, [DEFAULT_BRIDGE]: "edited" },
		legacy: old,
	});
	assert.match(retained, /retained/);
	assert.equal(other.requests.filter((call) => call.method === "DELETE").length, 0);
});

test("user customization, alternate upstream or invalid release is never silently overwritten", () => {
	const old = renderDefaultBridge(slug);
	assert.equal(inspectManaged(null, old, BRIDGE_MARKER).kind, "create");
	assert.equal(inspectManaged(old + "# custom\n", old, BRIDGE_MARKER).kind, "review");
	assert.equal(inspectManaged("name: User custom\n", old, BRIDGE_MARKER).kind, "conflict");
	assert.throws(() => verifyRelease({ ...release, sha: "main" }), /Invalid pinned release/);
	assert.throws(() => renderControlConfig("bad", "main", release), /Invalid repository slug/);
});

test("legacy release cleanup refuses unowned and open refs and deletes only verified closed machine changes", async () => {
	const calls = [];
	const good = { ref: "refs/heads/darkfactory/release-v0.288.1", object: { sha: "1".repeat(40) } };
	const open = { ref: "refs/heads/darkfactory/release-v0.288.0", object: { sha: "2".repeat(40) } };
	const unknown = { ref: "refs/heads/darkfactory/experiment", object: { sha: "3".repeat(40) } };
	async function api(method, path) {
		calls.push([method, path]);
		if (path.endsWith("/matching-refs/heads/darkfactory/")) return [good, open, unknown];
		if (path.includes("/pulls?state=all&head=") && path.includes("v0.288.1")) {
			return [{ number: 21, state: "closed", head: { sha: good.object.sha } }];
		}
		if (path.includes("/pulls?state=all&head=") && path.includes("v0.288.0")) {
			return [{ number: 18, state: "open", head: { sha: open.object.sha } }];
		}
		if (path.endsWith("/pulls/21/files?per_page=100")) return [{ filename: "repo.dfconfig" }];
		if (path.endsWith("/git/ref/heads/darkfactory/release-v0.288.1")) return { object: { sha: good.object.sha } };
		if (method === "DELETE" && path.endsWith("darkfactory/release-v0.288.1")) return null;
		throw Error("unexpected " + method + " " + path);
	}
	const result = await retireLegacyReleaseBranches({ slug, token: "token", api });
	assert.deepEqual(
		result.map((x) => x.disposition),
		["retired", "retained: unreviewed or still open"],
	);
	assert.equal(calls.filter(([method]) => method === "DELETE").length, 1);
	assert.ok(!calls.some(([, path]) => path.endsWith("/experiment")));
});
