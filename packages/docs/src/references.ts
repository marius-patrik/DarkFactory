import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { resolveDocsConfigPath } from "./config.ts";
import type { DocsPage } from "./content.ts";

/** Extract actual CLI help text; fail closed on source format drift. */
export function cliUsageFromSource(source: string): readonly string[] {
	const block = /function usage\(\): string \{\s*return \[([\s\S]*?)\]\.join\("\\n"\);/u.exec(source)?.[1];
	if (!block) throw new Error("CLI usage() declaration could not be extracted.");
	const lines = [...block.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/gmu)].map((m) => JSON.parse(m[1]!) as string);
	if (lines.length < 15 || !lines.some((s) => s.includes("df --version")) || !lines.some((s) => s.includes("df graph")))
		throw new Error("CLI usage extraction is incomplete.");
	return lines;
}

function listPaths(value: unknown, prefix = "", depth = 0): string[] {
	if (!value || typeof value !== "object" || Array.isArray(value) || depth > 9) return [];
	const rows: string[] = [];
	for (const [name, child] of Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) {
		if (name.startsWith("$")) continue;
		const full = prefix ? `${prefix}.${name}` : name;
		const type = Array.isArray(child) ? "array" : child === null ? "null" : typeof child;
		rows.push(`| \`${full.replaceAll("|", "")}\` | ${type} |`);
		if (type === "object") rows.push(...listPaths(child, full, depth + 1));
	}
	return rows;
}

/** Generate CLI and config field references without exposing config values. */
export function generatedReferencePages(repoRoot: string): DocsPage[] {
	const cliPath = "packages/cli/src/cli.ts";
	if (!existsSync(resolve(repoRoot, cliPath))) throw new Error(`Missing CLI source: ${cliPath}`);
	const lines = cliUsageFromSource(readFileSync(resolve(repoRoot, cliPath), "utf8"));
	const configPath = resolveDocsConfigPath(repoRoot);
	const config = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
	const rows = listPaths(config);
	if (!rows.some((row) => row.includes("docs.version"))) throw new Error("Combined config lacks docs.version.");
	return [
		{
			id: "reference-cli",
			kind: "reference",
			title: "CLI command reference",
			source: cliPath,
			markdown:
				"# CLI command reference\n\nGenerated from `packages/cli/src/cli.ts::usage()`. Confirm actual installed help.\n\n```text\n" +
				lines.join("\n") +
				"\n```\n",
		},
		{
			id: "reference-config",
			kind: "reference",
			title: "Configuration field reference",
			source: relative(repoRoot, configPath).replaceAll("\\", "/"),
			markdown:
				"# Configuration field reference\n\nSource-backed JSON key paths and value types, with no values or secrets. Producer fields are not consumer defaults.\n\n| Field | JSON type |\n| --- | --- |\n" +
				rows.join("\n") +
				"\n",
		},
	];
}
