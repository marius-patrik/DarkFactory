import type { Hook, HookContext, HookResult } from "./types.ts";

/**
 * Hook that validates branch names follow DarkFactory naming rules.
 *
 * Branch names must be lowercase segments of [a-z0-9] joined by - or /.
 * No segment may be only digits (rule 007 forbids issue numbers).
 * Missing branch names pass (nothing to check).
 */
export const branchName: Hook = {
	id: "branch-name",
	events: ["pre-push", "pr-open"],
	run: async (ctx: HookContext): Promise<HookResult> => {
		const branch = ctx.branch;

		// Missing branch passes (nothing to check)
		if (branch === undefined || branch === "") {
			return { id: "branch-name", status: "pass" };
		}

		// Check lowercase segments of [a-z0-9] joined by - or /
		const pattern = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
		if (!pattern.test(branch)) {
			return {
				id: "branch-name",
				status: "fail",
				message: `branch "${branch}" is invalid: must be lowercase alphanumeric segments separated by - or /`,
			};
		}

		// Check no segment is only digits
		const segments = branch.split(/[-/]/);
		for (const segment of segments) {
			if (/^[0-9]+$/.test(segment)) {
				return {
					id: "branch-name",
					status: "fail",
					message: `branch "${branch}" is invalid: segment "${segment}" cannot be only digits`,
				};
			}
		}

		return { id: "branch-name", status: "pass" };
	},
};
