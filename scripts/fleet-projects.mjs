// One Projects v2 control plane for the entire managed fleet. A single
// owner-authorized credential lives in DarkFactory, not in every consumer.
// Repository access is independently scoped through the installed GitHub App.
import { pathToFileURL } from "node:url";
import { appendFileSync } from "node:fs";
import { api, appJwt, isFleetExcluded, pages } from "./fleet-sync.mjs";

export const GLOBAL_BOARD = "Global";

export function isProjectsQuotaExceeded(error) {
	return /(?:graphql_rate_limit|API rate limit already exceeded|GraphQL quota exhausted|secondary rate limit|rate limit reached)/i.test(
		String(error),
	);
}

export function reportQuotaDeferral(error, env = process.env) {
	const note =
		"DarkFactory Projects v2 reconciliation deferred: the owner-wide GitHub GraphQL quota is exhausted. No other repositories were modified; retry on the next scheduled self-only fleet reconciliation.";
	console.warn(note);
	console.warn(String(error));
	if (env.GITHUB_STEP_SUMMARY)
		appendFileSync(env.GITHUB_STEP_SUMMARY, "### Projects v2 — deferred (quota)\\n" + note + "\\n");
	return { deferred: true, reason: "GraphQL quota" };
}
export function projectsFor(repoName) {
	return [GLOBAL_BOARD, repoName];
}
export function managedRepositories(repositories, owner, upstream) {
	return repositories.filter(
		(repo) =>
			!repo.archived &&
			!repo.disabled &&
			repo.full_name?.split("/")[0]?.toLowerCase() === owner.toLowerCase() &&
			!isFleetExcluded(repo.full_name),
	);
}

async function graph(token, query, variables = {}) {
	const response = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: "Bearer " + token,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
			"User-Agent": "DarkFactory-Fleet-Projects",
		},
		body: JSON.stringify({ query, variables }),
	});
	const text = await response.text();
	if (!response.ok) throw new Error("Projects GraphQL " + response.status + ": " + text.slice(0, 350));
	const result = JSON.parse(text);
	if (result.errors?.length) throw new Error("Projects GraphQL: " + JSON.stringify(result.errors).slice(0, 600));
	if (!result.data) throw new Error("Projects GraphQL response has no data");
	return result.data;
}

export function registerProjectTitle(index, project) {
	if (index.has(project.title)) index.set(project.title, null);
	else index.set(project.title, project);
}

export function selectedManagedProject(index, title) {
	const project = index.get(title);
	if (index.has(title) && !project) throw new Error("Ambiguous duplicate managed Project: " + title);
	return project;
}

async function readOwnerProjects(login, token) {
	const byTitle = new Map();
	let ownerId = null,
		cursor = null;
	do {
		const data = await graph(
			token,
			"query($login:String!,$after:String){user(login:$login){id projectsV2(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{id number title closed}}}}",
			{ login, after: cursor },
		);
		const user = data.user;
		if (!user?.id) throw new Error("Projects owner " + login + " cannot be resolved");
		ownerId = user.id;
		for (const project of user.projectsV2.nodes ?? []) {
			registerProjectTitle(byTitle, project);
		}
		cursor = user.projectsV2.pageInfo.hasNextPage ? user.projectsV2.pageInfo.endCursor : null;
		if (cursor === "") throw new Error("Project listing cannot advance");
	} while (cursor);
	return { ownerId, byTitle };
}

async function ensureProject(title, ownerId, projects, token) {
	let project = selectedManagedProject(projects, title);
	if (project?.closed) throw new Error("Project " + title + " is closed; refusing to replace it");
	if (project) return project;
	const data = await graph(
		token,
		"mutation($owner:ID!,$title:String!){createProjectV2(input:{ownerId:$owner,title:$title}){projectV2{id number title}}}",
		{ owner: ownerId, title },
	);
	project = data.createProjectV2?.projectV2;
	if (!project?.id) throw new Error("Project creation did not return id for " + title);
	projects.set(title, project);
	console.log("Created project " + title + " #" + project.number);
	return project;
}

async function linkedRepositoryNames(projectId, token) {
	const linked = new Set();
	let cursor = null;
	do {
		const data = await graph(
			token,
			"query($id:ID!,$after:String){node(id:$id){... on ProjectV2{repositories(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{nameWithOwner}}}}}",
			{ id: projectId, after: cursor },
		);
		const conn = data.node?.repositories;
		if (!conn) throw new Error("Could not read linked repositories for project " + projectId);
		for (const repo of conn.nodes ?? []) linked.add(repo.nameWithOwner.toLowerCase());
		cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
		if (cursor === "") throw new Error("Repository link listing cannot advance");
	} while (cursor);
	return linked;
}

async function ensureLink(project, slug, repositoryNodeId, token, linkedCache) {
	let linked = linkedCache.get(project.id);
	if (!linked) {
		linked = await linkedRepositoryNames(project.id, token);
		linkedCache.set(project.id, linked);
	}
	if (linked.has(slug.toLowerCase())) return false;
	await graph(
		token,
		"mutation($projectId:ID!,$repoId:ID!){linkProjectV2ToRepository(input:{projectId:$projectId,repositoryId:$repoId}){repository{id}}}",
		{ projectId: project.id, repoId: repositoryNodeId },
	);
	linked.add(slug.toLowerCase());
	return true;
}

