import type { CanonicalStatus } from "@darkfactory/protocol/workflow";
import type { BoardTarget, StateReason, TrackOptions } from "../../src/board/client.ts";
import type { LabelSource } from "../../src/board/status.ts";
import type { GitHubFetch } from "../../src/github/transport.ts";

/**
 * Doubles for the board automation's edges.
 *
 * The production edges are two HTTP clients and a `gh` subprocess. A double answers at the same
 * seam - a `fetch`, a runner - rather than reaching inside the client, so every assertion here is
 * about what the automation *asked GitHub to do*, which is the thing that actually has to be right.
 */

/** One request an automation made, as the fake transport saw it. */
export interface RecordedRequest {
	readonly method: string;
	readonly url: string;
	readonly path: string;
	readonly query: URLSearchParams;
	readonly body: unknown;
}

/** What a fake transport answers with: a body, or a status and body. */
export interface FakeAnswer {
	readonly status?: number;
	readonly body?: unknown;
	readonly headers?: Record<string, string>;
}

/** A transport that records every request and answers from a table. */
export interface FakeTransport {
	readonly fetch: GitHubFetch;
	readonly requests: RecordedRequest[];
}

/**
 * A transport whose answers are decided by a handler.
 *
 * The handler sees the decoded body, so a test can key on the GraphQL operation name or the REST
 * path rather than on a URL that carries a cursor.
 */
export function fakeTransport(handler: (request: RecordedRequest) => FakeAnswer | undefined): FakeTransport {
	const requests: RecordedRequest[] = [];
	const fetch: GitHubFetch = async (input, init) => {
		const fromRequest = input instanceof Request ? input : null;
		const url = new URL(String(input));
		const method = (init?.method ?? fromRequest?.method ?? "GET").toUpperCase();
		const raw = typeof init?.body === "string" ? init.body : "";
		const request: RecordedRequest = {
			method,
			url: url.toString(),
			path: url.pathname,
			query: url.searchParams,
			body: raw ? (JSON.parse(raw) as unknown) : undefined,
		};
		requests.push(request);
		const answer = handler(request) ?? {};
		return new Response(answer.body === undefined ? "" : JSON.stringify(answer.body), {
			status: answer.status ?? 200,
			headers: { "content-type": "application/json", ...answer.headers },
		});
	};
	return { fetch, requests };
}

/** A transport that answers each distinct request from a fixed table. */
export function routedTransport(routes: Record<string, FakeAnswer>): FakeTransport {
	return fakeTransport((request) => routes[`${request.method} ${request.path}`] ?? routes[request.path]);
}

/** One thing a recording target was asked to do. */
export type RecordedAction =
	| { readonly kind: "track"; readonly url: string; readonly status: CanonicalStatus; readonly options: TrackOptions }
	| {
			readonly kind: "status-label";
			readonly repo: string;
			readonly number: number;
			readonly status: string;
			readonly existingLabels: readonly LabelSource[] | undefined;
	  }
	| { readonly kind: "label"; readonly repo: string; readonly number: number; readonly label: string }
	| {
			readonly kind: "close";
			readonly repo: string;
			readonly number: number;
			readonly reason: StateReason | undefined;
	  };

/**
 * A board target that records instead of writing.
 *
 * `track` also records the status through the same `editStatus`-shaped path a real client uses, so a
 * test can assert on the sequence of board writes the way the Python suite asserted on
 * `edited_statuses`.
 */
export class RecordingTarget implements BoardTarget {
	readonly actions: RecordedAction[] = [];
	readonly addedItems: { url: string; itemId: string }[] = [];
	readonly editedStatuses: { itemId: string; status: string }[] = [];
	#next = 0;

	/** The statuses written to the board, in order, as `itemId -> status` pairs. */
	get statuses(): { itemId: string; status: string }[] {
		return this.editedStatuses;
	}

	/** The `setStatusLabel` calls alone, as `repo -> number -> status` triples. */
	get statusLabels(): { repo: string; number: number; status: string }[] {
		return this.actions.flatMap((action) =>
			action.kind === "status-label" ? [{ repo: action.repo, number: action.number, status: action.status }] : [],
		);
	}

	/** The `closeIssue` calls alone, as `repo -> number` pairs. */
	get closedIssues(): { repo: string; number: number }[] {
		return this.actions.flatMap((action) =>
			action.kind === "close" ? [{ repo: action.repo, number: action.number }] : [],
		);
	}

	/** The `addIssueLabel` calls alone, as `repo -> number -> label` triples. */
	get addedLabels(): { repo: string; number: number; label: string }[] {
		return this.actions.flatMap((action) =>
			action.kind === "label" ? [{ repo: action.repo, number: action.number, label: action.label }] : [],
		);
	}

	async track(url: string, status: CanonicalStatus, options: TrackOptions = {}): Promise<void> {
		this.actions.push({ kind: "track", url, status, options });
		this.#next += 1;
		const itemId = `item-${this.#next}`;
		this.addedItems.push({ url, itemId });
		this.editedStatuses.push({ itemId, status });
	}

	async setStatusLabel(
		repo: string,
		number: number,
		status: CanonicalStatus | string,
		existingLabels?: readonly LabelSource[],
	): Promise<void> {
		this.actions.push({ kind: "status-label", repo, number, status, existingLabels });
	}

	async addIssueLabel(repo: string, number: number, label: string): Promise<void> {
		this.actions.push({ kind: "label", repo, number, label });
	}

	async closeIssue(repo: string, number: number, reason: StateReason = "completed"): Promise<void> {
		this.actions.push({ kind: "close", repo, number, reason });
	}
}
