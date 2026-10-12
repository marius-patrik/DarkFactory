import { test } from "node:test";
import assert from "node:assert/strict";
import {
	BRIDGE_MARKER,
	CONTROL_BRANCH,
	CONTROL_MARKER,
	CONTROL_WORKFLOW,
	DEFAULT_BRIDGE,
	controlFiles,
	reconcileControlBranch,
	digestOf,
	inspectManaged,
	renderControlConfig,
	renderControlWorkflow,
	renderDefaultBridge,
	verifyRelease,
} from "./fleet-control.mjs";

const release = { tag: "v0.288.1", sha: "a".repeat(40), digest: "b".repeat(64) };

test("separate control branch and one default branch Actions event bridge", () => {
	assert.equal(CONTROL_BRANCH, "darkfactory");
	assert.equal(CONTROL_WORKFLOW, ".github/workflows/darkfactory-control.yml");
	assert.equal(DEFAULT_BRIDGE, ".github/workflows/darkfactory.yml");
	const bridge = renderDefaultBridge("marius-patrik/data-gemini");
	assert.ok(bridge.startsWith(BRIDGE_MARKER));
	assert.match(bridge, /uses: marius-patrik\/data-gemini\/\.github\/workflows\/darkfactory-control\.yml@darkfactory/);
	assert.match(bridge, /  issues:/);
	assert.match(bridge, /  pull_request:/);
	assert.match(bridge, /  schedule:/);
	assert.match(bridge, /  workflow_dispatch:/);
	assert.doesNotMatch(bridge, /curl |ci matrix|ci quality|repo\.dfconfig/);
});

test("control manifest contains scoped project and single common Global project", () => {
	const config = JSON.parse(renderControlConfig("marius-patrik/Omnis", "main", release));
	assert.deepEqual(config.repo.board, { global: "Global", boards: ["Global", "Omnis"] });
	assert.equal(config.repo.identity.default_branch, "main");
	assert.equal(config.repo.upstream.ref, release.sha);
});

test("controller executes real released quality and pinned governance jobs", () => {
	const c = renderControlWorkflow("marius-patrik/Omnis", release);
	assert.ok(c.startsWith(CONTROL_MARKER));
	assert.match(c, /sha256sum --check/);
	assert.match(c, / ci matrix --repo /);
	assert.match(c, /name: Run detected quality action/);
	assert.match(c, /needs: \[detect, execute-quality\]/);
	assert.match(c, /has-actions:/);
	assert.match(c, /agent\.yml@a{40}/);
	assert.match(c, /verify-pr-issue\.yml@a{40}/);
	assert.match(c, /pr-approval-automerge\.yml@a{40}/);
});

test("modified and unmanaged managed files are not silently overwritten", () => {
	const old = renderDefaultBridge("marius-patrik/Omnis");
	assert.equal(inspectManaged(null, old, BRIDGE_MARKER).kind, "create");
	assert.equal(inspectManaged(old, old, BRIDGE_MARKER).kind, "current");
	assert.equal(inspectManaged(old + "# edited\n", old, BRIDGE_MARKER).kind, "review");
	assert.equal(inspectManaged("name: Custom\n", old, BRIDGE_MARKER).kind, "conflict");
});

test("invalid release metadata is never installed", () => {
	assert.throws(() => verifyRelease({ ...release, sha: "main" }), /Invalid pinned release/);
	assert.throws(() => renderControlConfig("bad", "main", release), /Invalid repository slug/);
	assert.throws(
		() => renderControlWorkflow("marius-patrik/OASIS", { ...release, digest: "unknown" }),
		/Invalid pinned release/,
	);
});

test("generated management workflows are valid YAML and execute only pinned control", () => {
	const workflow = Bun.YAML.parse(renderControlWorkflow("marius-patrik/OASIS", release));
	const bridge = Bun.YAML.parse(renderDefaultBridge("marius-patrik/OASIS", "main"));
	assert.ok(workflow.on.workflow_call);
	assert.deepEqual(Object.keys(workflow.jobs).sort(), [
		"agent", "approvals", "detect", "execute-quality", "issue-binding", "quality",
	]);
	assert.ok(bridge.on.issues);
	assert.ok(bridge.on.schedule);
	assert.equal(bridge.jobs.governed.uses, "marius-patrik/OASIS/.github/workflows/darkfactory-control.yml@darkfactory");
	assert.ok(workflow.jobs.detect.steps.some((step) => step.with?.ref === "darkfactory"));
	assert.ok(workflow.jobs["execute-quality"].steps.some((step) => step.with?.ref === "darkfactory"));
	assert.match(renderControlWorkflow("marius-patrik/OASIS", release), /ci matrix --repo/);
	assert.match(renderControlWorkflow("marius-patrik/OASIS", release), /DF_ACTION_COMMAND/);
});

test("initial controller install creates a source-free tree, never modifies main", async () => {
	const requests = [];
	const release = { tag: "v0.288.1", sha: "a".repeat(40), digest: "b".repeat(64) };
	async function api(method, path, _token, data) {
		requests.push({ method, path, data });
		if (method === "GET" && path.endsWith("/git/ref/heads/darkfactory")) return null;
		if (method === "GET" && path.includes("/git/matching-refs/")) return [];
		if (method === "GET" && path.endsWith("/git/ref/heads/main")) return { object: { sha: "c".repeat(40) } };
		if (method === "POST" && path.endsWith("/git/trees")) return { sha: "d".repeat(40) };
		if (method === "POST" && path.endsWith("/git/commits")) return { sha: "e".repeat(40) };
		if (method === "POST" && path.endsWith("/git/refs")) return {};
		throw new Error("Unexpected API invocation: " + method + " " + path);
	}
	const outcome = await reconcileControlBranch({
		slug: "marius-patrik/data-gemini",
		sourceBranch: "main",
		release,
		token: "fake",
		api,
		upstream: "marius-patrik/DarkFactory",
	});
	assert.equal(outcome.kind, "created");
	const tree = requests.find((call) => call.method === "POST" && call.path.endsWith("/git/trees"));
	assert.deepEqual(tree.data.tree.map((file) => file.path).sort(), [
		".darkfactory/installation.json",
		".github/workflows/darkfactory-control.yml",
		"repo.dfconfig",
	]);
	assert.equal(tree.data.base_tree, undefined, "never import user source files into the control branch");
	const commit = requests.find((call) => call.method === "POST" && call.path.endsWith("/git/commits"));
	assert.deepEqual(commit.data.parents, ["c".repeat(40)]);
	assert.ok(!requests.some((call) => call.method === "PATCH" || call.method === "DELETE"));
});

test("receipt hashes pin installed source independently of future renderer versions", () => {
	const files = controlFiles("marius-patrik/Omnis", "main", release, "marius-patrik/DarkFactory");
	const receipt = JSON.parse(files[".darkfactory/installation.json"]);
	assert.equal(receipt.schema, 2);
	assert.equal(receipt.fileHashes["repo.dfconfig"], digestOf(files["repo.dfconfig"]));
	assert.equal(
		receipt.fileHashes[".github/workflows/darkfactory-control.yml"],
		digestOf(files[".github/workflows/darkfactory-control.yml"]),
	);
});
