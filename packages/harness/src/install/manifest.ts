/** @packageDocumentation
 * The repository declaration consumed by shared DarkFactory automation.
 *
 * Repository-specific identity, taxonomy, project, release and authorization settings live in the
 * `repo` block of the selected combined configuration document. Detectable package and runtime
 * facts are discovered rather than duplicated in that declaration, so a consumer file stays small
 * enough to read.
 *
 * Document *discovery* and parsing belong to `@darkfactory/protocol/config-document`; this module
 * is the `repo` block's meaning — the taxonomy, the identities, and the defaults that keep a
 * repository that declares nothing usable.
 */

import { readFile } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "../../../protocol/src/config-document.ts";
import { CANONICAL_STATUSES } from "../../../protocol/src/workflow.ts";
import { TYPE_LABELS } from "../pipeline/labels.ts";

/** The filename an installation writes when a repository declares no configuration yet. */
export const MANIFEST_PATH = "repo.dfconfig";

/** The directory consulted when the repository root holds no configuration document. */
const DEFAULT_CONFIG_DIR = ".darkfactory";

/**
 * The directory holding the fallback configuration document.
 *
 * Absolute when `DF_CONFIG_DIR` is, and resolved against the repository root when it is relative,
 * so the returned path is comparable to the resolved root by string equality.
 */
function configDirectory(root: string, env: Readonly<Record<string, string | undefined>>): string {
	const configured = env.DF_CONFIG_DIR?.trim() || DEFAULT_CONFIG_DIR;
	return isAbsolute(configured) ? resolve(configured) : join(root, configured);
}

/**
 * The combined configuration document selected for a repository.
 *
 * Discovery and ambiguity rejection are the protocol package's; the default is this module's
 * because a caller asking where the document *is* wants an answer even before one exists — an
 * installation has to know which path it would write to, and a repository that declares nothing
 * still has a canonical location.
 *
 * @param root Repository root.
 * @param env Environment mapping; defaults to the process environment.
 * @returns The selected path, or the default `<DF_CONFIG_DIR>/repo.dfconfig` when none exists.
 * @throws When candidates exist in both the repository root and the configured directory, or when
 * one scope holds more than one alias.
 */
export function resolveManifestPath(
	root: string,
	env: Readonly<Record<string, string | undefined>> = process.env,
): string {
	return resolveConfigDocumentPath(root, env) ?? join(configDirectory(resolve(root), env), MANIFEST_PATH);
}

/** Area labels used when a repository declares none, chosen to be about the pipeline itself. */

/** Colours cycled through when assigning one to an area label that has no explicit colour. */

/**

/** One area label, as the labels API is given it. */
/**
 * The colour an area label takes when no palette is declared.
 *
 * A single neutral grey, used only when the document declares no `labels.area_colours`. It is a
 * fallback for the *absence* of configuration rather than a taxonomy: it says nothing about what the
 * areas are, and it is deliberately unremarkable.
 */
const DEFAULT_LABEL_COLOUR = "ededed";

/** One branch protection lane, as the configuration document declares it. */
export interface ProtectedBranch {
	/** The branch this lane protects. */
	branch: string;
	/** Status checks that must pass before a merge. */
	requiredChecks: string[];
	/** Approvals required before a merge. */
	approvals: number;
	/** Whether the lane applies to administrators as well. */
	enforceAdmins: boolean;
	/** Whether branches must be up to date before merging. */
	strict: boolean;
	/** Whether conversations must be resolved before merging. */
	resolveConversations: boolean;
}

export interface AreaLabel {
	/** Label name, always prefixed with `area:`. */
	name: string;
	/** Bare six-digit hex colour. */
	colour: string;
	/** The area's description, used as the label description. */
	description: string;
}

/** The declared licence, defaulted where the declaration is silent. */
export interface DeclaredLicense {
	/** SPDX identifier, or `"NONE"`. */
	spdx: string;
	/** Copyright holder. */
	holder: string;
	/** Copyright year. */
	year: string;
}

/** The environment mapping a manifest read consults for `GITHUB_REPOSITORY`. */
export type ManifestEnv = Readonly<Record<string, string | undefined>>;

/** A JSON value read out of an untrusted configuration document. */
type Json = unknown;

