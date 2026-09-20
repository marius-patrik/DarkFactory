import type { Hook, HookContext, HookResult } from "./types.ts";

/**
 * Hook that validates commit messages follow the conventional commit format.
 *
 * The first line must match:
 * ^(feat|fix|chore|docs|refactor|test|ci|style|perf|build|revert)(\([a-z0-9][a-z0-9-]*\))?!?: \S.*$
 *
 * Messages starting with "Merge " or "Revert " also pass.
 */
export const conventionalCommit: Hook = {
	id: "conventional-commit",
	events: ["pre-commit"],
	run: async (ctx: HookContext): Promise<HookResult> => {
		const message = ctx.commitMessage;

		if (message === undefined || message === "") {
			return { id: "conventional-commit", status: "fail", message: "commit message is missing" };
		}

		const firstLine = message.split("\n")[0] || "";

		// Allow Merge and Revert messages
		if (firstLine.startsWith("Merge ") || firstLine.startsWith("Revert ")) {
			return { id: "conventional-commit", status: "pass" };
		}

		// Validate conventional commit format
		const convention =
			/^(feat|fix|chore|docs|refactor|test|ci|style|perf|build|revert)(\([a-z0-9][a-z0-9-]*\))?!?: \s*\S.*$/;
		if (!convention.test(firstLine)) {
			return {
				id: "conventional-commit",
				status: "fail",
				message: `commit message is not a conventional commit: ${firstLine}`,
			};
		}

		return { id: "conventional-commit", status: "pass" };
	},
};
