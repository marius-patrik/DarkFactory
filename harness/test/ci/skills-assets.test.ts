import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoDir = join(import.meta.dir, "..", "..", "..");
const skillsDir = join(repoDir, ".agents", "skills");

function skillDirectories(): string[] {
	return readdirSync(skillsDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

describe("canonical first-party skills", () => {
	test("every discovered skill is a self-describing canonical skill document", () => {
		const names = skillDirectories();
		expect(names.length).toBeGreaterThan(0);

		for (const name of names) {
			const content = readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
			const frontmatter = content.match(/^---\r?\nname: (.+)\r?\ndescription: (.+)\r?\n---/);
			expect(frontmatter?.[1]).toBe(name);
			expect(frontmatter?.[2]?.trim().length ?? 0).toBeGreaterThan(20);
			expect(content.slice(frontmatter?.[0].length ?? 0)).toMatch(/\n#\s+\S/u);
		}
	});
});