function isRecord(value: Json): value is Record<string, Json> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A declared value as text, with JSON's `null` treated as silence rather than as the word "null". */
function text(value: Json): string {
	return value === undefined || value === null ? "" : String(value);
}

/** A record with the `$`-prefixed documentation keys removed, which are never data. */
function withoutComments(value: Json): Record<string, Json> {
	const record = isRecord(value) ? { ...value } : {};
	for (const key of Object.keys(record)) {
		if (key.startsWith("$")) delete record[key];
	}
	return record;
}

/**
 * Fallbacks for a repository that declares nothing.
 *
 * A declaration is an override, not a requirement. A consumer that installs the pipeline without
 * describing its own areas, palette or identities gets these, which is the behaviour the pipeline
 * has always had; the configuration document exists to change it, not to switch it on.
 */

/** Area labels used when a repository declares none, chosen to be about the pipeline itself. */
export const DEFAULT_AREAS: Readonly<Record<string, string>> = Object.freeze({
	ci: "GitHub Actions workflows, containers, runner scripts, repository automation",
	agents: "Agent runtime, routing, providers, planning/review orchestration and model execution",
	docs: "Documentation compiler, API reference and shared web surfaces",
});

/** Colours cycled through when assigning one to an area label that has no explicit colour. */
export const AREA_COLOURS: readonly string[] = Object.freeze([
	"5319e7",
	"1f883d",
	"0052cc",
	"a2eeef",
	"f9d0c4",
	"c2e0c6",
	"e99695",
	"006b75",
	"0075ca",
]);

/**
 * Default identities used when a repository declares none.
 *
 * A provider identity names the trailer a generated commit carries, so a default that named the
 * wrong project would attribute this repository's commits to a stranger.
 */
export const DEFAULT_IDENTITIES: Readonly<Record<string, Record<string, unknown>>> = Object.freeze({
	app: {
		slug: "darkfactory-pipeline",
		login: "darkfactory-pipeline[bot]",
		user_id: 326069535,
		commit_author_email: "326069535+darkfactory-pipeline[bot]@users.noreply.github.com",
	},
	claude: {
		name: "Claude",
		display_name: "Claude",
		trailer: "Co-authored-by: Claude <noreply@anthropic.com>",
		note: "Generated with {model}",
		account_link: "https://github.com/claude",
		verified: true,
	},
	codex: {
		name: "Codex",
		display_name: "Codex",
		trailer: "Co-authored-by: Codex <noreply@openai.com>",
		note: "Generated with {model}",
		account_link: "https://github.com/codex",
		verified: true,
	},
	"openai-codex": {
		name: "Codex",
		display_name: "Codex",
		trailer: "Co-authored-by: Codex <noreply@openai.com>",
		note: "Generated with {model}",
		account_link: "https://github.com/codex",
		verified: true,
	},
	google: {
		name: "Gemini",
		display_name: "Gemini",
		trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
		note: "Generated with {model}",
		account_link: "https://github.com/gemini-code-assist",
		verified: true,
	},
	antigravity: {
		name: "Gemini",
		display_name: "Gemini",
		trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
		note: "Generated with {model}",
		account_link: "https://github.com/gemini-code-assist",
		verified: true,
	},
});

/**
 * The parsed `repo` block of a repository's combined configuration.
 *
 * Every property is a read with the default the pipeline has always applied, so a caller never has
 * to distinguish "declared" from "absent" before asking a question.
 */
export class RepositoryManifest {
	/** Absolute repository root this declaration was read from. */
	readonly root: string;

	/** The raw `repo` block, unaltered. */
	readonly data: Record<string, Json>;

	/**
	 * The environment identity fallbacks read.
	 *
	 * Held rather than re-read from `process.env` on every property, so a caller that resolved the
	 * document against one environment also gets that environment's `GITHUB_REPOSITORY`. Reading
	 * the process environment here would make the two halves of one read disagree.
	 */
	readonly env: ManifestEnv;

	constructor(root: string, data: Record<string, Json> = {}, env: ManifestEnv = process.env) {
		this.root = root;
		this.data = data;
		this.env = env;
	}

	/** The declared identity block, or an empty mapping. */
	private get identity(): Record<string, Json> {
		return isRecord(this.data.identity) ? this.data.identity : {};
	}

