import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pipeline-source.ts";

/** Protected quality executes the compiled agent image on native Linux architectures. */
describe("production agent image", () => {
	test("the production image is built by Nix rather than Dockerfile", () => {
		const workflow = readFileSync(join(repoRoot, ".github/workflows/agent.yml"), "utf8");
		expect(workflow).toContain("nix build");
		expect(workflow).toContain("docker load -i");
		expect(workflow).toContain("darkfactory-agent:nix dispatch");
		expect(workflow).not.toContain("docker build");
		expect(workflow).not.toContain("Dockerfile.agent");
	});

	test("the Nix image compiles the release binary rather than interpreting TypeScript sources", () => {
		const agent = readFileSync(join(repoRoot, "nix/agent.nix"), "utf8");
		expect(agent).toContain("bun packages/harness/scripts/build.ts --target");
		expect(agent).toContain('"$out/bin/df" __packaging-smoke');
		expect(agent).not.toContain("exec ${pkgs.bun}/bin/bun");
		expect(agent).not.toContain("DF_SOURCE=");
		const smoke = readFileSync(join(repoRoot, ".github/scripts/verify-nix-agent.sh"), "utf8");
		expect(smoke).toContain("7f454c46");
		expect(smoke).toContain("darkfactory-agent:nix __packaging-smoke");
		expect(agent).toContain("dbus-run-session");
		expect(agent).toContain('User = "1001:1001"');
		expect(agent).toContain('WorkingDir = "/workspace"');
	});
});
