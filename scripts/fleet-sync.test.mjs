import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectConfig, inspectWorkflow, renderConfig, renderWorkflow } from "./fleet-sync.mjs";

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
  assert.doesNotMatch(result.content, /secrets:/);
});
test("an unchanged fleet-managed workflow updates deterministically", () => {
  const previous = renderWorkflow(old);
  const result = inspectWorkflow(previous, next);
  assert.equal(result.kind, "update");
  assert.equal(result.content, renderWorkflow(next));
  assert.equal(inspectWorkflow(result.content, next).kind, "current");
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
