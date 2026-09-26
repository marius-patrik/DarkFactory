import type { Hook, HookContext, HookResult } from "./types.ts";

/**
 * Hook that verifies test files were changed when source files were changed.
 */
export const testsTouched: Hook = {
	id: "tests-touched",
	events: ["pre-commit", "pr-open"],
	run: async (ctx: HookContext): Promise<HookResult> => {
		const sourceFiles = getSourceFiles(ctx.changedFiles);
		const testFiles = getTestFiles(ctx.changedFiles);

		if (sourceFiles.length > 0 && testFiles.length === 0) {
			const limited = sourceFiles.slice(0, 10);
			const message = `source changed without a test change: ${limited.join(", ")}`;
			return { id: "tests-touched", status: "fail", message };
		}

		return { id: "tests-touched", status: "pass" };
	},
};

function getSourceFiles(changedFiles: string[]): string[] {
	const sourceDirs = ["harness/src/", "harness/scripts/", ".github/scripts/"];
	const sourceExts = [".ts", ".py"];
	return changedFiles.filter((path) => {
		const isSourceDir = sourceDirs.some((dir) => path.startsWith(dir));
		const isSourceExt = sourceExts.some((ext) => path.endsWith(ext));
		return isSourceDir && isSourceExt;
	});
}

function getTestFiles(changedFiles: string[]): string[] {
	const testDirs = ["harness/test/", "tests/"];
	return changedFiles.filter((path) => {
		return testDirs.some((dir) => path.startsWith(dir));
	});
}
