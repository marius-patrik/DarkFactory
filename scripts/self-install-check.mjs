import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTROL_CONFIG, CONTROL_RECEIPT, CONTROL_WORKFLOW } from "./fleet-control.mjs";

export async function verifySelfInstallation(root) {
	const receipt = JSON.parse(await readFile(join(root, CONTROL_RECEIPT), "utf8"));
	const configText = await readFile(join(root, CONTROL_CONFIG), "utf8");
	const workflowText = await readFile(join(root, CONTROL_WORKFLOW), "utf8");
	const selfWorkflow = await readFile(join(root, ".github/workflows/darkfactory-self.yml"), "utf8");

	assert.equal(receipt.managedBy, "DarkFactory");
	assert.equal(receipt.schema, 2);
	assert.equal(receipt.slug, "marius-patrik/DarkFactory");
	assert.equal(receipt.sourceBranch, "main");
	for (const [path, value] of [
		[CONTROL_CONFIG, configText],
		[CONTROL_WORKFLOW, workflowText],
	]) {
		assert.equal(receipt.fileHashes[path], createHash("sha256").update(value).digest("hex"), path + " hash mismatch");
	}
	const config = JSON.parse(configText);
	assert.equal(config.repo.identity.repo, "DarkFactory");
	assert.equal(config.repo.identity.owner, "marius-patrik");
	assert.deepEqual(config.repo.upstream, { repo: null, ref: null });
	assert.deepEqual(config.repo.board, { global: "Global", boards: ["Global", "DarkFactory"] });
	assert.ok(config.repo.app?.app_id, "self-hosted App identity must be present");
	assert.ok(config.repo.release, "release policy must be present");
	assert.ok(config.docs, "docs configuration must be present");
	assert.ok(config.providers, "provider configuration must be present");
	assert.match(workflowText, /^# df-control-managed: 1/m);
	assert.match(workflowText, /\bworkflow_call:/);
	assert.match(workflowText, /\bexecute-quality:/);
	assert.match(workflowText, /\breleased-df-quality/);
	assert.doesNotMatch(workflowText, /darkfactory-managed|ref: darkfactory/);
	assert.match(workflowText, /\.github\/workflows\/agent.yml@[0-9a-f]{40}/);
	assert.match(workflowText, /\.github\/workflows\/pr-approval-automerge.yml@[0-9a-f]{40}/);
	assert.match(workflowText, /\.github\/workflows\/verify-pr-issue.yml@[0-9a-f]{40}/);
	assert.match(workflowText, /sha256sum --check/);
	assert.match(selfWorkflow, /uses: \.\/\.github\/workflows\/darkfactory-control.yml/);
	assert.doesNotMatch(selfWorkflow, /@darkfactory|ref: darkfactory/);
	assert.match(receipt.release.tag, /^v[0-9]/);
	assert.match(receipt.release.sha, /^[a-f0-9]{40}$/);
	console.log("DarkFactory self-installation on main verified:", receipt.release.tag);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	verifySelfInstallation(process.argv[2] || ".").catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
