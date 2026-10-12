import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTROL_CONFIG, CONTROL_RECEIPT, CONTROL_WORKFLOW } from "./fleet-control.mjs";

export async function verifySelfInstallation(root) {
  const expected = [CONTROL_CONFIG, CONTROL_RECEIPT, CONTROL_WORKFLOW].sort();
  async function walk(dir, prefix = "") {
    const entries = await readdir(dir, { withFileTypes: true });
    const paths = [];
    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const path = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.isDirectory()) paths.push(...await walk(join(dir, entry.name), path));
      else paths.push(path);
    }
    return paths;
  }
  assert.deepEqual((await walk(root)).sort(), expected, "darkfactory must contain only its three managed files");
  const receipt = JSON.parse(await readFile(join(root, CONTROL_RECEIPT), "utf8"));
  const configText = await readFile(join(root, CONTROL_CONFIG), "utf8");
  const workflowText = await readFile(join(root, CONTROL_WORKFLOW), "utf8");
  assert.equal(receipt.managedBy, "DarkFactory");
  assert.equal(receipt.schema, 2);
  assert.equal(receipt.slug, "marius-patrik/DarkFactory");
  assert.equal(receipt.sourceBranch, "main");
  for (const [path, value] of [[CONTROL_CONFIG, configText], [CONTROL_WORKFLOW, workflowText]]) {
    assert.equal(receipt.fileHashes[path], createHash("sha256").update(value).digest("hex"), path + " hash mismatch");
  }
  const config = JSON.parse(configText);
  assert.equal(config.repo.identity.repo, "DarkFactory");
  assert.equal(config.repo.identity.owner, "marius-patrik");
  assert.deepEqual(config.repo.upstream, { repo: null, ref: null });
  assert.deepEqual(config.repo.board, { global: "Global", boards: ["Global", "DarkFactory"] });
  assert.ok(config.repo.app?.app_id, "self-hosted App identity must survive migration");
  assert.ok(config.repo.release, "release policy must survive migration");
  assert.ok(config.docs, "docs configuration must survive migration");
  assert.ok(config.providers, "provider configuration must survive migration");
  assert.match(workflowText, /^# df-control-managed: 1/m);
  assert.match(workflowText, /\bworkflow_call:/);
  assert.match(workflowText, /\bexecute-quality:/);
  assert.match(workflowText, /\breleased-df-quality/);
  assert.match(workflowText, /\bdarkfactory-managed\/repo.dfconfig/);
  assert.match(workflowText, /\.github\/workflows\/agent.yml@[0-9a-f]{40}/);
  assert.match(workflowText, /\.github\/workflows\/pr-approval-automerge.yml@[0-9a-f]{40}/);
  assert.match(workflowText, /\.github\/workflows\/verify-pr-issue.yml@[0-9a-f]{40}/);
  assert.match(workflowText, /sha256sum --check/);
  assert.match(receipt.release.tag, /^v[0-9]/);
  assert.match(receipt.release.sha, /^[a-f0-9]{40}$/);
  console.log("DarkFactory self-install receipt, isolated tree, board policy, release and executable workflows verified:", receipt.release.tag);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifySelfInstallation(process.argv[2] || ".darkfactory-managed").catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
