/** @packageDocumentation
 * The one declaration of the label taxonomy and the status taxonomy.
 *
 * ## Why this is a table and not three lists
 *
 * A status is a single fact about a repository's workflow, and it used to be stated five times:
 * `repo_settings.STATUS_OPTIONS`, the label rows of `repo_settings.LABELS`, the GraphQL option rows
 * inside `repo_settings.apply_status_options`, `project_automation.STATUS_NAMES`, and
 * `project_automation.CANONICAL_STATUS_OPTIONS`, with a sixth copy in
 * `packages/protocol/workflow.ts` as the canonical list. Nothing connected them except a test that
 * read the Python source text, and that test could only compare the *names*: the descriptions had
 * already drifted, with `Superseded` carrying one sentence in the label taxonomy and a shorter one
 * in both board taxonomies.
 *
 * So the names are read from {@link CANONICAL_STATUSES} rather than restated, and everything else
 * hangs off a record keyed by them. Typing the record as `Record<CanonicalStatus, ...>` makes a new
 * canonical status a compile error until its presentation is written down, which is the property the
 * Python's runtime `assert` was reaching for and could not guarantee.
 *
 * ## What is deliberately not here
 *
 * Areas are a property of the repository rather than of the pipeline, so the area taxonomy is not
 * declared here. {@link labelTaxonomy} takes the area labels as an argument, mirroring the
 * `LABELS.extend(MANIFEST.area_labels)` the Python performs, and leaving the one declaration of the
 * areas in `repo.dfconfig`.
 */

import { CANONICAL_STATUSES, type CanonicalStatus } from "@darkfactory/protocol/workflow";

/** One GitHub label: a name, a hex colour without the leading `#`, and a description. */
export interface LabelDefinition {
	name: string;
	/** Hex colour, without the leading `#`. */
	colour: string;
	description: string;
}

/** How one canonical status is presented on each of the two surfaces it appears on. */
export interface StatusPresentation {
	/** Hex colour for the issue label, without the leading `#`. */
	labelColour: string;
	/** Projects v2 single-select option colour. */
	boardColour: string;
	/**
	 * One sentence, used on both surfaces.
	 *
	 * A reader who sees `Superseded` on an issue and then on the board should read the same
	 * sentence. The two copies this replaces had already diverged here.
	 */
	description: string;
}

/** Every canonical status, in the order the board's columns run. */
export const STATUS_OPTIONS: readonly CanonicalStatus[] = CANONICAL_STATUSES;

/** The presentation of each canonical status. Exhaustive by type, so a new status cannot be skipped. */
const STATUS_PRESENTATION: Readonly<Record<CanonicalStatus, StatusPresentation>> = {
	Backlog: {
		labelColour: "6f42c1",
		boardColour: "PURPLE",
		description: "Staged for future consideration",
	},
	ToDo: { labelColour: "0e8a16", boardColour: "GREEN", description: "Approved and ready to be worked on" },
	"In Progress": { labelColour: "fbca04", boardColour: "YELLOW", description: "Work is actively in progress" },
	Blocked: {
		labelColour: "d93f0b",
		boardColour: "ORANGE",
		description: "Blocked by dependencies, externals, or agent quota",
	},
	Done: { labelColour: "8250df", boardColour: "BLUE", description: "Completed and verified" },
	Superseded: {
		labelColour: "d4c5f9",
		boardColour: "GRAY",
		description: "Outranked by a newer request or plan",
	},
	Dropped: { labelColour: "e11d48", boardColour: "RED", description: "Closed without implementation or abandoned" },
};

/**
 * How one canonical status is presented.
 *
 * @param status One of {@link STATUS_OPTIONS}.
 * @returns Its label colour, board colour and single description.
 */
export function statusPresentation(status: CanonicalStatus): StatusPresentation {
	return STATUS_PRESENTATION[status];
}

