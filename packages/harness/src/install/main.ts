/**
 * The installation entry point: writes an installation into a checked-out repository.
 *
 * The command line for `install.yml`'s "Generate the installation" step, replacing
 * `.github/scripts/install.py`. The library it calls — `plan`, `write`, `retarget`, `ensureSecretsPass`,
 * `reconcileManifest` — was ported alongside it, and this file is the piece that makes it invokable
 * rather than merely written. It reads the environment the workflow has always set, so the step's
 * contract is unchanged: `TARGET_ROOT`, `TARGET_REPOSITORY`, `TARGET_BRANCH`, `TARGET_DESCRIPTION`,
 * `PIPELINE_REPO` and `PIPELINE_REF` mean what they always did.
 */

import { appendFileSync } from "node:fs";
import { MANIFEST_PATH, resolveManifestPath } from "./manifest";
import { DEFAULT_PIPELINE_REPO } from "./manifest-generation";
import { plan, write } from "./plan";
import { ensureSecretsPass, reconcileManifest, retarget } from "./reinstall";

/** Splits `owner/repo`, tolerating the separator-less default the original treated as root. */
function splitRepository(value: string): { owner: string; repo: string } {
	const index = value.indexOf("/");
	if (index < 0) return { owner: value, repo: "" };
	return { owner: value.slice(0, index), repo: value.slice(index + 1) };
}

/** Everything the entry point reads, so a test can supply it without a process environment. */
export interface InstallEnvironment {
	/** `ProcessEnv` is assignable to this, which a weak all-optional interface would not allow. */
	[key: string]: string | undefined;
	TARGET_ROOT?: string;
	TARGET_REPOSITORY?: string;
	TARGET_BRANCH?: string;
	TARGET_DESCRIPTION?: string;
	PIPELINE_REPO?: string;
	PIPELINE_REF?: string;
	GITHUB_OUTPUT?: string;
}

/**
 * Writes the installation and reports what it wrote.
 *
 * A first install writes everything and has nothing to repoint; a reinstall is mostly the opposite,
 * and both go through the same path so neither is a special case.
 *
 * @param env The workflow's environment, or a stand-in for it.
 * @returns Repository-relative paths actually written, in the order they were written.
 */
export async function runInstall(env: InstallEnvironment): Promise<string[]> {
	const root = env.TARGET_ROOT ?? ".";
	const { owner, repo } = splitRepository(env.TARGET_REPOSITORY ?? "/");
	const ref = env.PIPELINE_REF ?? "";

	const files = await plan({
		owner,
		repo,
		ref,
		root,
		branch: env.TARGET_BRANCH ?? "main",
		description: env.TARGET_DESCRIPTION ?? "",
		pipelineRepo: env.PIPELINE_REPO ?? DEFAULT_PIPELINE_REPO,
	});

	const written = await write(files, root);
	written.push(...(await retarget(root, ref)));
	written.push(...(await ensureSecretsPass(root)));
	if (await reconcileManifest(root, ref, files[MANIFEST_PATH] ?? "")) {
		written.push(resolveManifestPath(root));
	}

	if (env.GITHUB_OUTPUT) {
		appendFileSync(env.GITHUB_OUTPUT, `written=${written.length > 0 ? "true" : "false"}\n`, "utf8");
	}
	return written;
}

if (import.meta.main) {
	try {
		const written = await runInstall(process.env);
		for (const path of written) console.log(path);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
