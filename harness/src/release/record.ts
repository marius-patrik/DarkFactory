/** @packageDocumentation
 * Release recording: writes a released version to a delivery branch and opens a pull request.
 */

import { resolve as resolvePath } from "node:path";
import { $ } from "bun";
import { GitHubRepository } from "../github/repository.ts";
import { loadRepoManifest } from "./manifest.ts";

/** Result of recording a version. */
export interface RecordResult {
	recorded: boolean;
	version: string;
	branch: string | null;
	base: string;
	issue: number | null;
	pullRequest: string | null;
	reason: string | null;
}

/** The identity automation-authored commits carry. */
const BOT_NAME = "github-actions[bot]";
const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";

/** Records a released version on a delivery branch for the development branch.
 *
 * The `VERSION` file is the owner's control over the next number, which only works while it is
 * also a record of the last one. A file that still names an already-released version reads as an
 * explicit choice of that version, and the next promotion tries to release it again. So the
 * release job writes what it actually released onto its own branch and opens the governed pull
 * request against the development branch; it never pushes to a protected branch itself.
 *
 * Recording the same version twice is a no-op, so a re-run after a completed release neither
 * commits again nor asks for a second review. The pull request binds `release.record_issue`,
 * because every pull request to `develop` has to name a tracking issue to pass its required check;
 * without one the version is still committed and the omission is reported rather than opening a
 * request that can only sit at `REVIEW_REQUIRED`.
 *
 * @param repoRoot - Repository root.
 * @param version - The version that was released.
 * @param releasedTag - The tag that was published, quoted in the pull request body.
 * @param github - Optional GitHubRepository instance (created if not provided).
 * @returns Result of the recording operation.
 * @throws {Error} If the repository declares no development branch, or git fails.
 */
export async function recordVersion(
	repoRoot: string,
	version: string,
	releasedTag: string | undefined,
	github?: GitHubRepository,
): Promise<RecordResult> {
	const manifest = loadRepoManifest(repoRoot);
	const base = manifest.identity?.development_branch;
	if (!base) {
		throw new Error("recording a release needs repo.identity.development_branch in the manifest");
	}

	const declared = readManualVersion(repoRoot);
	const issue = (manifest.release?.record_issue as number | undefined) ?? null;
	const result: RecordResult = {
		recorded: false,
		version,
		branch: null,
		base,
		issue,
		pullRequest: null,
		reason: null,
	};

	if (declared === version) {
		result.reason = `VERSION already records ${version}`;
		return result;
	}

	const branch = `release/record-${version}`;
	await $`git -C ${repoRoot} fetch origin ${base}`;
	await $`git -C ${repoRoot} checkout -B ${branch} origin/${base}`;

	const versionPath = resolvePath(repoRoot, "VERSION");
	await Bun.write(versionPath, `${version}\n`);
	await $`git -C ${repoRoot} add VERSION`;

	// The identity is passed on the command rather than configured on the runner: a release job
	// that inherits nobody's git identity fails at the commit, after the release is already public.
	await $`git -C ${repoRoot} -c user.name=${BOT_NAME} -c user.email=${BOT_EMAIL} commit -q -m "chore(release): record ${version}"`;
	await $`git -C ${repoRoot} push --force-with-lease origin ${branch}:${branch}`;
	result.recorded = true;
	result.branch = branch;

	if (!issue) {
		result.reason = `no release.record_issue in the manifest, so no pull request was opened; ${version} is committed on ${branch}`;
		return result;
	}

	// Get or create GitHub client
	const gh = github ?? await createGitHubRepository(repoRoot);

	// Check if PR already exists
	const openPrs = await gh.listPullRequests({ head: branch, state: "open" });
	if (openPrs.length > 0) {
		result.pullRequest = `#${openPrs[0].number}`;
		result.reason = `a pull request for ${branch} is already open`;
		return result;
	}

	const body = [
		"## Summary",
		"",
		`The release job published \`${releasedTag ?? version}\` and this records it in \`VERSION\`.`,
		"",
		"Without this the file keeps naming an already-released version, which the resolver",
		"reads as an explicit choice of that version, so the next promotion would try to",
		"release it again.",
		"",
		`- Released: \`${releasedTag ?? version}\``,
		`- Base: \`${base}\``,
		"- One file: `VERSION`",
		"",
		"## Bound Request(s)",
		"",
		`- Advances #${issue}`,
		"",
	].join("\n");

	const pr = await gh.createPullRequest({
		title: `chore(release): record ${version}`,
		head: branch,
		base,
		body,
	});
	result.pullRequest = `#${pr.number}`;
	return result;
}

/** Reads the `VERSION` file used by `manual` mode.
 *
 * @param repoRoot - Path to the repository root.
 * @returns The declared version, or `null` when the file is absent or empty.
 */
function readManualVersion(repoRoot: string): string | null {
	const versionPath = resolvePath(repoRoot, "VERSION");
	if (!existsSync(versionPath)) return null;
	const content = readFileSync(versionPath, "utf8").trim();
	return content.length > 0 ? content : null;
}

/** Creates a GitHubRepository instance for the current repository. */
async function createGitHubRepository(repoRoot: string): Promise<GitHubRepository> {
	// Get the repository owner/name from git remote
	const remoteUrl = await $`git -C ${repoRoot} config --get remote.origin.url`.text();
	const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
	if (!match) throw new Error("Could not determine GitHub repository from remote URL");
	const [, owner, repo] = match;

	const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
	if (!token) throw new Error("GH_TOKEN or GITHUB_TOKEN environment variable is required");

	const { GitHubClient } = await import("../github/client.ts");
	const client = new GitHubClient({ token, fetch: globalThis.fetch });
	return new GitHubRepository(client, owner, repo);
}

// Re-export for testing
export { readManualVersion };