/** @returns The lifecycle status labels, in board column order. */
export function statusLabels(): LabelDefinition[] {
	return STATUS_OPTIONS.map((status) => ({
		name: status,
		colour: STATUS_PRESENTATION[status].labelColour,
		description: STATUS_PRESENTATION[status].description,
	}));
}

/** Labels naming the role an issue plays in the pipeline. */
export const PIPELINE_ROLE_LABELS: readonly LabelDefinition[] = [
	{ name: "Request", colour: "1d76db", description: "User request issue - carries the verbatim wording" },
	{ name: "Plan", colour: "006b75", description: "Implementation plan child issue" },
	{ name: "epic", colour: "b60205", description: "Container issue tracking a whole area of work" },
	{ name: "decision", colour: "5319e7", description: "Architecture decision requiring an ADR" },
	{
		name: "pipeline-failure",
		colour: "b91c1c",
		description: "Opened by the pipeline when one of its own workflows failed",
	},
];

/** Labels naming a Conventional Commit type. */
export const CONVENTIONAL_COMMIT_LABELS: readonly LabelDefinition[] = [
	{ name: "feat", colour: "0e8a16", description: "New feature" },
	{ name: "bug", colour: "d73a4a", description: "Something isn't working" },
	{ name: "refactor", colour: "fbca04", description: "Code refactoring without behavioral change" },
	{ name: "docs", colour: "0075ca", description: "Documentation updates and docstrings" },
	{ name: "test", colour: "c5def5", description: "Test suite additions or fixes" },
	{ name: "chore", colour: "bfdadc", description: "Maintenance or tooling changes" },
	{ name: "ci", colour: "1d76db", description: "CI/CD workflows and automation" },
];

/** Labels for the triage decisions a human makes before an issue is planned. */
export const TRIAGE_LABELS: readonly LabelDefinition[] = [
	{ name: "good first issue", colour: "7057ff", description: "Good for newcomers" },
	{ name: "help wanted", colour: "008672", description: "Extra attention is needed" },
	{ name: "question", colour: "d876e3", description: "Further information is requested" },
	{ name: "duplicate", colour: "cfd3d7", description: "This issue or pull request already exists" },
	{ name: "accessibility", colour: "f143ab", description: "Barrier affecting people with disabilities" },
];

/** One repository secret the pipeline cannot run without, and why. */
export interface RequiredSecret {
	name: string;
	why: string;
}

/**
 * The repository secrets the pipeline needs.
 *
 * Secret *values* are never read, printed or written by anything that consumes this; only the names
 * are compared against the listing.
 */
export const REQUIRED_SECRETS: readonly RequiredSecret[] = [
	{
		name: "GH_PROJECT_TOKEN",
		why: "Classic PAT with repo+project+workflow; the default GITHUB_TOKEN cannot write to user-owned Projects v2.",
	},
	{ name: "ANTIGRAVITY_REFRESH_TOKEN", why: "Google OAuth refresh token for the agent CLI." },
	{ name: "ANTIGRAVITY_CLIENT_ID", why: "OAuth client id for the token exchange." },
	{ name: "ANTIGRAVITY_CLIENT_SECRET", why: "OAuth client secret for the token exchange." },
];

/**
 * The whole label taxonomy, in the order labels are reconciled.
 *
 * Areas come last and come from the caller, because the area taxonomy is a property of the
 * repository rather than of the pipeline: the labels the pipeline applies and the labels that exist
 * come from one source, which is what stops the two drifting apart.
 *
 * @param areaLabels The `area:`-prefixed labels declared in the repository configuration.
 * @returns Every label the pipeline ensures exists.
 */
export function labelTaxonomy(areaLabels: readonly LabelDefinition[] = []): LabelDefinition[] {
	return [...statusLabels(), ...PIPELINE_ROLE_LABELS, ...CONVENTIONAL_COMMIT_LABELS, ...TRIAGE_LABELS, ...areaLabels];
}