	/** The account owning the repository, from the declaration then `GITHUB_REPOSITORY`. */
	owner(env: ManifestEnv = this.env): string {
		const declared = text(this.identity.owner);
		if (declared) return declared;
		return (env.GITHUB_REPOSITORY ?? "/").split("/")[0] ?? "";
	}

	/** The repository name, from the declaration then `GITHUB_REPOSITORY` then the directory name. */
	repo(env: ManifestEnv = this.env): string {
		const declared = text(this.identity.repo);
		if (declared) return declared;
		const fromEnv = env.GITHUB_REPOSITORY ?? "";
		if (fromEnv.includes("/")) return fromEnv.split("/", 2)[1] ?? "";
		return basename(this.root);
	}

	/** The `owner/repo` slug. */
	slug(env: ManifestEnv = this.env): string {
		return `${this.owner(env)}/${this.repo(env)}`;
	}

	/** The human-facing project name, defaulting to the repository name. */
	displayName(env: ManifestEnv = this.env): string {
		return text(this.identity.display_name) || this.repo(env);
	}

	/** The title of this repository's project board, defaulting to the display name. */
	projectTitle(env: ManifestEnv = this.env): string {
		return text(this.identity.project_title) || this.displayName(env);
	}

	/**
	 * The repository's canonical GitHub default branch: the stable branch repository-level
	 * protection and release publication use.
	 */
	defaultBranch(): string {
		return text(this.identity.default_branch) || "main";
	}

	/**
	 * The branch implementation work integrates into, falling back to {@link defaultBranch}.
	 *
	 * A repository without a separate release branch develops directly on its GitHub default
	 * branch, so the two are the same thing unless the repository separates them.
	 */
	developmentBranch(): string {
		return text(this.identity.development_branch) || this.defaultBranch();
	}

	/**
	 * The marker used to recognise this pipeline's own comments, so the agent can identify and
	 * ignore its own output.
	 */
	agentSlug(env: ManifestEnv = this.env): string {
		const declared = text(this.identity.agent_slug);
		return declared || `${this.repo(env).toLowerCase()}-agent`;
	}

	/** The repository description, empty when undeclared. */
	description(): string {
		return text(this.identity.description);
	}

	/** The documentation site URL. */
	homepage(env: ManifestEnv = this.env): string {
		return `https://${this.owner(env)}.github.io/${this.repo(env)}/`;
	}

	/**
	 * The declared licence.
	 *
	 * A licence is configuration rather than content: chosen once, identical for everyone who
	 * chooses it, and wrong in a legal sense rather than a stylistic one if it drifts.
	 */
	license(): DeclaredLicense {
		const block = isRecord(this.data.license) ? this.data.license : {};
		return { spdx: text(block.spdx) || "NONE", holder: text(block.holder), year: text(block.year) };
	}

	/** The repository topics, empty when undeclared. */
	topics(): string[] {
		const declared = this.identity.topics;
		return Array.isArray(declared) ? declared.map((topic) => text(topic)) : [];
	}

	/**
	 * The declared areas with documentation keys stripped, falling back to
	 * {@link DEFAULT_AREAS} when a repository declares none.
	 *
	 * Declaration order is preserved because it is match order: the first area whose keywords hit
	 * wins, so a specific area declared after a general one never matches.
	 */
	private rawAreas(): Record<string, Json> {
		// Declared areas win; a repository that declares none gets the pipeline's own, which is what
		// the routing and the Conventional Commit scopes were written against.
		const declared = withoutComments(this.data.areas);
		return Object.keys(declared).length > 0 ? declared : { ...DEFAULT_AREAS };
	}

	/**
	 * The area taxonomy: bare scope name to description.
	 *
	 * The same list drives area labels, Conventional Commit scopes and the agent's routing, so the
	 * three cannot disagree.
	 */
	areas(): Record<string, string> {
		const resolved: Record<string, string> = {};
		for (const [name, value] of Object.entries(this.rawAreas())) {
			resolved[name] = isRecord(value) ? text(value.description) : text(value);
		}
		return resolved;
	}

