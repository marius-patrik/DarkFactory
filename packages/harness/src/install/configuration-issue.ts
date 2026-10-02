/** @packageDocumentation
 * The issue that asks a person for what an installation cannot decide.
 *
 * Generating the callers and the configuration gets a repository most of the way, but four things
 * genuinely need a human: which domains this repository has, which credentials it may use, whether
 * its documentation should be published, and when it is ready to be locked down. Leaving those in a
 * README nobody opens is how a half-installed repository looks installed.
 */

/**
 * Marker identifying the configuration issue, so a reinstall finds it rather than filing a second.
 *
 * Identity lives in the body rather than the title because a retitled issue is still the same issue.
 */
export const CONFIG_MARKER = "<!-- darkfactory: configuration -->";

/**
 * Renders the issue body asking for the four human decisions.
 *
 * @param repo `owner/name` of the repository being installed.
 * @param pipelineRepo `owner/name` of the repository holding the pipeline.
 * @param needsSubmodules Whether the repository has submodules to keep current.
 * @returns Markdown body carrying {@link CONFIG_MARKER}.
 */
export function configurationIssue(repo: string, pipelineRepo: string, needsSubmodules = false): string {
	const separator = repo.indexOf("/");
	const name = separator === -1 ? "" : repo.slice(separator + 1);
	const submoduleNote = needsSubmodules
		? "\n- [ ] **Submodules** — `update-submodules` runs daily and pins each submodule to the " +
			"branch it follows. Check `.gitmodules` names the branches you expect.\n"
		: "";

	return `${CONFIG_MARKER}

The pipeline is installed and everything derivable has been generated. Four things need you.

If this repository keeps notes - runbooks, captures, or a decision log - give them one document per
kind and say so in its configuration. DarkFactory keeps its accepted decisions in a single
\`ADRs.md\`, superseded by editing the decision they replace rather than by adding a second file.
The convention is what is shared; the notes themselves stay yours.

### 1. Areas — the one thing that cannot be derived

\`repo.dfconfig\` carries a starter set. Areas drive **labels, Conventional Commit scopes
and agent routing**, so they are worth getting right. Replace them with this repository's own
domains, then re-run the install workflow to reconcile the labels.

### 2. Credentials

| Secret | Needed for | Without it |
| :--- | :--- | :--- |
| \`GH_PROJECT_TOKEN\` | Project board writes | Board automation fails; \`GITHUB_TOKEN\` cannot write user-owned Projects v2 |
| \`ANTHROPIC_API_KEY\` / \`CLAUDE_CODE_OAUTH_TOKEN\` / others | The agent runner | The agent stays off |

Set \`AGENT_ENABLED\` to \`true\` only once you want the runner working.

### 3. Documentation

If this repository should publish a site, set GitHub Pages to the GitHub Actions source and allow the
 default branch to deploy to the \`github-pages\` environment. A deploy from a branch the environment
 does not permit fails **with no steps and no error text**, which is hard to read as a permissions
 problem.
${submoduleNote}
### 4. Branch protection

Left off deliberately. Turn it on once CI has reported green at least once, so the required checks
are contexts that actually exist — protection requiring a check nothing reports blocks every merge
forever.

\`\`\`bash
python .github/scripts/repo_settings.py --apply
\`\`\`

---

Close this issue when the four are done. The pipeline is [${pipelineRepo}](https://github.com/${pipelineRepo});
this repository pins a commit of it in \`repo.dfconfig\`, and bumping that pin is how
${name} adopts an update.
`;
}
