import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseWorkflow, repoRoot, triggers, workflowNames, workflowSource } from "./pipeline-source.ts";

describe("real Python version quality verification", () => {
	const filename = ".github/tests/harness/ci/python-runtime.integration.test.ts";
	const workflow = parseWorkflow("quality-python-versions.yml");
	const job = workflow.jobs["python-quality-versions"];

	it("targets the actual test and runner source on pull requests", () => {
		const on = triggers(workflow);
		const pull = on.pull_request as { paths: string[] };
		expect(pull.paths).toContain(filename);
		expect(pull.paths).toContain("packages/harness/src/ci/quality-runner.ts");
		expect(existsSync(join(repoRoot, filename))).toBe(true);
	});

	it("runs a real multi-interpreter smoke rather than an unconditional skip", () => {
		expect(job).toBeDefined();
		const steps = job?.steps ?? [];
		const smoke = steps.find((step) => step.name === "Verify real Python 3.10 and 3.13 isolation");
		expect(smoke?.env?.DF_PYTHON_RUNTIME_SMOKE).toBe("true");
		expect(smoke?.run).toContain(filename);
		expect(smoke?.run).toContain("bun test");
		expect(smoke?.run).not.toContain("packages/harness/test/");
	});

	it("installs tooling only after source checkout and Bun setup", () => {
		const steps = job?.steps ?? [];
		const checkout = steps.findIndex((step) => step.uses?.startsWith("actions/checkout@"));
		const bun = steps.findIndex((step) => step.uses?.startsWith("oven-sh/setup-bun@"));
		const toolInstall = steps.findIndex((step) => step.name === "Install runtime tools");
		const smoke = steps.findIndex((step) => step.name === "Verify real Python 3.10 and 3.13 isolation");
		expect(checkout).toBeGreaterThanOrEqual(0);
		expect(bun).toBeGreaterThan(checkout);
		expect(toolInstall).toBeGreaterThan(bun);
		expect(steps[toolInstall]?.run).toContain("python -m pip install uv");
		expect(smoke).toBeGreaterThan(toolInstall);
	});

	it("does not invoke retired Python orchestration scripts from any managed workflow", () => {
		for (const name of workflowNames()) {
			const source = workflowSource(name);
			expect(source, name).not.toMatch(/(?:python3?|pip3?)\s+\.github\/scripts\//u);
			expect(source, name).not.toContain("PIPELINE_SCRIPTS");
		}
	});

	it("branch policy responds to the real configuration and GitHub-owned modules", () => {
		const policy = parseWorkflow("branch-policy.yml");
		const push = triggers(policy).push as { paths: string[] };
		for (const path of [
			"repo.dfconfig",
			"packages/github/src/ci/repo-settings.ts",
			"packages/github/src/ci/protection.ts",
			"packages/harness/src/install/manifest.ts",
		]) {
			expect(push.paths).toContain(path);
			expect(existsSync(join(repoRoot, path))).toBe(true);
		}
	});
});
