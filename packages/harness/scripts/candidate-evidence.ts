/** Records bytes and source identity for an unpublished DF-17 technical candidate. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { CAPABILITY_ABI_VERSION } from "../../capability/src/abi.ts";
import { RELEASE_TARGETS } from "./release-targets.ts";

const root = resolve(import.meta.dir, "../../..");
function option(name: string): string | undefined {
	const i = process.argv.indexOf(name);
	return i < 0 ? undefined : process.argv[i + 1];
}
function git(...args: string[]): string {
	return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}
function versionOf(command: string, ...args: string[]): string {
	try {
		return execFileSync(command, args, { encoding: "utf8" }).trim();
	} catch {
		return "unavailable";
	}
}
function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}
async function inventory(directory: string): Promise<{ path: string; bytes: number; sha256: string }[]> {
	const result: { path: string; bytes: number; sha256: string }[] = [];
	async function walk(path: string): Promise<void> {
		for (const entry of (await readdir(join(directory, path), { withFileTypes: true })).sort((a, b) =>
			a.name.localeCompare(b.name),
		)) {
			const rel = join(path, entry.name);
			if (entry.isSymbolicLink()) throw new Error(`Candidate contains symlink: ${rel}`);
			if (entry.isDirectory()) await walk(rel);
			else if (entry.isFile()) {
				const bytes = await readFile(join(directory, rel));
				result.push({ path: rel.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) });
			} else throw new Error(`Unsupported candidate asset: ${rel}`);
		}
	}
	await walk("");
	return result;
}
async function base() {
	const sourceSha = git("rev-parse", "HEAD");
	if (!/^[a-f0-9]{40}$/u.test(sourceSha) || (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== sourceSha))
		throw new Error("Checkout source SHA differs from the workflow identity");
	const sourceTree = git("rev-parse", "HEAD^{tree}");
	const lock = await readFile(join(root, "bun.lock"));
	const version = (await readFile(join(root, "VERSION"), "utf8")).trim();
	if (version !== "1.0.0") throw new Error(`DF-17 candidate must remain 1.0.0, not ${version}`);
	return {
		schemaVersion: 1,
		kind: "unpublished-technical-candidate",
		repository: "marius-patrik/DarkFactory",
		source: { commit: sourceSha, tree: sourceTree, lockSha256: sha256(lock) },
		version,
		capabilityAbi: CAPABILITY_ABI_VERSION,
		targets: RELEASE_TARGETS.map((t) => t.name),
		toolchain: {
			bun: versionOf("bun", "--version"),
			node: versionOf("node", "--version"),
			npm: versionOf("npm", "--version"),
			git: versionOf("git", "--version"),
			os: process.platform,
			arch: process.arch,
		},
		ci: {
			runId: process.env.GITHUB_RUN_ID ?? null,
			attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
			job: process.env.GITHUB_JOB ?? null,
			commit: process.env.GITHUB_SHA ?? null,
		},
	};
}
async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(resolve(path)), { recursive: true });
	await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}
async function platform(): Promise<void> {
	const name = option("--target");
	const target = RELEASE_TARGETS.find((t) => t.name === name);
	if (!target || process.platform !== target.platform || process.arch !== target.arch)
		throw new Error("Native candidate evidence must be collected by its actual target runner");
	const directory = resolve(option("--directory") ?? "packages/harness/dist");
	const output = resolve(option("--out") ?? join(directory, `candidate-${name}.json`));
	const assets = await inventory(directory);
	const binary = target.platform === "win32" ? `df-${name}.exe` : `df-${name}`;
	for (const required of [binary, `${binary}.tar.gz`, `${binary}.sha256`]) {
		if (!assets.some((file) => file.path === required)) throw new Error(`Missing real target artifact: ${required}`);
	}
	const bundle = assets.find((a) => a.path === `${binary}.tar.gz`)!;
	const raw = assets.find((a) => a.path === binary)!;
	const record = await readFile(join(directory, `${binary}.sha256`), "utf8");
	if (!record.includes(raw.sha256) || !record.includes(bundle.sha256))
		throw new Error("Native build-time checksum record differs from produced bytes");
	if (!assets.some((a) => a.path.startsWith("plugins/") && a.path.endsWith("capability.mjs")))
		throw new Error("Candidate contains no bundled official capability");
	for (const required of ["assets/graph.darkfactory.json", "schemas/graph.schema.json", "photon_rs_bg.wasm"])
		if (!assets.some((a) => a.path === required)) throw new Error(`Missing source-free resource: ${required}`);
	await writeJson(output, {
		...(await base()),
		target: target.name,
		runner: target.runner,
		buildCommand: `bun run build --target=${name}`,
		verificationCommand: `bun packages/harness/scripts/verify-target.ts --target ${name}`,
		nativeExecution: "Runner invokes verification before this manifest is generated; see retained verification log",
		artifacts: assets,
	});
	console.log(`Candidate manifest: ${relative(root, output)} (${assets.length} hashed files)`);
}
async function snapshot(): Promise<void> {
	const directory = resolve(option("--directory") ?? ".");
	const output = option("--out");
	if (!output) throw new Error("snapshot requires --out");
	const assets = await inventory(directory);
	if (!assets.length) throw new Error("Cannot attest an empty candidate artifact directory");
	await writeJson(output, { ...(await base()), artifacts: assets });
	console.log(`Recorded ${assets.length} candidate files from ${directory}`);
}
async function sbom(): Promise<void> {
	const output = option("--out");
	if (!output) throw new Error("sbom requires --out");
	// Bun v2 lockfiles are JSON with trailing commas; strip only syntactic trailing commas.
	const lock = (await readFile(join(root, "bun.lock"), "utf8")).replace(/,\s*([}\]])/gu, "$1");
	const parsed = JSON.parse(lock) as { packages: Record<string, [string, string, Record<string, unknown>, string?]> };
	const components = [];
	const missingLicenses: string[] = [];
	for (const [lockKey, entry] of Object.entries(parsed.packages).sort(([a], [b]) => a.localeCompare(b))) {
		// Nested Bun lock keys describe installation paths, not the actual npm identity.
		const resolved = entry[0];
		const separator = resolved.lastIndexOf("@");
		if (separator <= 0) throw new Error(`Invalid resolved package identity: ${resolved}`);
		const name = resolved.slice(0, separator);
		const version = resolved.slice(separator + 1);
		const metadata = join(root, "node_modules", ...name.split("/"), "package.json");
		let license: string | undefined;
		if (existsSync(metadata)) {
			const json = JSON.parse(await readFile(metadata, "utf8")) as { license?: string };
			if (typeof json.license === "string") license = json.license;
		}
		if (!license) missingLicenses.push(name);
		const hash = entry[3];
		components.push({
			type: "library",
			name,
			version,
			"bom-ref": `pkg:npm/${encodeURIComponent(name)}@${version}#${encodeURIComponent(lockKey)}`,
			...(hash?.startsWith("sha512-")
				? { hashes: [{ alg: "SHA-512", content: Buffer.from(hash.slice(7), "base64").toString("hex") }] }
				: {}),
			...(license ? { licenses: [{ license: { name: license } }] } : {}),
		});
	}
	const source = await base();
	await writeJson(output, {
		bomFormat: "CycloneDX",
		specVersion: "1.5",
		version: 1,
		metadata: {
			component: { type: "application", name: "DarkFactory", version: source.version },
			properties: [
				{ name: "darkfactory:source-sha", value: source.source.commit },
				{ name: "darkfactory:lock-sha256", value: source.source.lockSha256 },
			],
		},
		components,
	});
	const report = { packages: components.length, licenseUnknown: missingLicenses.length, missingLicenses };
	await writeJson(`${output}.license-report.json`, report);
	console.log(JSON.stringify({ packages: report.packages, licenseUnknown: report.licenseUnknown }));
	if (!components.length) throw new Error("Cannot produce an empty SBOM");
}
async function verifyDownloaded(): Promise<void> {
	const directory = resolve(option("--directory") ?? "candidate/evidence");
	const identity = await base();
	const statuses: { target: string; files: number; sha256: string }[] = [];
	for (const target of RELEASE_TARGETS) {
		const folder = join(directory, `candidate-native-${target.name}`);
		const file = join(folder, `candidate-${target.name}.json`);
		const document = JSON.parse(await readFile(file, "utf8")) as {
			source: { commit: string; tree: string; lockSha256: string };
			version: string;
			capabilityAbi: string;
			target: string;
			runner: string;
			artifacts: { path: string; bytes: number; sha256: string }[];
		};
		if (
			document.source.commit !== identity.source.commit ||
			document.source.tree !== identity.source.tree ||
			document.source.lockSha256 !== identity.source.lockSha256 ||
			document.version !== identity.version ||
			document.capabilityAbi !== identity.capabilityAbi ||
			document.target !== target.name ||
			document.runner !== target.runner
		) {
			throw new Error(`Native candidate identity mismatch: ${target.name}`);
		}
		if (!document.artifacts.length) throw new Error(`Native inventory empty: ${target.name}`);
		for (const item of document.artifacts) {
			if (!item.path || item.path.startsWith("/") || item.path.split("/").includes(".."))
				throw new Error(`Unsafe candidate artifact path: ${item.path}`);
			const bytes = await readFile(join(folder, item.path));
			if (bytes.length !== item.bytes || sha256(bytes) !== item.sha256)
				throw new Error(`Candidate file changed after native attestation: ${target.name}/${item.path}`);
		}
		const executable = target.platform === "win32" ? `df-${target.name}.exe` : `df-${target.name}`;
		const bin = document.artifacts.find((item) => item.path === executable);
		const archive = document.artifacts.find((item) => item.path === `${executable}.tar.gz`);
		if (!bin || !archive) throw new Error(`Missing native release bytes: ${target.name}`);
		const verificationLog = await readFile(join(folder, `verification-${target.name}.log`), "utf8");
		for (const checkpoint of ["standalone packaging smoke", "standalone graph", "standalone quality"]) {
			if (!verificationLog.includes(checkpoint))
				throw new Error(`Native execution receipt lacks ${checkpoint}: ${target.name}`);
		}
		statuses.push({ target: target.name, files: document.artifacts.length, sha256: archive.sha256 });
	}
	for (const required of ["candidate-npm", "candidate-web-docs", "candidate-docker", "candidate-supply-chain"]) {
		if (!existsSync(join(directory, required))) throw new Error(`Missing candidate evidence group: ${required}`);
	}
	await writeJson(resolve(option("--out") ?? "candidate/native-validation.json"), {
		kind: "df17-download-readback",
		source: identity.source,
		targets: statuses,
		allOfficialTargetsMatched: true,
	});
	console.log(JSON.stringify({ verified: statuses.length, targets: statuses }));
}
switch (process.argv[2]) {
	case "platform":
		await platform();
		break;
	case "snapshot":
		await snapshot();
		break;
	case "sbom":
		await sbom();
		break;
	case "verify-downloaded":
		await verifyDownloaded();
		break;
	default:
		throw new Error("Usage: candidate-evidence.ts <platform|snapshot|sbom> [--target N] [--directory DIR] --out FILE");
}
