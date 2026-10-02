import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import type { GhRunner } from "./gh.ts";
import type { BoardGraphqlClient, BoardItemNode, ProjectFieldNode } from "./graphql.ts";
import type { BoardRestClient } from "./rest.ts";
import { type BoardRun, describeFailure, isRateLimited } from "./run.ts";
import { type LabelSource, statusOfFieldValues } from "./status.ts";
import { isStatusLabel, STATUS_FIELD_NAME, STATUS_NAMES } from "./taxonomy.ts";

/**
 * One board, addressed by project number.
 *
 * Field and option ids are discovered on first use and cached for the lifetime of the run: a board
 * rebuilt in the UI gets new ids, so a hardcoded one writes nowhere, and re-discovering per mutation
 * would spend the quota reserve on reads.
 */

/** Why an issue was closed, as GitHub records it. */
export type StateReason = "completed" | "not_planned";

/** How a `track` call should reach the board. */
export interface TrackOptions {
	/** The GraphQL node id of the item, when the caller already has it. */
	readonly contentId?: string | null;
	/**
	 * Skip the board listing and add the item directly.
	 *
	 * A real-time event knows the item's node id from its payload, so reading every board item to
	 * find out whether it is already there is a query it does not need to make. Reconciliation sets
	 * this to false, because it has already loaded the board and diffing in memory is free.
	 */
	readonly fastPath?: boolean;
}

/** What a lifecycle event is allowed to ask of a board. */
export interface BoardTarget {
	track(url: string, status: CanonicalStatus, options?: TrackOptions): Promise<void>;
	setStatusLabel(
		repo: string,
		number: number,
		status: CanonicalStatus | string,
		existingLabels?: readonly LabelSource[],
	): Promise<void>;
	addIssueLabel(repo: string, number: number, label: string): Promise<void>;
	closeIssue(repo: string, number: number, reason?: StateReason): Promise<void>;
}

/** A board item as the board holds it: its id, and the status currently projected onto it. */
interface BoardItemRecord {
	readonly itemId: string;
	readonly status: string | null;
}

/** Everything a reconciliation pass needs from a board, beyond the event surface. */
export interface ReconcilableBoard extends BoardTarget {
	readonly projectNumber: number;
	projectId(): Promise<string | null>;
	/** The last board listing this board read, so status reconciliation does not re-fetch it. */
	readonly rawItems: readonly BoardItemNode[] | null;
	loadExistingItems(): Promise<Map<string, BoardItemRecord>>;
	addItem(url: string, contentId?: string | null): Promise<string | null>;
	editStatus(itemId: string, status: CanonicalStatus): Promise<boolean>;
}

/** How a project client discovers what it cannot be told. */
interface ProjectClientOptions {
	/** The login that owns the project. */
	readonly owner: string;
	/** The project number within that owner. */
	readonly projectNumber: number;
	/** The REST client for repository work. */
	readonly rest: BoardRestClient;
	/** The GraphQL client for Projects v2 work. */
	readonly graphql: BoardGraphqlClient;
	/** The run this client reports against. */
	readonly run: BoardRun;
	/** The `gh` CLI fallback, or null to disable the fallback. */
	readonly cli?: GhRunner | null;
	/** An explicit Status field id, skipping discovery. */
	readonly statusFieldId?: string | null;
}

/** A client for one project board. */
export class ProjectClient implements ReconcilableBoard {
	readonly owner: string;
	readonly projectNumber: number;
	readonly rest: BoardRestClient;
	readonly graphql: BoardGraphqlClient;
	readonly #run: BoardRun;
	readonly #cli: GhRunner | null;
	/** The board's item cache, keyed by the content url every board item carries. */
	readonly items = new Map<string, BoardItemRecord>();
	/** The last board listing read, reused by status reconciliation so it is fetched once. */
	rawItems: readonly BoardItemNode[] | null = null;
	#projectId: string | null = null;
	#statusFieldId: string | null;
	#statusOptions: Record<string, string> | null = null;
	#itemsLoaded = false;

	constructor(options: ProjectClientOptions) {
		this.owner = options.owner;
		this.projectNumber = options.projectNumber;
		this.rest = options.rest;
		this.graphql = options.graphql;
		this.#run = options.run;
		this.#cli = options.cli ?? null;
		this.#statusFieldId = options.statusFieldId ?? null;
	}

