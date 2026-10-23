import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fauxProvider } from "@earendil-works/pi-ai";
import { createHarnessRuntime, namedSkillPaths } from "../../src/harness/runtime.ts";

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A repository with two installed skills and a df home, all under the OS temp directory. */
function workspace(): { home: string; cwd: string } {
	const root = mkdtempSync(join(tmpdir(), "df-runtime-skills-"));
	roots.push(root);
	const cwd = join(root, "repo");
	for (const name of ["darkfactory-auth", "df-operator"]) {
		mkdirSync(join(cwd, ".agents", "skills", name), { recursive: true });
		writeFileSync(
			join(cwd, ".agents", "skills", name, "SKILL.md"),
			`---\nname: ${name}\ndescription: Fixture skill ${name} used by the runtime skills test.\n---\n\n# ${name}\n`,
		);
	}
	return { home: join(root, "home"), cwd };
}

async function loadedSkills(skills?: readonly string[]): Promise<string[]> {
	const { home, cwd } = workspace();
	const faux = fauxProvider({ provider: "skills-faux", models: [{ id: "m" }] });
	const runtime = await createHarnessRuntime({
		cwd,
		home,
		candidate: { provider: "skills-faux", model: "m", account: "one" },
		providers: [faux.provider],
		authOptionalProviders: ["skills-faux"],
		...(skills ? { skills } : {}),
	});
	try {
		return runtime.session.resourceLoader
			.getSkills()
			.skills.map((skill) => skill.name)
			.sort();
	} finally {
		runtime.session.dispose();
	}
}

describe("runtime skills", () => {
	test("a run without named skills loads none, even when the repository has installed skills", async () => {
		expect(await loadedSkills()).toEqual([]);
	});

	test("only the named skills are loaded", async () => {
		expect(await loadedSkills(["df-operator"])).toEqual(["df-operator"]);
	});

	test("skill names cannot leave .agents/skills", () => {
		expect(namedSkillPaths("/repo", ["darkfactory-auth"])).toEqual([
			join("/repo", ".agents", "skills", "darkfactory-auth"),
		]);
		for (const name of ["../secrets", "a/b", "Auth", ""])
			expect(() => namedSkillPaths("/repo", [name])).toThrow("Invalid skill name");
	});
});
