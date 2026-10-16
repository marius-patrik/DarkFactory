import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "../../../protocol/src/config-document.ts";

type JsonObject = Record<string, unknown>;
export type NativeConfigState = "in_sync" | "missing" | "unmanaged" | "modified" | "outdated";
export interface NativeConfigStatus {
	file: "pyproject.toml" | "properdocs.yml";
	state: NativeConfigState;
	message: string;
}

const MARKER =
	/^# darkfactory-native-sha256: ([0-9a-f]{64})\n# Generated from repo.dfconfig; do not edit directly\.\n/u;

function object(value: unknown, label: string): JsonObject {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label + " must be a JSON object");
	return value as JsonObject;
}

function key(name: string): string {
	return /^[A-Za-z0-9_-]+$/u.test(name) ? name : JSON.stringify(name);
}

function scalar(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "boolean") return String(value);
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	if (Array.isArray(value)) return "[" + value.map(scalar).join(", ") + "]";
	if (value && typeof value === "object") {
		const fields = Object.entries(value as JsonObject).map(([k, v]) => key(k) + " = " + scalar(v));
		return "{ " + fields.join(", ") + " }";
	}
	throw new Error("Unsupported TOML value: null, nonfinite number or undefined");
}

/** Render only declarative JSON values. No raw TOML snippets or executable configuration. */
export function renderPyproject(value: unknown): string {
	const tables = object(value, "repo.environment.native_pyproject");
	const lines: string[] = [];
	function renderTable(path: string[], table: JsonObject): void {
		const entries = Object.entries(table);
		const direct = entries.filter(([, v]) => !v || typeof v !== "object" || Array.isArray(v));
		const nested = entries.filter(([, v]) => v !== null && typeof v === "object" && !Array.isArray(v));
		if (path.length) {
			if (lines.length > 0) lines.push("");
			lines.push("[" + path.map(key).join(".") + "]");
		} else if (direct.length) {
			throw new Error("pyproject root must contain named TOML tables");
		}
		for (const [k, v] of direct) lines.push(key(k) + " = " + scalar(v));
		for (const [k, v] of nested) renderTable([...path, k], object(v, k));
	}
	renderTable([], tables);
	return lines.join("\n") + "\n";
}

/** YAML 1.2 is a superset of JSON; emitting strict JSON avoids ambiguous YAML scalar coercions. */
export function renderProperdocs(value: unknown, site: unknown): string {
	const config = { ...object(value, "docs.native_properdocs") };
	if ("site_name" in config || "site_description" in config) {
		throw new Error("Site metadata belongs exclusively to docs.site, not docs.native_properdocs");
	}
	const metadata = site === undefined ? {} : object(site, "docs.site");
	if (typeof metadata.name !== "string" || !metadata.name.trim())
		throw new Error("docs.site.name is required when docs.native_properdocs is declared");
	if (metadata.description !== undefined && typeof metadata.description !== "string")
		throw new Error("docs.site.description must be a string");
	return (
		JSON.stringify(
			{
				site_name: metadata.name,
				...(metadata.description !== undefined ? { site_description: metadata.description } : {}),
				...config,
			},
			null,
			2,
		) + "\n"
	);
}

function sealed(body: string): string {
	const sha = createHash("sha256").update(body).digest("hex");
	return "# darkfactory-native-sha256: " + sha + "\n# Generated from repo.dfconfig; do not edit directly.\n" + body;
}

/** No declaration means no ownership: native tool files stay entirely user-managed. */
export async function nativeConfigOutputs(root: string): Promise<Map<NativeConfigStatus["file"], string>> {
	const path = resolveConfigDocumentPath(root);
	if (!path) return new Map();
	const document = parseConfigDocument(await readFile(path, "utf8"), path);
	const repo = configBlock(document, "repo", path) ?? {};
	const docs = configBlock(document, "docs", path) ?? {};
	const environment = repo.environment === undefined ? {} : object(repo.environment, "repo.environment");
	const outputs = new Map<NativeConfigStatus["file"], string>();
	if (environment.native_pyproject !== undefined)
		outputs.set("pyproject.toml", sealed(renderPyproject(environment.native_pyproject)));
	if (docs.native_properdocs !== undefined)
		outputs.set("properdocs.yml", sealed(renderProperdocs(docs.native_properdocs, docs.site)));
	return outputs;
}

async function inspect(path: string, expected: string): Promise<NativeConfigState> {
	let existing: string;
	try {
		const meta = await lstat(path);
		if (!meta.isFile() || meta.isSymbolicLink()) return "unmanaged";
		existing = await readFile(path, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
		throw error;
	}
	if (existing === expected) return "in_sync";
	const match = MARKER.exec(existing);
	if (!match) return "unmanaged";
	const body = existing.slice(match[0].length);
	const digest = createHash("sha256").update(body).digest("hex");
	return digest === match[1] ? "outdated" : "modified";
}

/**
 * Safe, idempotent projection. Only missing files or untouched previously generated
 * files may be written. User-owned files and modified generated files are never overwritten.
 * In check mode, every mismatch is visible to CI as a non-green status.
 */
export async function reconcileNativeConfigs(root: string, write = false): Promise<NativeConfigStatus[]> {
	const expected = await nativeConfigOutputs(root);
	const planned = await Promise.all(
		[...expected].map(async ([file, content]) => ({ file, content, state: await inspect(join(root, file), content) })),
	);
	// A mixed safe/unsafe update is an all-or-nothing refusal. Do not generate one
	// file while leaving another user-owned declaration in a conflicted state.
	const blocked = planned.some((entry) => entry.state === "unmanaged" || entry.state === "modified");
	const results: NativeConfigStatus[] = [];
	for (const { file, content, state } of planned) {
		if (write && !blocked && (state === "missing" || state === "outdated")) {
			await writeFile(join(root, file), content, { flag: state === "missing" ? "wx" : "w" });
			results.push({ file, state: "in_sync", message: state === "missing" ? "generated" : "synchronized" });
		} else {
			results.push({ file, state, message: state === "in_sync" ? "verified" : "Review required" });
		}
	}
	return results;
}
