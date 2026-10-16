/**
 * CI-only external-boundary fixture. The parent process executes the genuine
 * production CLI, GitHub adapter, dispatcher and issue handler. The synthetic
 * responses replace only GitHub HTTP and the outbound model process.
 */
import { appendFileSync } from "node:fs";

const observed = "/workspace/dispatch-observed.ndjson";
const record = (event: Record<string, unknown>): void => {
	appendFileSync(observed, `${JSON.stringify(event)}\n`);
};

if (process.argv[2] === "run") {
	record({ kind: "model", args: process.argv.slice(2) });
	console.log(JSON.stringify({ type: "text_delta", delta: "Verified model response from controlled fixture." }));
	process.exit(0);
}

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
	const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
	const body = init?.body === undefined ? "" : String(init.body);
	if (url.origin !== "https://api.github.com") throw new Error(`Unexpected external request: ${url}`);
	record({ kind: "github", method, path: url.pathname, body });

	const issue = "/repos/marius-patrik/DarkFactory/issues/77";
	const respond = (value: unknown): Response =>
		new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });

	if (method === "GET" && url.pathname === issue) {
		return respond({ number: 77, title: "Agent fixture", body: "Interpret this example request", labels: [] });
	}
	if (method === "POST" && url.pathname === `${issue}/labels`) {
		return respond([{ name: "Request" }]);
	}
	if (method === "POST" && url.pathname === `${issue}/comments`) {
		return respond({ id: 1, body: JSON.parse(body).body });
	}
	return new Response(JSON.stringify({ message: "Unexpected fixture request" }), {
		status: 404,
		headers: { "content-type": "application/json" },
	});
};