	/**
	 * The words that route a request to each area, in declaration order.
	 *
	 * An area declaring none matches its own name, so a bare taxonomy still classifies something.
	 */
	areaKeywords(): Record<string, string[]> {
		const resolved: Record<string, string[]> = {};
		for (const [name, value] of Object.entries(this.rawAreas())) {
			const keywords = isRecord(value) ? value.keywords : undefined;
			resolved[name] = Array.isArray(keywords) && keywords.length > 0 ? keywords.map((w) => text(w)) : [name];
		}
		return resolved;
	}

	/** The area a request falls back to when nothing matches. */
	defaultArea(): string {
		const areas = isRecord(this.data.areas) ? this.data.areas : {};
		const declared = text(areas.$default);
		if (declared) return declared;
		const names = Object.keys(this.areas());
		return names.length > 0 ? (names[names.length - 1] as string) : "ci";
	}

	/** The area labels, sorted by area name, each taking the next colour in {@link AREA_COLOURS}. */
	areaLabels(): AreaLabel[] {
		const palette = this.areaColours();
		return Object.entries(this.areas())
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([name, description], index) => ({
				name: `area:${name}`,
				colour: palette.length > 0 ? (palette[index % palette.length] as string) : DEFAULT_LABEL_COLOUR,
				description,
			}));
	}

	/**
	/**
	 * The `df` accounts this repository provisions, as `set` and `load` tables.
	 *
	 * `set` is `[environment variable, df account id, slot]` for a credential the pipeline hands df
	 * with `df account set`; `load` is `[environment variable, df account id]` for a subscription
	 * record df loads itself. Which providers a repository uses, what its accounts are called and
	 * which slot each holds are facts about that repository, so they are declared. The code holds the
	 * mechanism — iterate, skip an unset variable, report a failure — and no provider names.
	 */
	dfAccounts(): { set: Array<[string, string, string]>; load: Array<[string, string]> } {
		const declared = isRecord(this.data.accounts) ? this.data.accounts : {};
		const rows = (key: string): unknown[] => (Array.isArray(declared[key]) ? (declared[key] as unknown[]) : []);
		const cells = (entry: unknown): string[] => (Array.isArray(entry) ? entry.map((cell) => text(cell)) : []);
		return {
			set: rows("set")
				.map(cells)
				.filter((row) => row.length >= 3)
				.map((row) => [row[0] as string, row[1] as string, row[2] as string]),
			load: rows("load")
				.map(cells)
				.filter((row) => row.length >= 2)
				.map((row) => [row[0] as string, row[1] as string]),
		};
	}

	/**
	 * The colours area labels are assigned from, cycled in declaration order.
	 *
	 * A colour is a fact about a label, not about code, so the palette is declared. With none
	 * declared every area takes one colour, which is visibly plain rather than pretending to be a
	 * taxonomy: a repository that has not chosen colours has not chosen them.
	 */
	/**
	 * The status vocabulary this repository's board uses, in column order.
	 *
	 * Declared statuses win. An undeclared repository gets the pipeline's own canonical seven, which
	 * is what `CANONICAL_STATUSES` has always been, so the column order and the statuses the
	 * projection can return are one list rather than two that can drift apart.
	 */
	statuses(): string[] {
		const declared = this.data.labels;
		const list = isRecord(declared) ? declared.statuses : undefined;
		return Array.isArray(list) && list.length > 0 ? list.map((entry) => text(entry)) : [...CANONICAL_STATUSES];
	}

	/** The permitted Conventional Commit types, sorted. */
	types(): string[] {
		const declared = this.data.labels;
		const list = isRecord(declared) ? declared.types : undefined;
		return Array.isArray(list) && list.length > 0 ? list.map((entry) => text(entry)) : [...TYPE_LABELS];
	}

	areaColours(): string[] {
		const declared = this.data.labels;
		const list = isRecord(declared) ? declared.area_colours : undefined;
		// Declared palette wins; otherwise cycle the pipeline's own, so areas stay visually distinct
		// rather than all landing on the same neutral.
		return Array.isArray(list) && list.length > 0 ? list.map((entry) => text(entry)) : [...AREA_COLOURS];
	}

	/** The permitted Conventional Commit scopes: bare area names, sorted. */
	areaScopes(): string[] {
		return Object.keys(this.areas()).sort();
	}

	/**
	 * The pipeline's GitHub App identity.
	 *
	 * The app id and client id are public identifiers; only the private key is a secret, and it
	 * lives in a repository secret named by `private_key_secret`. A GitHub App cannot write
	 * user-owned Projects v2 — GitHub scopes project permissions to organizations — so board work
	 * continues to use a personal access token. That is a GitHub limitation, not a gap here.
	 */
	app(): Record<string, Json> {
		return withoutComments(this.data.app);
	}

	/**
	 * The declared provider and pipeline identities.
	 *
	 * A consumer that installs the pipeline has this pipeline's App — it is what opens the pull
	 * requests and pushes the branches — so the `app` entry is the honest author for a repository that
	 * declares no identity of its own. Declaring them overrides it.
	 */
	identities(): Record<string, Json> {
		const declared = withoutComments(this.data.identities);
		return Object.keys(declared).length > 0 ? declared : structuredClone(DEFAULT_IDENTITIES);
	}

	/**
	 * The identity entry for a provider id.
	 *
	 * A `providers` sub-block wins over a top-level key of the same name, so a repository can
	 * group its providers without colliding with `app`.
	 *
	 * @param provider Provider id, such as `google` or `claude`.
	 * @returns The identity, or undefined when the provider is not configured.
	 */
	identityFor(provider: string): Record<string, Json> | undefined {
		const identities = this.identities();
		const providers = identities.providers;
		if (isRecord(providers) && isRecord(providers[provider])) {
			return { ...(providers[provider] as Record<string, Json>) };
		}
		const entry = identities[provider];
		return isRecord(entry) ? { ...entry } : undefined;
	}

	/** The pipeline bot's Git commit author, as `login <email>`. */
	botCommitAuthor(): string {
		const identities = this.identities();
		const app = isRecord(identities.app)
			? identities.app
			: isRecord(identities.automation)
				? identities.automation
				: {};
		const login = text(app.login) || "darkfactory-pipeline[bot]";
		const userId = app.user_id ?? 326069535;
		const email =
			text(app.commit_author_email) || text(app.email) || `${text(userId)}+${login}@users.noreply.github.com`;
		return `${login} <${email}>`;
	}

	/**
	 * The status checks that must pass before a merge.
	 *
	 * The installed CI and issue-binding workflows report stable direct job contexts, so repository
	 * protection does not depend on caller or reusable-workflow prefixes.
	 */
	requiredChecks(): string[] {
		const declared = this.data.required_checks;
		if (Array.isArray(declared) && declared.length > 0) return declared.map((entry) => text(entry));
		// Otherwise the checks are whatever the protection lanes ask for, taken as a union. The lanes
		// are the declaration; this used to be a second one, a constant in this file, which meant the
		// reconcile could protect a branch requiring a check the manifest said nothing about.
		const fromLanes = this.protectedBranches().flatMap((lane) => lane.requiredChecks);
		return [...new Set(fromLanes)];
	}

	/**
	 * The branch protection lanes this repository declares.
	 *
	 * Every field the reconcile sends to GitHub is read from the document: which branch, which checks,
	 * how many approvals, whether admins are covered, whether branches must be up to date, and whether
	 * conversations must be resolved. None of it has a default here, and that is the point — a policy
	 * invented by the code is a policy nobody reviewed. A repository that declares no lanes has no
	 * branch protection, rather than a default the pipeline invented on its behalf.
	 */
	protectedBranches(): ProtectedBranch[] {
		const declared = this.data.protection;
		const lanes = isRecord(declared) ? declared.lanes : undefined;
		if (!Array.isArray(lanes)) return [];
		return lanes.filter(isRecord).map((lane) => ({
			branch: text(lane.branch),
			requiredChecks: Array.isArray(lane.required_checks) ? lane.required_checks.map((entry) => text(entry)) : [],
			approvals: typeof lane.approvals === "number" ? lane.approvals : 0,
			enforceAdmins: lane.enforce_admins === true,
			strict: lane.strict === true,
			resolveConversations: lane.resolve_conversations === true,
		}));
	}

	/**
	 * Every board this repository declares, in the order it declares them.
	 *
	 * There is no fixed number and no special board. The account aggregates as many Projects as
	 * there are reasons to, and a repository that names three gets three — each one created if it does
	 * not exist and linked so it appears in the repository's Projects tab. A repository's own board is
	 * added when it is not already listed, because a repository with no board of its own is one whose
	 * work is invisible in the account.
	 */
	boards(env: ManifestEnv = this.env): string[] {
		const board = isRecord(this.data.board) ? this.data.board : {};
		const declared = Array.isArray(board.boards)
			? board.boards.map((entry) => text(entry)).filter((title) => title.length > 0)
			: [];
		const own = this.projectTitle(env);
		if (own.length > 0 && !declared.includes(own)) declared.push(own);
		return declared;
	}

	/**
	 * The board that aggregates every repository in the account, named by reference.
	 *
	 * `global` names one of `boards` rather than being a second declaration of it, so the two cannot
	 * disagree. A repository that names a global board it does not declare is a configuration mistake
	 * and is reported as one, because the reconcile would otherwise create a board nothing links to.
	 */
	globalBoard(env: ManifestEnv = this.env): string | undefined {
		const board = isRecord(this.data.board) ? this.data.board : {};
		const declared = text(board.global);
		if (!declared) return undefined;
		return this.boards(env).includes(declared) ? declared : undefined;
	}

	/** The GitHub Pages source configuration, defaulting to the Actions build. */
	pages(): Record<string, Json> {
		const declared = withoutComments(this.data.pages);
		return Object.keys(declared).length > 0 ? declared : { build_type: "workflow" };
	}

	/** The request body the Pages API expects for `POST`/`PUT` on `repos/{slug}/pages`. */
	pagesPayload(): Record<string, Json> {
		const pages = this.pages();
		if (pages.build_type === "legacy") {
			return {
				build_type: "legacy",
				source: {
					branch: pages.branch === undefined || pages.branch === null ? "gh-pages" : pages.branch,
					path: pages.path === undefined || pages.path === null ? "/" : pages.path,
				},
			};
		}
		return {
			build_type: pages.build_type === undefined || pages.build_type === null ? "workflow" : pages.build_type,
		};
	}

	/**
	 * The pinned pipeline upstream.
	 *
	 * Both entries are null in the repository that *is* the upstream, where a pin would name a
	 * commit of itself.
	 */
	upstream(): { repo: string | null; ref: string | null } {
		const declared = withoutComments(this.data.upstream);
		return {
			repo: declared.repo === undefined || declared.repo === null ? null : text(declared.repo),
			ref: declared.ref === undefined || declared.ref === null ? null : text(declared.ref),
		};
	}

	/** Whether this repository is the pipeline's source of truth, which is to pin no upstream. */
	isUpstream(): boolean {
		return !this.upstream().repo;
	}
}

