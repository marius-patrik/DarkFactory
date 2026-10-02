/** @packageDocumentation
 * What an installation writes, and the rule that it never overwrites.
 *
 * Installing never replaces a file that is already there, because a repository may have customised
 * a caller and a reinstall must not silently discard that. Updating a pin is therefore an edit rather
 * than a rewrite, and both live here so neither can drift from the other.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { type RenderCallerOptions, relevantWorkflows, renderCaller } from "./callers.ts";
import { MANIFEST_PATH, resolveManifestPath } from "./manifest.ts";
import { DEFAULT_PIPELINE_REPO, renderManifest } from "./manifest-generation.ts";

/**
 * Raised when the pipeline is asked to install itself as though it were a consumer.
 *
 * DarkFactory is not a consumer of DarkFactory, and treating it as one does real damage in two
 * specific ways. `upstream.ref` is `null` deliberately - this repository *is* the upstream, so
 * pinning it to a commit of itself means nothing. And the generated `required_checks` are prefixed
 * with the caller job that reports them, which is right for a repository calling the pipeline as a
 * reusable workflow and wrong for the one that runs those workflows directly: it reports
 * `pipeline (3.10)`, not `ci / pipeline (3.10)`.
 *
 * Applying them protected this repository's default branch against ten contexts nothing here will
 * ever report, and blocked every merge until the protection was restored by hand. Refusing is
 * cheap; noticing was not.
 */
export class SelfInstall extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SelfInstall";
	}
}

/**
 * Stops an installation whose target is the pipeline repository itself.
 *
 * @param owner Target repository owner.
 * @param repo Target repository name.
 * @param pipelineRepo `owner/name` of the repository holding the pipeline.
 * @throws {SelfInstall} When the target is the pipeline itself, compared case-insensitively
 * because repository names are case-insensitive on GitHub.
 */
export function refuseSelfInstall(owner: string, repo: string, pipelineRepo: string): void {
	if (`${owner}/${repo}`.toLowerCase() === (pipelineRepo || "").toLowerCase()) {
		throw new SelfInstall(
			`${pipelineRepo} is the pipeline, not a consumer of it: it runs these workflows directly ` +
				"rather than calling them, so a generated manifest would pin it to itself and protect " +
				"it against check names it never reports.",
		);
	}
}

/** How to build an installation. */
interface PlanOptions {
	/** Repository owner login. */
	owner: string;
	/** Repository name. */
	repo: string;
	/** Pipeline commit to pin. */
	ref: string;
	/** Repository root. */
	root: string;
	/** Default branch. */
	branch?: string;
	/** Repository description. */
	description?: string;
	/** `owner/name` of the repository holding the pipeline. */
	pipelineRepo?: string;
	/** Whether the repository holds submodules, offering to keep them current. */
	hasGitmodules?: boolean;
}

/**
 * Builds every file an installation writes.
 *
 * @param options Identity, pin, and the repository being installed into.
 * @returns Repository-relative path to file contents, callers first and the configuration last.
 * @throws {SelfInstall} When the target is the pipeline repository itself.
 */
export async function plan(options: PlanOptions): Promise<Record<string, string>> {
	const { owner, repo, ref, root } = options;
	const branch = options.branch ?? "main";
	const pipelineRepo = options.pipelineRepo ?? DEFAULT_PIPELINE_REPO;
	const hasGitmodules = options.hasGitmodules ?? existsSync(join(root, ".gitmodules"));

	refuseSelfInstall(owner, repo, pipelineRepo);

	const installed = relevantWorkflows(hasGitmodules);
	const render: RenderCallerOptions = { pipelineRepo, ref, branch, installed };
	const files: Record<string, string> = {};
	for (const name of installed) files[`.github/workflows/${name}.yml`] = renderCaller(name, render);
	files[MANIFEST_PATH] = await renderManifest({
		owner,
		repo,
		ref,
		root,
		branch,
		description: options.description ?? "",
		pipelineRepo,
		hasGitmodules,
	});
	return files;
}

/**
 * Writes the planned files, creating directories as needed.
 *
 * Existing files are left alone: a repository that has already been installed, or that has
 * deliberately customised a caller, must not have that overwritten by a reinstall. The combined
 * configuration gets one further exemption - a repository that selected an alias keeps using it, so
 * an installation must not add a second document beside the one already in force.
 *
 * @param files Repository-relative path to contents.
 * @param root Repository root.
 * @returns Paths actually written, in the order they were written.
 */
export async function write(files: Readonly<Record<string, string>>, root: string): Promise<string[]> {
	const written: string[] = [];
	for (const relativePath of Object.keys(files).sort()) {
		const content = files[relativePath];
		if (content === undefined) continue;
		const target = join(root, relativePath);
		if (relativePath === MANIFEST_PATH) {
			const selected = resolveManifestPath(root);
			if (existsSync(selected) && resolve(selected) !== resolve(target)) {
				console.log(`  kept ${relative(root, resolve(selected))} (selected configuration alias)`);
				continue;
			}
		}
		if (existsSync(target)) {
			console.log(`  kept ${relativePath} (already present)`);
			continue;
		}
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, content, "utf8");
		console.log(`  wrote ${relativePath}`);
		written.push(relativePath);
	}
	return written;
}
