import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	createProductionActionHandler,
	createProductionHandlers,
	FileProductionEffectJournal,
	type GraphEvent,
	type ProductionModelEffects,
	type RunState,
	runGraph,
} from "@darkfactory/core/graph";
import type { PlanningContextPacket } from "@darkfactory/protocol/planning";
import type { Candidate } from "../failover.ts";
import type { GitHubRepository } from "../github/repository.ts";
import type { QuotaEngine } from "../limits/quota-engine.ts";
import { runGit } from "../workspace/git.ts";
import { resolveDefaultBranch } from "../workspace/gitWorkspace.ts";
import type { DispatchRuntime, DispatchRuntimeInput } from "./dispatch.ts";
import { createProductionGraphEffects } from "./production-composition.ts";

function requestAcceptanceCriteria(body: string): string[] {
	return body
		.split(/\r?\n/u)
		.map((line) => line.match(/^\s*-\s*\[[ xX]\]\s+(.+?)\s*$/u)?.[1]?.trim())
		.filter((value): value is string => !!value);
}

function sectionIssueRefs(body: string, headingPattern: RegExp): number[] {
	const lines = body.split(/\r?\n/u);
	let active = false;
	const refs = new Set<number>();
	for (const line of lines) {
		const heading = line.match(/^#{1,6}\s+(.+)$/u)?.[1]?.trim() ?? "";
		if (heading) {
			active = headingPattern.test(heading);
			continue;
		}
		if (!active) continue;
		for (const match of line.matchAll(/#(\d+)/gu)) refs.add(Number(match[1]));
	}
	return [...refs].filter((number) => Number.isSafeInteger(number) && number > 0);
}

async function loadRequestPlanningContext(
	repository: GitHubRepository,
	repoDir: string,
	issueNumber: number,
): Promise<Omit<PlanningContextPacket, "base">> {
	const path = "/repos/" + repository.owner + "/" + repository.repo + "/issues/" + issueNumber;
	const raw = await repository.client.rest<Record<string, unknown>>("GET", path);
	const body = typeof raw.body === "string" ? raw.body : "";
	const version =
		typeof raw.updated_at === "string" ? raw.updated_at : typeof raw.node_id === "string" ? raw.node_id : undefined;
	if (!version) throw new Error("Request #" + issueNumber + " is missing a durable version identity");

	const dependencyNumbers = sectionIssueRefs(body, /dependenc|sequenc/iu).filter((number) => number !== issueNumber);
	const parentNumbers = sectionIssueRefs(body, /parent|epic|relationship/iu).filter((number) => number !== issueNumber);
	const dependencies = await Promise.all(
		dependencyNumbers.map(async (number) => {
			const issue = await repository.getIssue(number);
			return { id: "#" + number, state: issue.state };
		}),
	);

	let recovery: string[] = [];
	try {
		runGit(repoDir, ["fetch", "origin", "--prune"]);
		recovery = runGit(repoDir, ["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin/recovery"])
			.split(/\r?\n/u)
			.map((value) => value.replace(/^origin\//u, "").trim())
			.filter(Boolean)
			.sort();
	} catch {
		// Recovery refs are optional context; mutating git effects still fail closed independently.
	}

	const parent = parentNumbers[0];
	return {
		request: {
			issue: issueNumber,
			body,
			version,
			acceptanceCriteria: requestAcceptanceCriteria(body),
			...(parent ? { parent } : {}),
		},
		relationships: {
			parents: parentNumbers,
			dependencies: dependencyNumbers,
		},
		dependencies,
		approvedDecisions: [],
		shippedInterfaces: [
			"@darkfactory/protocol",
			"@darkfactory/core",
			"@darkfactory/capability",
			"@darkfactory/github",
			"@darkfactory/keychain",
			"@darkfactory/auth",
			"@darkfactory/docs",
			"@darkfactory/cli",
			"@darkfactory/web",
		],
		recovery,
	};
}

async function observeBoardWorkflow(
	repository: GitHubRepository,
	defaultBranch: string,
	effectId: string,
): Promise<{ value: { workflowRunId: number }; evidence: string }> {
	const workflow = "project-automation.yml";
	const runsPath =
		"/repos/" +
		repository.owner +
		"/" +
		repository.repo +
		"/actions/workflows/" +
		workflow +
		"/runs?event=workflow_dispatch&per_page=100";
	const findRun = async () => {
		const result = await repository.client.rest<{
			workflow_runs?: Array<{ id?: number; display_title?: string; name?: string }>;
		}>("GET", runsPath);
		return (result.workflow_runs ?? []).find(
			(run) => typeof run.id === "number" && String(run.display_title ?? run.name ?? "").includes(effectId),
		);
	};
	const existing = await findRun();
	if (existing?.id) return { value: { workflowRunId: existing.id }, evidence: "workflow-run:" + existing.id };

	await repository.client.rest(
		"POST",
		"/repos/" + repository.owner + "/" + repository.repo + "/actions/workflows/" + workflow + "/dispatches",
		{ ref: defaultBranch, inputs: { effect_id: effectId } },
	);
	for (let attempt = 0; attempt < 20; attempt++) {
		await Bun.sleep(500);
		const observed = await findRun();
		if (observed?.id) return { value: { workflowRunId: observed.id }, evidence: "workflow-run:" + observed.id };
	}
	throw new Error("Board sync workflow dispatch " + effectId + " was not observed");
}

export interface ProductionRuntimeFactoryOptions {
	repoDir: string;
	runsRoot: string;
	repository: GitHubRepository;
	quota: QuotaEngine;
	model: ProductionModelEffects;
}

/**
 * Build subject-scoped production graph runtimes around final core graph semantics.
 *
 * This module is composition only: graph planning/execution/effect semantics stay in @darkfactory/core.
 */
export function createProductionRuntimeFactory(options: ProductionRuntimeFactoryOptions) {
	const buildRuntime = async (
		input: Pick<DispatchRuntimeInput, "subject" | "runDir" | "graph">,
	): Promise<DispatchRuntime> => {
		const effects = createProductionGraphEffects({
			repoDir: options.repoDir,
			repository: options.repository,
			journal: new FileProductionEffectJournal(join(input.runDir, "effects")),
			loadPlanningContext: async () => {
				const issueNumber = Number(input.subject);
				if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
					throw new Error("Planning context requires an issue subject, got " + input.subject);
				}
				return loadRequestPlanningContext(options.repository, options.repoDir, issueNumber);
			},
			boardSync: async (effectId) => {
				const defaultBranch = await resolveDefaultBranch(options.repoDir);
				return observeBoardWorkflow(options.repository, defaultBranch, effectId);
			},
			quotaResume: async (effectId) => {
				const eligibleRunIds: string[] = [];
				const resumedRunIds: string[] = [];
				let entries: import("node:fs").Dirent[] = [];
				try {
					entries = await readdir(options.runsRoot, { withFileTypes: true });
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
				}
				for (const entry of entries) {
					if (!entry.isDirectory() || entry.name === input.subject) continue;
					const runDir = join(options.runsRoot, entry.name);
					let state: RunState;
					try {
						state = JSON.parse(await readFile(join(runDir, "state.df"), "utf8")) as RunState;
					} catch {
						continue;
					}
					if (!state.quota_blocked) continue;
					const rawCandidate = state.outputs?.quota_candidate;
					if (!rawCandidate || typeof rawCandidate !== "object") continue;
					const candidate = rawCandidate as Partial<Candidate>;
					if (
						typeof candidate.provider !== "string" ||
						typeof candidate.account !== "string" ||
						typeof candidate.model !== "string"
					)
						continue;
					const status = await options.quota.status(candidate as Candidate);
					if (["waiting", "exhausted", "unavailable"].includes(status.state)) continue;
					eligibleRunIds.push(state.run_id);
					const runtime = await buildRuntime({ subject: entry.name, runDir, graph: input.graph });
					const resumeEvent: GraphEvent = {
						type: "comment",
						actor: { login: "darkfactory-quota-sweep", association: "OWNER", is_bot: false },
						body: "/df resume",
						event_id: "quota-resume:" + effectId + ":" + state.run_id,
					};
					const resumed = await runGraph(input.graph, runDir, runtime.handlers, resumeEvent, {
						...(runtime.onAction ? { onAction: runtime.onAction } : {}),
					});
					if (!resumed.quota_blocked) resumedRunIds.push(state.run_id);
				}
				return {
					value: { eligibleRunIds, resumedRunIds },
					evidence: "quota-resume:" + effectId + ":" + resumedRunIds.slice().sort().join(","),
				};
			},
		});
		const handlers = createProductionHandlers({ effects, model: options.model });
		return {
			handlers,
			onAction: createProductionActionHandler({
				journal: effects.journal,
				github: effects.github,
				targetNumber: Number(input.subject) > 0 ? Number(input.subject) : undefined,
			}),
		};
	};

	return buildRuntime;
}
