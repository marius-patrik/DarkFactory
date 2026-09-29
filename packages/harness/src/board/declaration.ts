import { readFileSync } from "node:fs";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "../../../protocol/src/config-document.ts";

/**
 * Which boards this repository is linked to, read from the one declaration.
 *
 * Boards are owned by the account, not by a repository, so a project number in the environment is
 * not a declaration of anything: it is a fallback for a repository that declares no boards at all.
 * The titles come from `repo.dfconfig` - `board.link_boards` names the boards that appear in this
 * repository's Projects tab, and `board.global_title` names the one aggregating every repository -
 * so adding a board is a configuration change, not a code change.
 */

/** The board declarations, plus the identity fields the automation needs alongside them. */
export interface BoardDeclaration {
	/** The login that owns the boards. */
	readonly owner: string;
	/** This repository's slug. */
	readonly repo: string;
	/** The title of this repository's own scoped board. */
	readonly projectTitle: string;
	/** The title of the board aggregating every repository, or null when there is none. */
	readonly globalBoardTitle: string | null;
	/** Every board linked to this repository, this one included. */
	readonly linkedBoards: readonly string[];
	/** The branch whose pushes reconcile the board. */
	readonly defaultBranch: string;
	/** The integration branch, whose pushes also reconcile the board. */
	readonly developmentBranch: string;
	/** Every repository this pipeline is installed on. */
	readonly installedOn: readonly string[];
}

/** A record read out of the configuration, with every field optional. */
type Section = Record<string, unknown>;

/** A string field, or the fallback when it is absent or empty. */
function text(section: Section, key: string, fallback: string): string {
	const value = section[key];
	return typeof value === "string" && value !== "" ? value : fallback;
}

/** A nested object, or an empty one when the key is absent. */
function section(parent: Section, key: string): Section {
	const value = parent[key];
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Section) : {};
}

/** A list of strings, ignoring anything that is not one. */
function stringList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/**
 * Reads the board declarations for a checkout.
 *
 * Throws when there is no configuration document to read. Callers that can carry on without one -
 * a webhook arriving before a checkout, a consumer repository that declares no boards - catch this
 * and fall back, because an unreadable declaration must not read as "no boards exist" and silently
 * leave every item untracked.
 */
function loadBoardDeclaration(root: string): BoardDeclaration {
	const path = resolveConfigDocumentPath(root);
	if (!path) throw new Error(`No DarkFactory configuration document found under ${root}.`);
	const document = parseConfigDocument(readFileSync(path, "utf8"), path);
	const repo = configBlock(document, "repo", path);
	if (!repo) throw new Error(`DarkFactory configuration at ${path} declares no repo block.`);

	const identity = section(repo, "identity");
	const board = section(repo, "board");
	const app = section(repo, "app");
	const owner = text(identity, "owner", "");
	const repoName = text(identity, "repo", "");
	const displayName = text(identity, "display_name", repoName);
	const projectTitle = text(identity, "project_title", displayName);
	const defaultBranch = text(identity, "default_branch", "main");
	const globalTitle = text(board, "global_title", "");

	const linkedBoards = stringList(board.link_boards);
	if (!linkedBoards.includes(projectTitle)) linkedBoards.push(projectTitle);

	return {
		owner,
		repo: repoName,
		projectTitle,
		globalBoardTitle: globalTitle === "" ? null : globalTitle,
		linkedBoards,
		defaultBranch,
		developmentBranch: text(identity, "development_branch", defaultBranch),
		installedOn: stringList(app.installed_on),
	};
}

/** The declarations, or null when they cannot be read. */
export function boardDeclarationOrNull(root: string): BoardDeclaration | null {
	try {
		return loadBoardDeclaration(root);
	} catch {
		return null;
	}
}