async function projectIssueUrls(projectId, token) {
	const urls = new Set();
	let cursor = null;
	do {
		const data = await graph(
			token,
			"query($id:ID!,$after:String){node(id:$id){... on ProjectV2{items(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{content{... on Issue{id url}}}}}}}",
			{ id: projectId, after: cursor },
		);
		const connection = data.node?.items;
		if (!connection) throw new Error("Could not read items in project " + projectId);
		for (const entry of connection.nodes ?? []) {
			if (entry.content?.url) urls.add(entry.content.url);
		}
		cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
		if (cursor === "") throw new Error("Project item listing cannot advance");
	} while (cursor);
	return urls;
}

async function addMissingIssue(project, issue, token, cache) {
	let urls = cache.get(project.id);
	if (!urls) {
		urls = await projectIssueUrls(project.id, token);
		cache.set(project.id, urls);
	}
	if (urls.has(issue.html_url)) return false;
	const data = await graph(
		token,
		"mutation($projectId:ID!,$issueId:ID!){addProjectV2ItemById(input:{projectId:$projectId,contentId:$issueId}){item{id}}}",
		{ projectId: project.id, issueId: issue.node_id },
	);
	if (!data.addProjectV2ItemById?.item?.id)
		throw new Error("Adding " + issue.html_url + " to " + project.title + " did not return item");
	urls.add(issue.html_url);
	return true;
}

export async function runFleetProjects(env = process.env) {
	const owner = env.DF_FLEET_OWNER || "marius-patrik";
	const upstream = owner + "/DarkFactory";
	if (!env.GH_PROJECT_TOKEN)
		throw new Error(
			"Set GH_PROJECT_TOKEN once in DarkFactory's Actions secrets with Projects v2 read/write permissions",
		);
	if (!env.DARKFACTORY_APP_PRIVATE_KEY)
		throw new Error("DARKFACTORY_APP_PRIVATE_KEY must be configured for fleet repository reads");
	const jwt = appJwt(env.DARKFACTORY_APP_ID || "4861004", env.DARKFACTORY_APP_PRIVATE_KEY);
	const installations = await pages("/app/installations", jwt);
	const installation = installations.find(
		(x) => x.account?.login?.toLowerCase() === owner.toLowerCase() && !x.suspended_at,
	);
	if (!installation) throw new Error("Active GitHub App installation not found for " + owner);
	const { token: appToken } = await api("POST", "/app/installations/" + installation.id + "/access_tokens", jwt, {});
	const repositories = managedRepositories(
		await pages("/installation/repositories", appToken, (p) => p.repositories),
		owner,
		upstream,
	).filter((repo) => env.DF_FLEET_CONSUMERS_ENABLED === "1" || repo.full_name.toLowerCase() === upstream.toLowerCase());
	if (!repositories.some((r) => r.full_name.toLowerCase() === upstream.toLowerCase()))
		throw new Error("Self-hosted DarkFactory repo missing from App installation");
	const { ownerId, byTitle } = await readOwnerProjects(owner, env.GH_PROJECT_TOKEN);
	const global = await ensureProject(GLOBAL_BOARD, ownerId, byTitle, env.GH_PROJECT_TOKEN);
	const links = new Map(),
		items = new Map();
	const stats = { repositories: 0, projectsCreated: 0, linksCreated: 0, issuesAdded: 0, issuesChecked: 0 };
	for (const repo of repositories.sort((a, b) => a.full_name.localeCompare(b.full_name))) {
		const name = repo.name || repo.full_name.split("/")[1];
		const existed = byTitle.has(name);
		const scoped = await ensureProject(name, ownerId, byTitle, env.GH_PROJECT_TOKEN);
		if (!existed) stats.projectsCreated++;
		const repository = await api("GET", "/repos/" + repo.full_name, appToken);
		if (!repository.node_id) throw new Error("Missing node_id for " + repo.full_name);
		for (const project of [scoped, global]) {
			if (await ensureLink(project, repo.full_name, repository.node_id, env.GH_PROJECT_TOKEN, links))
				stats.linksCreated++;
		}
		const issues = await pages("/repos/" + repo.full_name + "/issues?state=all", appToken);
		const onlyIssues = issues.filter((issue) => !issue.pull_request);
		for (const issue of onlyIssues) {
			if (!issue.node_id || !issue.html_url) throw new Error("Issue missing node_id/url");
			for (const project of [scoped, global]) {
				if (await addMissingIssue(project, issue, env.GH_PROJECT_TOKEN, items)) stats.issuesAdded++;
			}
		}
		stats.issuesChecked += onlyIssues.length;
		stats.repositories++;
		console.log(repo.full_name + ": " + onlyIssues.length + " issues checked in scoped and global boards");
	}
	console.log(JSON.stringify(stats, null, 2));
	return stats;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	runFleetProjects().catch((error) => {
		if (isProjectsQuotaExceeded(error)) {
			reportQuotaDeferral(error);
			return;
		}
		console.error(error);
		process.exitCode = 1;
	});
}
