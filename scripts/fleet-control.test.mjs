import { test } from "node:test";
import assert from "node:assert/strict";
import {
	BRIDGE_MARKER,
	CONTROL_BRANCH,
	CONTROL_MARKER,
	CONTROL_WORKFLOW,
	DEFAULT_BRIDGE,
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
	assert.match(c, / ci quality --repo /);
	assert.doesNotMatch(c, / ci matrix --repo /);
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