	/** The node id of the project, resolved once and cached. */
	async projectId(): Promise<string | null> {
		if (this.#projectId !== null) return this.#projectId;
		const projects = await this.graphql.resolveProjects(this.owner);
		for (const project of projects.values()) {
			if (project.number === this.projectNumber) {
				this.#projectId = project.id;
				break;
			}
		}
		if (this.#projectId === null && this.#cli) {
			try {
				const output = this.#cli([
					"project",
					"view",
					String(this.projectNumber),
					"--owner",
					this.owner,
					"--format",
					"json",
				]);
				const parsed = JSON.parse(output) as { id?: string };
				this.#projectId = parsed.id ?? null;
			} catch (error) {
				if (isRateLimited(error)) this.#run.markRateLimited();
				this.#run.notice(`Could not resolve project id: ${describeFailure(error)}`);
			}
		}
		return this.#projectId;
	}

	/**
	 * Resolves the Status field and enforces the canonical taxonomy on it.
	 *
	 * Enforcement runs when the field is missing a column, which is the only way a board drifts: a
	 * board rebuilt in the UI without `Superseded` would otherwise map every superseded issue onto
	 * whatever column remained, silently losing the distinction.
	 */
	async #loadStatusField(): Promise<void> {
		if (this.#statusOptions !== null && this.#statusFieldId !== null) return;

		const projectId = await this.projectId();
		let fields: ProjectFieldNode[] = projectId === null ? [] : await this.graphql.getProjectFields(projectId);
		if (fields.length === 0 && this.#cli) {
			try {
				const output = this.#cli([
					"project",
					"field-list",
					String(this.projectNumber),
					"--owner",
					this.owner,
					"--format",
					"json",
					"--limit",
					"50",
				]);
				fields = (JSON.parse(output) as { fields?: ProjectFieldNode[] }).fields ?? [];
			} catch (error) {
				if (isRateLimited(error)) this.#run.markRateLimited();
				this.#run.notice(`Could not resolve Status field: ${describeFailure(error)}`);
				return;
			}
		}

		for (const field of fields) {
			if (field.name !== STATUS_FIELD_NAME) continue;
			this.#statusFieldId = this.#statusFieldId ?? field.id;
			const current = field.options ?? [];
			const present = new Set(current.map((option) => option.name));
			const missing = STATUS_NAMES.filter((name) => !present.has(name));
			if (missing.length > 0 && this.#statusFieldId) {
				this.#statusOptions = await this.graphql.enforceBoardTaxonomy(this.#statusFieldId, current);
			} else {
				this.#statusOptions = Object.fromEntries(
					current.flatMap((option) => (option.name && option.id ? [[option.name, option.id]] : [])),
				);
			}
			return;
		}
	}

	/** The id of the single-select Status field. */
	async statusFieldId(): Promise<string | null> {
		await this.#loadStatusField();
		return this.#statusFieldId;
	}

	/**
	 * The option id for a canonical status name, or null when the board has no such column.
	 *
	 * `ToDo` is looked up under both spellings because a column created in the UI can carry either,
	 * and refusing to write because of a space would leave the item where it was.
	 */
	async statusOptionId(statusName: string): Promise<string | null> {
		await this.#loadStatusField();
		const options = this.#statusOptions;
		if (!options) return null;
		if (options[statusName]) return options[statusName];
		const target = statusName.trim().toLowerCase();
		for (const [name, optionId] of Object.entries(options)) {
			const candidate = name.trim().toLowerCase();
			if (candidate === target) return optionId;
			if (target === "todo" && candidate === "to do") return optionId;
		}
		return null;
	}

	/**
	 * Reads the board's items into memory, keyed by content url.
	 *
	 * Cached for the run. Reconciliation then diffs against this map and writes only what differs, so
	 * a board that is already correct costs a listing and nothing else.
	 */
	async loadExistingItems(): Promise<Map<string, BoardItemRecord>> {
		if (this.#itemsLoaded) return this.items;
		this.#itemsLoaded = true;
		const projectId = await this.projectId();
		if (projectId === null) return this.items;

		try {
			const items = await this.graphql.fetchBoardItems(projectId, 1000);
			this.rawItems = items;
			for (const item of items) {
				const content = item.content ?? {};
				const url = content.url;
				if (url && content.id && content.number) {
					const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\//.exec(url);
					if (match) this.rest.rememberNodeId(`${match[1] ?? ""}/${match[2] ?? ""}`, content.number, content.id);
				}
				if (url && item.id) {
					this.items.set(url, { itemId: item.id, status: statusOfFieldValues(item.fieldValues) });
				}
			}
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`Could not load items for project ${this.projectNumber}: ${describeFailure(error)}`);
		}
		return this.items;
	}

	/** Adds an issue or pull request to the board, returning its item id. */
	async addItem(url: string, contentId?: string | null): Promise<string | null> {
		const known = contentId || (await this.#resolveContentId(url));
		if (known === null) {
			if (!this.#cli) return null;
			try {
				const output = this.#cli([
					"project",
					"item-add",
					String(this.projectNumber),
					"--owner",
					this.owner,
					"--url",
					url,
					"--format",
					"json",
				]);
				return (JSON.parse(output) as { id?: string }).id ?? null;
			} catch (error) {
				if (isRateLimited(error)) this.#run.markRateLimited();
				this.#run.fail(`adding ${url} to project ${this.projectNumber}: ${describeFailure(error)}`);
				return null;
			}
		}
		const projectId = await this.projectId();
		if (projectId === null) return null;
		return this.graphql.addItem(projectId, known);
	}

	/** The GraphQL node id behind a board content url, read from the repository when not cached. */
	async #resolveContentId(url: string): Promise<string | null> {
		const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/.exec(url);
		if (!match) return null;
		return this.rest.getNodeId(`${match[1] ?? ""}/${match[2] ?? ""}`, Number.parseInt(match[3] ?? "", 10));
	}

	/** Sets the Status field of a board item. */
	async editStatus(itemId: string, statusName: CanonicalStatus): Promise<boolean> {
		// Sequential, not concurrent: the option id and the field id come from one discovery pass, and
		// two overlapping passes would each read the field before either had written its cache.
		const optionId = await this.statusOptionId(statusName);
		const projectId = await this.projectId();
		const fieldId = await this.statusFieldId();
		if (!optionId || !projectId || !fieldId) {
			this.#run.notice(`Cannot set status "${statusName}": option=${optionId} project=${projectId} field=${fieldId}`);
			return false;
		}
		if (await this.graphql.updateItemStatus(projectId, itemId, fieldId, optionId)) return true;
		if (!this.#cli) return false;
		try {
			this.#cli([
				"project",
				"item-edit",
				"--id",
				itemId,
				"--project-id",
				projectId,
				"--field-id",
				fieldId,
				"--single-select-option-id",
				optionId,
				"--format",
				"json",
			]);
			return true;
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`Error editing status via fallback: ${describeFailure(error)}`);
			return false;
		}
	}

	/**
	 * Ensures the item at `url` is on the board carrying `status`.
	 *
	 * Check-before-write: an item already at that status costs nothing. There is no per-run mutation
	 * cap, so the only thing that stops a long run is the live quota reserve - a run that has quota
	 * finishes every item it was given rather than being truncated at an arbitrary count and leaving
	 * the board half-updated.
	 */
	async track(url: string, status: CanonicalStatus, options: TrackOptions = {}): Promise<void> {
		if (!this.#run.canMutate()) {
			if (this.#run.rateLimited) this.#run.say(`Notice: rate limited; deferring ${url} to next run.`);
			else {
				this.#run.say(
					`Notice: GraphQL quota reserve reached (${this.#run.graphqlRemaining} <= ${this.#run.quotaMinimum}); deferring ${url} to next run.`,
				);
			}
			return;
		}

		const cached = this.items.get(url);
		if (cached) {
			if (cached.status === status) return;
			if (await this.editStatus(cached.itemId, status)) {
				this.items.set(url, { itemId: cached.itemId, status });
				this.#run.recordMutation();
				this.#run.say(`${url} -> ${status} (project ${this.projectNumber})`);
			}
			return;
		}

		if (options.fastPath && options.contentId) {
			const projectId = await this.projectId();
			if (projectId === null) return;
			const itemId = await this.graphql.addItem(projectId, options.contentId);
			if (itemId === null) return;
			this.#run.recordMutation();
			if (await this.editStatus(itemId, status)) {
				this.#run.recordMutation();
				this.items.set(url, { itemId, status });
				this.#run.say(`${url} -> ${status} (project ${this.projectNumber})`);
			}
			return;
		}

		const existing = await this.loadExistingItems();
		const known = existing.get(url);
		if (known) {
			if (known.status === status) return;
			if (await this.editStatus(known.itemId, status)) {
				existing.set(url, { itemId: known.itemId, status });
				this.#run.recordMutation();
				this.#run.say(`${url} -> ${status} (project ${this.projectNumber})`);
			}
			return;
		}

		const itemId = await this.addItem(url, options.contentId);
		if (itemId === null) return;
		this.#run.recordMutation();
		if (await this.editStatus(itemId, status)) {
			this.#run.recordMutation();
			existing.set(url, { itemId, status });
			this.#run.say(`${url} -> ${status} (project ${this.projectNumber})`);
		}
	}

	/** Applies a status label exclusively, preserving every other label on the issue. */
	async setStatusLabel(
		repo: string,
		number: number,
		status: CanonicalStatus | string,
		existingLabels?: readonly LabelSource[],
	): Promise<void> {
		await this.rest.setStatusLabel(repo, number, status, existingLabels);
	}

	/**
	 * Adds a label to an issue, routing a status label through the exclusive setter.
	 *
	 * A status label added like any other would leave the item carrying two statuses, so the two
	 * paths are not interchangeable.
	 */
	async addIssueLabel(repo: string, number: number, label: string): Promise<void> {
		if (isStatusLabel(label)) {
			await this.setStatusLabel(repo, number, label);
			return;
		}
		await this.rest.addIssueLabel(repo, number, label);
	}

	/** Closes an issue, recording why. */
	async closeIssue(repo: string, number: number, reason: StateReason = "completed"): Promise<void> {
		await this.rest.closeIssue(repo, number, reason);
	}
}

