import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Every test that reads repository content — workflows, scripts, issue templates, rules — derives the
 * repository root by counting `..` segments. That is correct only while the depth does not change, and
 * relocating the harness workspace under `packages/` changed it: 66 assertions across the suite
 * silently started reading `packages/.github/workflows`, which does not exist, and every one failed
 * with a message about a missing file rather than about a wrong root.
 *
 * This asserts the root the suite actually uses, so a future relocation breaks one named test instead
 * of sixty-six anonymous ones.
 */
const repoRoot = join(import.meta.dir, "..", "..", "..");

describe("the suite's repository root is the repository root", () => {
	test("the derived root contains the repository's own content", () => {
		expect(existsSync(join(repoRoot, ".github", "workflows"))).toBe(true);
		expect(existsSync(join(repoRoot, "repo.dfconfig"))).toBe(true);
		// The rules are skills under the df-rules plugin, not a flat .agents/rules directory. The point
		// of this assertion is that the root is the repository, so it names a surface that still exists.
		expect(existsSync(join(repoRoot, ".darkfactory", "plugins", "df-rules", "skills"))).toBe(true);
	});

	test("the derived root is not a subdirectory that happens to hold some of it", () => {
		// `packages/` holds packages/* and capabilities/* but no .github, so if the root were wrong
		// the first test fails. Assert the shape too, so the failure names the mistake.
		expect(existsSync(join(repoRoot, "packages"))).toBe(true);
		expect(existsSync(join(repoRoot, "packages", "harness", "src", "cli.ts"))).toBe(true);
		expect(existsSync(join(repoRoot, "harness"))).toBe(false);
	});

	test("pipeline-source derives the same root", async () => {
		// The module every governance test reads through. If the two disagree, half the suite is
		// asserting against a directory that is not the repository.
		const { repoRoot: fromSource } = await import("./ci/pipeline-source.ts");
		expect(fromSource).toBe(repoRoot);
	});
});
