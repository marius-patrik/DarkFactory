import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pipeline-source.ts";

/** The Nix Agent Image workflow validates the actual container on both architectures. */
describe("production agent image", () => {
  test("the production image is built by Nix rather than Dockerfile", () => {
    const workflow = readFileSync(join(repoRoot, ".github/workflows/agent.yml"), "utf8");
    expect(workflow).toContain("nix build");
    expect(workflow).toContain("docker load -i");
    expect(workflow).toContain("darkfactory-agent:nix dispatch");
    expect(workflow).not.toContain("docker build");
    expect(workflow).not.toContain("Dockerfile.agent");
  });

  test("the Nix runtime launches the canonical CLI under a D-Bus session as uid 1001", () => {
    const agent = readFileSync(join(repoRoot, "nix/agent.nix"), "utf8");
    expect(agent).toContain("packages/cli/src/cli.ts");
    expect(agent).toContain("dbus-run-session");
    expect(agent).toContain('User = "1001:1001"');
    expect(agent).toContain('WorkingDir = "/workspace"');
  });
});