/** Several boards addressed as one. */
export class BoardGroup implements ReconcilableBoard {
	readonly clients: readonly ProjectClient[];

	constructor(clients: readonly ProjectClient[]) {
		this.clients = clients;
	}

	/** The first client's project number, which is the one a caller without a group would address. */
	get projectNumber(): number {
		return this.clients[0]?.projectNumber ?? 0;
	}

	/** The first client's project, or null when the group is empty. */
	async projectId(): Promise<string | null> {
		return (await this.clients[0]?.projectId()) ?? null;
	}

	/** The first client's last board listing; a group reconciles each member's own listing. */
	get rawItems(): readonly BoardItemNode[] | null {
		return this.clients[0]?.rawItems ?? null;
	}

	/** Tracks the url on every board, because an item belongs to all the boards it is linked to. */
	async track(url: string, status: CanonicalStatus, options: TrackOptions = {}): Promise<void> {
		for (const client of this.clients) await client.track(url, status, options);
	}

	/** Preloads every board's items, so a sweep diffs in memory instead of querying per item. */
	async loadExistingItems(): Promise<Map<string, BoardItemRecord>> {
		for (const client of this.clients) await client.loadExistingItems();
		return this.clients[0]?.items ?? new Map();
	}

	/** Adds an item to the first board, which is where an item not already present is added. */
	async addItem(url: string, contentId?: string | null): Promise<string | null> {
		return (await this.clients[0]?.addItem(url, contentId)) ?? null;
	}

	/** Sets a status on the first board; the others agree because tracking is per board. */
	async editStatus(itemId: string, status: CanonicalStatus): Promise<boolean> {
		return (await this.clients[0]?.editStatus(itemId, status)) ?? false;
	}

	/**
	 * Applies a status label once, not once per board.
	 *
	 * A label belongs to the issue, not to a board. Applying it once per board means the second
	 * write races the first one's own delete of the previous status label.
	 */
	async setStatusLabel(
		repo: string,
		number: number,
		status: CanonicalStatus | string,
		existingLabels?: readonly LabelSource[],
	): Promise<void> {
		await this.clients[0]?.setStatusLabel(repo, number, status, existingLabels);
	}

	/** Adds a label once, for the same reason a status label is applied once. */
	async addIssueLabel(repo: string, number: number, label: string): Promise<void> {
		await this.clients[0]?.addIssueLabel(repo, number, label);
	}

	/** Closes an issue once. */
	async closeIssue(repo: string, number: number, reason: StateReason = "completed"): Promise<void> {
		await this.clients[0]?.closeIssue(repo, number, reason);
	}
}
