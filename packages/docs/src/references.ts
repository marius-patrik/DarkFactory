import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import * as ts from "typescript";
import { resolveDocsConfigPath } from "./config.ts";
import type { DocsPage } from "./content.ts";

/** Extract actual CLI help text; fail closed on source format drift. */
export function cliUsageFromSource(source: string): readonly string[] {
	const block = /function usage\(\): string \{\s*return \[([\s\S]*?)\]\.join\("\\n"\);/u.exec(source)?.[1];
	if (!block) throw new Error("CLI usage() declaration could not be extracted.");
	const lines = [...block.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/gmu)].map((m) => {
		const literal = m[1];
		if (!literal) throw new Error("Missing CLI help string literal");
		return JSON.parse(literal) as string;
	});
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

/** Index declared TypeScript package exports from AST, never infer private or inherited APIs. */
export function declaredPackageApiIndex(repoRoot: string): readonly string[] {
	const root = resolve(repoRoot, "packages");
	if (!existsSync(root)) throw new Error("First-party package directory missing");
	const rows: string[] = [];
	for (const entry of readdirSync(root, { withFileTypes: true }).filter((item) => item.isDirectory())) {
		const pkgRoot = join(root, entry.name);
		const metaPath = join(pkgRoot, "package.json");
		const indexPath = join(pkgRoot, "src", "index.ts");
		if (!existsSync(metaPath) || !existsSync(indexPath)) continue;
		const meta = JSON.parse(readFileSync(metaPath, "utf8")) as { name?: unknown };
		if (typeof meta.name !== "string" || !meta.name) throw new Error(`Invalid package name in ${metaPath}`);
		const source = ts.createSourceFile(indexPath, readFileSync(indexPath, "utf8"), ts.ScriptTarget.Latest, true);
		for (const statement of source.statements) {
			let names: string[] = [];
			if (ts.isExportDeclaration(statement)) {
				if (!statement.exportClause) names = ["*"];
				else if (ts.isNamedExports(statement.exportClause))
					names = statement.exportClause.elements.map((item) => item.name.text);
				else if (ts.isNamespaceExport(statement.exportClause)) names = [statement.exportClause.name.text];
			} else if (ts.isExportAssignment(statement)) {
				names = ["default"];
			} else if (
				ts.canHaveModifiers(statement) &&
				ts.getModifiers(statement)?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
			) {
				if (ts.isVariableStatement(statement))
					names = statement.declarationList.declarations.map((item) => item.name.getText(source));
				else {
					const named = statement as ts.NamedDeclaration;
					if (named.name && ts.isIdentifier(named.name)) names = [named.name.text];
				}
			}
			const path = relative(repoRoot, indexPath).replaceAll("\\", "/");
			for (const name of names)
				rows.push(
					["| `", meta.name, "` | `", path, "` | `", name.replaceAll("`", "").replaceAll("|", "\\|"), "` |"].join(""),
				);
		}
	}
	if (!rows.length) throw new Error("No declared public TypeScript entrypoint exports");
	return rows.sort((a, b) => a.localeCompare(b));
}
/** Generate source-backed CLI, configuration and TS entrypoint references. */
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
		{
			id: "reference-typescript-exports",
			kind: "reference",
			title: "Declared TypeScript public entrypoints",
			source: "packages/docs/src/references.ts",
			markdown: `# Declared TypeScript entrypoint exports\n\nThis source-built index lists syntactically exported declarations and re-exports in first-party \`src/index.ts\`. It is **not** a complete semantic API or compatibility guarantee. Configured strict TypeDoc JSON provides deeper references.\n\n| Package | Source | Export |\n| --- | --- | --- |\n${declaredPackageApiIndex(repoRoot).join("\n")}\n`,
		},
	];
}
