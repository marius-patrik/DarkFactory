/** Executable read-only Chromium acceptance of a locally served, immutable Web/Docs artifact. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { createRequire } from "node:module";

const root = resolve(process.argv[2] ?? "site");
const home = process.env.DF_PLAYWRIGHT_HOME;
if (!home) throw new Error("DF_PLAYWRIGHT_HOME must reference isolated installed Playwright");
const require = createRequire(join(resolve(home), "package.json"));
const { chromium } = require("playwright");
const basePath = "/DarkFactory/";
const screenshotDir = resolve(process.env.DF_BROWSER_SCREENSHOTS ?? "site-browser-screenshots");
await mkdir(screenshotDir, { recursive: true });
const mime = (p) =>
	p.endsWith(".html")
		? "text/html; charset=utf-8"
		: p.endsWith(".js")
			? "text/javascript; charset=utf-8"
			: p.endsWith(".json")
				? "application/json; charset=utf-8"
				: p.endsWith(".css")
					? "text/css; charset=utf-8"
					: "application/octet-stream";
const server = createServer(async (req, res) => {
	try {
		const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
		if (!pathname.startsWith(basePath)) {
			res.writeHead(404).end("Not found");
			return;
		}
		const rel = pathname.slice(basePath.length);
		const file = resolve(root, rel.endsWith("/") || !rel ? join(rel, "index.html") : rel);
		if (!file.startsWith(root + sep)) {
			res.writeHead(404).end("Not found");
			return;
		}
		const data = await readFile(file);
		res.writeHead(200, { "Content-Type": mime(file), "Cache-Control": "no-store" }).end(data);
	} catch {
		res.writeHead(404).end("Not found");
	}
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = "http://127.0.0.1:" + server.address().port;
const url = origin + basePath;
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (err) => errors.push(err.message));
page.on("request", (request) => {
	if (/\\bAuthorization\\b/i.test(JSON.stringify(request.headers())))
		errors.push("Browser request exposed Authorization header");
});
await page.route("https://api.github.com/**", (route) => {
	const pathname = new URL(route.request().url()).pathname;
	const data = pathname.endsWith("/DarkFactory")
		? {
				full_name: "marius-patrik/DarkFactory",
				default_branch: "main",
				private: false,
				open_issues_count: 42,
				updated_at: "2026-10-31T00:00:00Z",
				html_url: "https://github.com/marius-patrik/DarkFactory",
			}
		: pathname.endsWith("/issues")
			? [
					{
						id: 1,
						number: 1,
						title: "Browser test Request",
						state: "open",
						labels: [{ name: "Request" }],
						html_url: "https://github.com/marius-patrik/DarkFactory/issues/1",
					},
				]
			: [];
	return route.fulfill({
		status: 200,
		contentType: "application/json",
		headers: { "Access-Control-Allow-Origin": "*" },
		body: JSON.stringify(data),
	});
});
try {
	let response = await page.goto(url, { waitUntil: "domcontentloaded" });
	assert.equal(response?.status(), 200);
	await page.getByRole("heading", { name: "Overview" }).waitFor({ timeout: 15000 });
	await page.getByText("Public read-only · no confidential broker configured").waitFor();
	await page.getByRole("link", { name: "Requests", exact: true }).click();
	await page.getByRole("heading", { name: "Requests", exact: true }).waitFor();
	assert.equal(new URL(page.url()).hash, "#/requests");
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.getByRole("heading", { name: "Requests", exact: true }).waitFor();
	await page.screenshot({ path: join(screenshotDir, "requests-desktop.png"), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("navigation", { name: "Operator sections" }).waitFor();
	await page.screenshot({ path: join(screenshotDir, "requests-mobile.png"), fullPage: true });
	response = await page.goto(url + "docs/", { waitUntil: "domcontentloaded" });
	assert.equal(response?.status(), 200);
	assert.match(await page.locator("body").innerText(), /DarkFactory/i);
	response = await page.goto(url + "docs/reference-runtime-contracts/", { waitUntil: "domcontentloaded" });
	assert.equal(response?.status(), 200);
	assert.match(await page.locator("body").innerText(), /workflow|approval|capability/i);
	response = await page.goto(url + "docs/guide-reference-coverage/", { waitUntil: "domcontentloaded" });
	assert.equal(response?.status(), 200);
	assert.match(await page.locator("body").innerText(), /Documentation coverage/i);
	const blocked = await browser.newPage();
	await blocked.route("**/darkfactory-web.json", (route) => route.fulfill({ status: 403 }));
	await blocked.goto(url, { waitUntil: "domcontentloaded" });
	await blocked.getByRole("alert").getByText("DarkFactory Web is unavailable").waitFor();
	assert.equal(await blocked.getByRole("button", { name: "Sign in with GitHub" }).count(), 0);
	await blocked.close();
	assert.deepEqual(errors, [], "Browser app errors or unexpected authorization headers");
	console.log("DF07 real Chromium smoke PASS: desktop, mobile, hashes, docs, fail-closed public config.");
} finally {
	await page.close();
	await browser.close();
	await new Promise((done) => server.close(done));
}
