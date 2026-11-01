import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..", "..");
const read = (path: string): string => readFileSync(join(root, path), "utf8");

describe("canonical production agent image", () => {
	test("keeps root Nix discovery and relocates the implementation to a host plugin", () => {
		expect(existsSync(join(root, "flake.nix"))).toBe(true);
		expect(existsSync(join(root, "flake.lock"))).toBe(true);
		expect(existsSync(join(root, "nix"))).toBe(false);
		expect(existsSync(join(root, "docker"))).toBe(false);
		expect(read("flake.nix")).toContain("import ./plugins/hosts/containers/nix/agent.nix");
		expect(read("plugins/hosts/containers/nix/agent.nix")).toContain("src = ../../../..;");
	});

	test("Nix source filtering allows build scripts without admitting workflows or test fixtures", () => {
		const nix = read("plugins/hosts/containers/nix/agent.nix");
		expect(nix).toContain('rel == ".github/scripts"');
		expect(nix).toContain('lib.hasPrefix ".github/scripts/" rel');
		expect(nix).toContain('cp ${../../../../package.json}');
		expect(nix).toContain('cp ${../../../../bun.lock}');
		expect(nix).toContain('tag = "nix"');
		expect(nix).toContain('User = "1001:1001"');
	});

	test("production agent deployment still builds with Nix and executes with Docker", () => {
		const agent = read(".github/workflows/agent.yml");
		expect(agent).toContain('nix build "$CONTEXT#agentImage"');
		expect(agent).toContain("docker load -i");
		expect(agent).toContain("darkfactory-agent:nix dispatch");
	});

	test("candidate and integration workflows verify the same canonical image", () => {
		for (const path of [
			".github/workflows/candidate-release.yml",
			".github/workflows/df15-integration-acceptance.yml",
			".github/workflows/finish-integration-verify.yml",
		]) {
			const workflow = read(path);
			expect(workflow).toContain("nix build .#agentImage");
			expect(workflow).toContain("docker load -i");
			expect(workflow).toContain("verify-agent-image.sh");
			expect(workflow).not.toContain("docker/Dockerfile.agent");
		}
	});

	test("the shared image contract checks native packaging, non-root identity and runtime tools", () => {
		const contract = read(".github/scripts/verify-agent-image.sh");
		expect(read(".github/scripts/verify-nix-agent.sh")).toContain("verify-agent-image.sh");
		for (const assertion of [
			"__packaging-smoke",
			'test "$(id -u)" = 1001',
			'test "$(id -g)" = 1001',
			'od -An -tx1 -N4',
			'photon_rs_bg.wasm',
			'test ! -e /src',
			'command -v gh',
			'command -v secret-tool',
			'command -v dbus-run-session',
		]) {
			expect(contract).toContain(assertion);
		}
	});
});
