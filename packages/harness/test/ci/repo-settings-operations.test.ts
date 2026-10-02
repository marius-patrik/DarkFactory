import { describe, expect, it } from "bun:test";
import { CANONICAL_STATUSES } from "../../../protocol/src/workflow.ts";
import {
	applyActionsPermissions,
	applyBoardLinks,
	applyBoards,
	applyRepositorySettings,
	type ProjectRef,
	type RepoSettingsBoardPort,
	type RepoSettingsManifestView,
} from "../../src/ci/repo-settings.ts";
import type { GitHubClient } from "../../src/github/client.ts";

/**
 * The four operations that let `install.yml` move off `repo_settings.py`.
 *
 * They are the operations `--branches-only` skips, and the two that had no TypeScript counterpart at
 * all — `apply_repository_settings`, `apply_actions_permissions`, `apply_global_board` and
 * `apply_board_links`. The Python is the declaration; each assertion below is one of its calls.
 */

/** A client that records every REST call and resolves, so no test reaches the network. */
function recordingClient(): { client: GitHubClient; calls: Array<{ method: string; path: string; body: unknown }> } {
	const calls: Array<{ method: string; path: string; body: unknown }> = [];
	const client = {
		async rest(method: string, path: string, body?: unknown) {
			calls.push({ method, path, body });
			return {} as never;
		},
	} as unknown as GitHubClient;
	return { client, calls };
}

const MANIFEST: RepoSettingsManifestView = {
	description: "DarkFactory",
	homepage: "https://darkfactory.dev",
	topics: ["ai", "agents", "bun"],
	boards: ["DarkFactory", "Fleet"],
	statusNames: [...CANONICAL_STATUSES],
	owner: "marius-patrik",
};

const silent = () => undefined;

describe("applyRepositorySettings", () => {
	it("issues the PATCH and the topics PUT the Python issued", async () => {
		const { client, calls } = recordingClient();
		await applyRepositorySettings(client, "o/r", MANIFEST, false, silent);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(["PATCH repos/o/r", "PUT repos/o/r/topics"]);
	});

	it("sets the merge and auto-merge options the Python set, and has_issues/projects true", async () => {
		const { client, calls } = recordingClient();
		await applyRepositorySettings(client, "o/r", MANIFEST, false, silent);
		const settings = calls[0]?.body as Record<string, unknown>;
		expect(settings).toMatchObject({
			has_issues: true,
			has_projects: true,
			has_wiki: false,
			allow_squash_merge: true,
			allow_merge_commit: true,
			allow_rebase_merge: true,
			allow_auto_merge: true,
			delete_branch_on_merge: true,
			allow_update_branch: true,
			web_commit_signoff_required: false,
		});
		expect(settings.description).toBe(MANIFEST.description);
		expect(settings.homepage).toBe(MANIFEST.homepage);
	});

	it("changes nothing in plan mode, which is the whole of Runner(apply=False)", async () => {
		const { client, calls } = recordingClient();
		await applyRepositorySettings(client, "o/r", MANIFEST, true, silent);
		expect(calls).toEqual([]);
	});
});

describe("applyActionsPermissions", () => {
	it("grants workflow write and review approval, which auto-merge cannot work without", async () => {
		const { client, calls } = recordingClient();
		await applyActionsPermissions(client, "o/r", false, silent);
		expect(calls).toEqual([
			{ method: "PUT", path: "repos/o/r/actions/permissions", body: { enabled: true, allowed_actions: "all" } },
			{
				method: "PUT",
				path: "repos/o/r/actions/permissions/workflow",
				body: { default_workflow_permissions: "write", can_approve_pull_request_reviews: true },
			},
		]);
	});

	it("changes nothing in plan mode", async () => {
		const { client, calls } = recordingClient();
		await applyActionsPermissions(client, "o/r", true, silent);
		expect(calls).toEqual([]);
	});
});

/** A board port that records what was asked of it, so no test reaches GitHub. */
function boardPort(overrides: Partial<RepoSettingsBoardPort> = {}): RepoSettingsBoardPort & {
	created: Array<[string, string]>;
	linked: Array<[string, string]>;
} {
	const created: Array<[string, string]> = [];
	const linked: Array<[string, string]> = [];
	return {
		created,
		linked,
		async readProjects() {
			return { read: true, byTitle: new Map<string, ProjectRef>() } as const;
		},
		createProject(owner, title) {
			created.push([owner, title]);
		},
		async repositoryNodeId() {
			return "R_kgDO";
		},
		async linkProjectToRepository(projectId, repositoryId) {
			linked.push([projectId, repositoryId]);
		},
		...overrides,
	} as RepoSettingsBoardPort & { created: Array<[string, string]>; linked: Array<[string, string]> };
}

describe("applyBoards", () => {
	it("does not create a board that already exists", async () => {
		const port = boardPort({
			async readProjects() {
				return {
					read: true,
					byTitle: new Map([["DarkFactory", { title: "DarkFactory", number: 1, id: "PVT_1" }]]),
				} as const;
			},
		});
		await applyBoards(port, MANIFEST, ["DarkFactory", "Fleet"], "DarkFactory", false, silent);
		expect(port.created).toEqual([["marius-patrik", "Fleet"]]);
	});

	it("creates the board when the lookup says it is missing", async () => {
		const port = boardPort();
		await applyBoards(port, MANIFEST, ["DarkFactory"], "DarkFactory", false, silent);
		expect(port.created).toEqual([["marius-patrik", "DarkFactory"]]);
	});

	it("creates nothing in plan mode", async () => {
		const port = boardPort();
		await applyBoards(port, MANIFEST, ["DarkFactory"], "DarkFactory", true, silent);
		expect(port.created).toEqual([]);
	});
});

describe("applyBoardLinks", () => {
	it("does nothing when the manifest declares no boards", async () => {
		const port = boardPort();
		await applyBoardLinks(port, { ...MANIFEST, boards: [] }, "o/r", false, silent);
		expect(port.linked).toEqual([]);
	});

	it("links each declared board that resolves, and skips the ones that do not", async () => {
		const port = boardPort({
			async readProjects() {
				return {
					read: true,
					byTitle: new Map([["DarkFactory", { title: "DarkFactory", number: 1, id: "PVT_1" }]]),
				} as const;
			},
		});
		await applyBoardLinks(port, MANIFEST, "o/r", false, silent);
		// "Fleet" is declared but absent, so only the one that resolved is linked.
		expect(port.linked).toEqual([["PVT_1", "R_kgDO"]]);
	});

	it("skips entirely when the repository node id cannot be resolved", async () => {
		// The Python resolved the node id and, finding none, reported and returned. Linking without it
		// is the failure this guards.
		const port = boardPort({
			async repositoryNodeId() {
				return null;
			},
		});
		await applyBoardLinks(port, MANIFEST, "o/r", false, silent);
		expect(port.linked).toEqual([]);
	});

	it("links nothing in plan mode", async () => {
		const port = boardPort({
			async readProjects() {
				return {
					read: true,
					byTitle: new Map([["DarkFactory", { title: "DarkFactory", number: 1, id: "PVT_1" }]]),
				} as const;
			},
		});
		await applyBoardLinks(port, MANIFEST, "o/r", true, silent);
		expect(port.linked).toEqual([]);
	});
});
