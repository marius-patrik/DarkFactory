import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const API = "https://api.github.com";
export const EXPECTED_SELF_PROJECTS = ["DarkFactory", "Global"];

export function parseProjectsPage(data) {
	const entries = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : null;
	if (!entries)
		throw new Error("Unexpected Projects v2 REST response shape; refusing to assume the owner's projects are empty");
	for (const project of entries) {
		if (!project || typeof project.title !== "string" || !Number.isInteger(project.number))
			throw new Error("Projects v2 REST entry lacks title/number");
	}
	return entries;
}

export function nextProjectsUrl(link) {
	const entry = String(link || "")
		.split(",")
		.find((part) => /rel="next"/.test(part));
	if (!entry) return null;
	const match = /<([^>]+)>/.exec(entry);
	if (!match) throw new Error("Projects v2 pagination link is malformed");
	const next = new URL(match[1]);
	if (next.origin !== API || !next.pathname.startsWith("/users/") || !next.pathname.endsWith("/projectsV2"))
		throw new Error("Projects v2 pagination link leaves the official user-project endpoint");
	return next.toString();
}

export async function readProjectsRest(owner, token, fetcher = fetch, requiredTitles = null) {
	if (!/^[A-Za-z0-9-]+$/.test(owner) || !token)
		throw new Error("User-owned Projects v2 requires a classic project-scoped user token");
	const byTitle = new Map();
	const selected = requiredTitles === null ? null : new Set(requiredTitles);
	let url = API + "/users/" + owner + "/projectsV2?per_page=100";
	const visited = new Set();
	while (url) {
		if (visited.has(url)) throw new Error("Repeated Projects v2 pagination cursor");
		visited.add(url);
		const response = await fetcher(url, {
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: "Bearer " + token,
				"X-GitHub-Api-Version": "2026-03-10",
				"User-Agent": "DarkFactory-Self-Projects",
			},
		});
		if (!response.ok)
			throw new Error(
				"Projects v2 REST read failed (" + response.status + "): " + (await response.text()).slice(0, 250),
			);
		const entries = parseProjectsPage(await response.json());
		for (const project of entries) {
			// The REST list endpoint has no documented state filter. Ignore closed
			// projects immediately: they are historical, not active board candidates.
			if (project.closed_at || project.state === "closed") continue;
			// Only open, explicitly managed projects require unique titles.
			if (selected && !selected.has(project.title)) continue;
			if (byTitle.has(project.title)) throw new Error("Ambiguous duplicate owner Project: " + project.title);
			byTitle.set(project.title, {
				title: project.title,
				number: project.number,
				id: project.node_id || null,
				closed: false,
			});
		}
		url = nextProjectsUrl(response.headers.get("link"));
	}
	return byTitle;
}

export async function runSelfProjectsRest(env = process.env) {
	const owner = env.DF_FLEET_OWNER || "marius-patrik";
	const projects = await readProjectsRest(owner, env.GH_PROJECT_TOKEN, fetch, EXPECTED_SELF_PROJECTS);
	const summary = {
		owner,
		readOnly: true,
		projectsFound: projects.size,
		required: EXPECTED_SELF_PROJECTS.map((title) => {
			const project = projects.get(title);
			return { title, number: project?.number ?? null, present: !!project && !project.closed };
		}),
	};
	console.log(JSON.stringify(summary, null, 2));
	if (env.GITHUB_STEP_SUMMARY) {
		appendFileSync(
			env.GITHUB_STEP_SUMMARY,
			"\n### Self-hosted Projects v2 REST inventory\n\n" + JSON.stringify(summary, null, 2) + "\n",
		);
	}
	return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	runSelfProjectsRest().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
