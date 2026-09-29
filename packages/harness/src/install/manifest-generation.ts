/** @packageDocumentation
 * Scaffolding a repository's combined configuration document.
 *
 * An installation writes the callers and the `repo.dfconfig` an initial run can produce, and leaves
 * what only a person can decide - the areas, above all - as an explicit starting point rather than a
 * claim. Everything derivable is derived here so the file a human edits says something true.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { detectRepositoryEvidence } from "../../../core/src/repository-evidence.ts";
import { relevantWorkflows, requiredContexts } from "./callers.ts";

/** The repository holding the pipeline when the caller names none. */
export const DEFAULT_PIPELINE_REPO = "marius-patrik/DarkFactory";

/**
 * Starter areas, offered to be edited rather than presented as correct.
 *
 * The `$comment` and `$default` keys are documentation and routing rather than areas, and every
 * reader here strips a leading `$` before treating a key as one.
 */
export const STARTER_AREAS: Readonly<Record<string, unknown>> = Object.freeze({
	$comment:
		"Replace these with this repository's own domains; they drive labels, commit scopes and agent routing, so they are worth getting right.",
	$default: "ci",
	ci: {
		description: "GitHub Actions workflows, containers, runner scripts, repository automation",
		keywords: ["ci", "action", "workflow", "pipeline", "automation"],
	},
	docs: {
		description: "Documentation compiler, API reference and shared web surfaces",
		keywords: ["doc", "docs", "documentation", "tsdoc", "typedoc", "readme", "site"],
	},
});

/** How to scaffold one repository's combined configuration. */
export interface RenderManifestOptions {
	/** Repository owner login. */
	owner: string;
	/** Repository name. */
	repo: string;
	/** Pipeline commit to pin. */
	ref: string;
	/** Repository root, inspected to decide what to declare. */
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
 * The package name a `pyproject.toml` declares, if any.
 *
 * Only `[project] name` and `[tool.poetry] name` count, because those are the two a `pyproject.toml`
 * may carry to identify a package. A `name` key under any other table is somebody else's setting, and
 * treating it as identity is what made a `[tool.poetry] packages` list look like a publishable
 * distribution.
 *
 * The tables are walked rather than pattern-matched across the whole file, because a `name` under
 * an unrelated table would otherwise answer the question this is asked.
 *
 * @param source The `pyproject.toml` text.
 * @returns The declared name, or undefined when the file identifies no package.
 */
export function declaredPythonPackageName(source: string): string | undefined {
	let table = "";
	let project: string | undefined;
	let poetry: string | undefined;
	for (const raw of source.split(/\r?\n/u)) {
		const line = raw.trim();
		if (line.startsWith("#")) continue;
		const header = line.match(/^\[([^\]]+)\]$/u);
		if (header?.[1] !== undefined) {
			table = header[1].trim();
			continue;
		}
		if (table !== "project" && table !== "tool.poetry") continue;
		const entry = line.match(/^name\s*=\s*(["'])(.*?)\1(?:\s*#.*)?$/u);
		const name = entry?.[2];
		if (name === undefined) continue;
		if (table === "project") project = name;
		else poetry = name;
	}
	return project ?? poetry;
}

/**
 * Whether a repository's Python manifests identify a package at all.
 *
 * Detection reports a Python ecosystem for any `pyproject.toml`, `setup.py`, `setup.cfg` or
 * `requirements.txt`, which is a statement about tooling rather than about distribution. A
 * repository whose only Python manifest is `[tool.black]` has nothing to release, and saying so at
 * install time is cheaper than a release that fails on every run until someone looks.
 *
 * A declared package name counts as an identity, because a repository is allowed to name a package
 * its manifest does not - and this repository does exactly that, which is why reading the
 * `pyproject.toml` alone would disable its release.
 *
 * @param root Repository root.
 * @returns True when a Python manifest is present and none of them declares a package name.
 */
export async function declaresNothingToRelease(root: string): Promise<boolean> {
	const evidence = await detectRepositoryEvidence(root);
	const python = evidence.packages.filter((pkg) => pkg.ecosystem === "python");
	if (python.length === 0) return false;

	const declared = new Map<string, string | undefined>();
	for (const entry of evidence.repoDf.environment?.packages ?? []) {
		if (entry.ecosystem !== "python") continue;
		declared.set(entry.path, entry.name || undefined);
	}

	for (const pkg of python) {
		const named = declared.get(pkg.path) ?? (await declaredNameInTree(evidence.root, pkg.path, pkg.manifest));
		if (named !== undefined) return false;
	}
	return true;
}

/** The package name a discovered manifest declares, or undefined when it identifies nothing. */
async function declaredNameInTree(root: string, path: string, manifest: string): Promise<string | undefined> {
	// Only a `pyproject.toml` can name a Python package; `setup.py` and `setup.cfg` are marker
	// formats whose presence is the signal, and `requirements.txt` names dependencies.
	if (manifest !== "pyproject.toml") return undefined;
	try {
		return declaredPythonPackageName(await readFile(join(root, path, "pyproject.toml"), "utf8"));
	} catch {
		// Detection saw the file and this read did not; treat it as unidentified rather than as a
		// package, which is the reading that keeps the release disabled.
		return undefined;
	}
}

/**
 * Renders the canonical root `repo.dfconfig` combined configuration.
 *
 * @param options Identity, pin and repository shape.
 * @returns Pretty-printed JSON with a trailing newline.
 */
export async function renderManifest(options: RenderManifestOptions): Promise<string> {
	const { owner, repo, ref, root } = options;
	const branch = options.branch ?? "main";
	const description = options.description ?? "";
	const pipelineRepo = options.pipelineRepo ?? DEFAULT_PIPELINE_REPO;
	const hasGitmodules = options.hasGitmodules ?? existsSync(join(root, ".gitmodules"));

	const block: Record<string, unknown> = {
		$comment:
			"Everything the shared pipeline needs and cannot detect. The pipeline itself is identical " +
			"across every repository that uses it; this file is the only thing that differs.",
		identity: {
			owner,
			repo,
			display_name: repo,
			project_title: repo,
			default_branch: branch,
			development_branch: branch,
			description,
			topics: [],
		},
		license: {
			$comment:
				"Written from GitHub's canonical text, so it cannot drift from the wording it claims " +
				"to be. NONE means deliberately not licensed for reuse, which is different from " +
				"having forgotten to choose. Change it through a configuration issue.",
			spdx: "NONE",
			holder: "",
			year: "",
		},
		$comment_required_checks: "Stable direct contexts produced by the installed quality and issue-binding workflows.",
		upstream: {
			$comment: "`ref` is the pin: bump it to adopt a pipeline update.",
			repo: pipelineRepo,
			ref,
		},
		board: {
			global_title: "Global",
			link_boards: ["Global"],
		},
		required_checks: requiredContexts(relevantWorkflows(hasGitmodules)),
		areas: { ...STARTER_AREAS },
	};

	// A repository whose only manifest carries tooling configuration has nothing to package, and
	// saying so up front is cheaper than a release that fails on every run until someone looks.
	if (await declaresNothingToRelease(root)) {
		block.environment = {
			$comment:
				"Detection found Python but no package identity, which usually means pyproject.toml " +
				"carries only tooling configuration. A release here is a tag and its notes, with no " +
				"assets. Delete this block if the repository really does package something.",
			release: { python: { enabled: false } },
		};
	}

	return `${JSON.stringify(
		{
			repo: block,
			docs: {
				version: 1,
				site: { name: repo, description },
				home: ".agents/PRD.md",
			},
			providers: {},
		},
		null,
		2,
	)}\n`;
}