/**
 * Loads one semantic block from a repository's selected combined configuration document.
 *
 * Exposed because the document carries three blocks for three consumers, and a consumer that read
 * the file itself would re-implement discovery. An absent document or block is an empty
 * declaration rather than a failure: an installation has to render one.
 *
 * @param root Repository root.
 * @param block Block selected by the consumer.
 * @param env Environment mapping; defaults to the process environment.
 * @returns The selected block, or undefined when the document or the block is absent.
 * @throws When discovery is ambiguous or the selected document or block is malformed.
 */
export async function loadConfigBlock(
	root: string,
	block: "repo" | "docs" | "providers",
	env: ManifestEnv = process.env,
): Promise<Record<string, Json> | undefined> {
	const absoluteRoot = resolve(root);
	const path = resolveManifestPath(absoluteRoot, env);
	let source: string;
	try {
		source = await readFile(path, "utf8");
	} catch {
		return undefined;
	}
	return configBlock(parseConfigDocument(source, path), block, path);
}

/**
 * Loads a repository's `repo` block from the selected combined configuration.
 *
 * @param root Repository root.
 * @param env Environment mapping; defaults to the process environment.
 * @returns The manifest, with defaults applied where the block is absent.
 * @throws When discovery is ambiguous or the selected document or block is malformed.
 */
export async function loadRepositoryManifest(
	root: string,
	env: ManifestEnv = process.env,
): Promise<RepositoryManifest> {
	const absoluteRoot = resolve(root);
	const block = await loadConfigBlock(absoluteRoot, "repo", env);
	return new RepositoryManifest(absoluteRoot, block ?? {}, env);
}
