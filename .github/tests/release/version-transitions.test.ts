import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nextVersion, resolveRelease } from "../../../packages/harness/src/release/versioning.ts";

const roots: string[] = [];
function git(root: string, ...args: string[]): void {
	const r = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	if (r.exitCode !== 0) throw new Error(r.stderr.toString());
}
async function repo(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "df16-semver-"));
	roots.push(root);
	await writeFile(join(root, "repo.dfconfig"), JSON.stringify({ repo: { versioning: { mode: "semver", initial: "1.0.0", tag_prefix: "v" } } }));
	await writeFile(join(root, "VERSION"), "1.0.0\n");
	await writeFile(join(root, "package.json"), JSON.stringify({ name: "test", version: "1.0.0", private: true }));
	git(root, "init", "-q", "-b", "main");
	git(root, "config", "user.email", "test@example.com");
	git(root, "config", "user.name", "Test");
	git(root, "add", ".");
	git(root, "commit", "-qm", "fix: previous producer");
	git(root, "tag", "v0.292.4");
	return root;
}
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("DF-16 stable SemVer transition", () => {
	test("v0.292.4 transitions only by explicit 1.0.0", async () => {
		const root = await repo();
		expect(resolveRelease(root, "1.0.0")).toMatchObject({ current: "0.292.4", next: "1.0.0", tag: "v1.0.0", bump: "explicit" });
		for (const value of ["major", "minor", "patch", "0.292.5", "1.1.0", "1.0.0-rc.1", "v1.0.0", "01.0.0", "broken"]) {
			expect(() => resolveRelease(root, value)).toThrow();
		}
	});
	test("duplicate stable, downgrade and historical tags are immutable", async () => {
		const root = await repo();
		git(root, "tag", "v1.0.0");
		expect(() => resolveRelease(root, "1.0.0")).toThrow("not newer");
		expect(() => resolveRelease(root, "0.292.4")).toThrow("not newer");
		expect(resolveRelease(root, "1.0.1").next).toBe("1.0.1");
		expect(resolveRelease(root, "1.1.0").next).toBe("1.1.0");
		expect(resolveRelease(root, "2.0.0").next).toBe("2.0.0");
		expect(nextVersion("semver", "1.0.0", "patch")).toBe("1.0.1");
		expect(nextVersion("semver", "1.0.0", "minor")).toBe("1.1.0");
		expect(nextVersion("semver", "1.0.0", "major")).toBe("2.0.0");
		expect(resolveRelease(root, "1.0.1").current_tag).toBe("v1.0.0");
	});
});
