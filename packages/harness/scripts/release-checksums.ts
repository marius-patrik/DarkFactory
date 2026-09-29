import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * SHA-256 records for the files a release attaches, in `sha256sum` format.
 *
 * A user on any of the five published platforms has to be able to check what they downloaded, and
 * `sha256sum -c` is the one format all of them can already read. Each target records its own digest
 * in the job that built and ran it, and the record is re-checked here over the bytes that actually
 * arrived, so a corrupted artifact upload fails the release instead of being checksummed as though
 * it were correct.
 */

/** One file's digest, as it appears in a `sha256sum` line. */
export interface ReleaseChecksum {
	name: string;
	sha256: string;
}

export const CHECKSUMS_FILE = "checksums.txt";

/** The suffix a per-target digest record carries, so several can travel in one artifact set. */
export const RECORD_SUFFIX = ".sha256";

/** One `sha256sum -c` line: a digest, whitespace, and the name. The `*` marks binary mode. */
const CHECKSUM_LINE = /^(?<sha256>[0-9a-f]{64})[ \t]+\*?(?<name>.+)$/u;

/** Hashes one file in the release directory. */
export async function checksumFile(directory: string, name: string): Promise<ReleaseChecksum> {
	const content = await readFile(join(directory, name));
	return { name, sha256: createHash("sha256").update(content).digest("hex") };
}

/** Hashes every named file, sorted by name so the record is byte-identical across runs. */
export async function checksumFiles(directory: string, names: readonly string[]): Promise<ReleaseChecksum[]> {
	const sorted = [...new Set(names)].sort();
	return Promise.all(sorted.map((name) => checksumFile(directory, name)));
}

/** Renders portable `sha256sum -c` lines: `<digest><two spaces><name>`. */
export function renderChecksums(entries: readonly ReleaseChecksum[]): string {
	return entries.map((entry) => `${entry.sha256}  ${entry.name}\n`).join("");
}

/** Writes a digest record beside the artifacts and returns what it wrote. */
export async function writeReleaseChecksums(
	directory: string,
	names: readonly string[],
	fileName: string = CHECKSUMS_FILE,
): Promise<string> {
	const text = renderChecksums(await checksumFiles(directory, names));
	await writeFile(join(directory, fileName), text);
	return text;
}

/**
 * Re-hashes the downloaded files and reports every disagreement with the record.
 *
 * The record is treated as untrusted input: a name it lists that no longer exists, or a digest
 * that no longer matches, is a finding rather than something to skip.
 */
export async function verifyReleaseChecksums(
	directory: string,
	text: string,
): Promise<{ checked: number; findings: string[] }> {
	const findings: string[] = [];
	const expected = text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const groups = CHECKSUM_LINE.exec(line)?.groups;
			return { name: groups?.name ?? line, sha256: groups?.sha256 ?? "" };
		});

	const present = new Set(await readdir(directory));
	for (const { name, sha256 } of expected) {
		if (!present.has(name)) {
			findings.push(`${name}: listed in ${CHECKSUMS_FILE} but missing from the downloaded release`);
			continue;
		}
		const actual = await checksumFile(directory, name);
		if (actual.sha256 !== sha256) findings.push(`${name}: expected sha256 ${sha256}, got ${actual.sha256}`);
	}
	return { checked: expected.length, findings };
}

/**
 * Turns the per-target digest records in a directory into one release-wide record.
 *
 * Every record is checked before any file is re-hashed, so a record naming a file that never
 * arrived is reported as that, rather than as the raw read error it would otherwise raise. Nothing
 * is written when a record fails: a release whose published checksums do not describe the published
 * bytes is worse than no release, because a user who verifies it is told the download is intact
 * when it is not.
 */
export async function collectReleaseChecksums(directory: string): Promise<{ assets: string[]; checksums: string }> {
	const records = (await readdir(directory)).filter((name) => name.endsWith(RECORD_SUFFIX)).sort();
	if (records.length === 0) {
		throw new Error(`No ${RECORD_SUFFIX} digest records in ${directory}; nothing was built to publish.`);
	}

	const findings: string[] = [];
	const names: string[] = [];
	for (const record of records) {
		const text = await readFile(join(directory, record), "utf8");
		const result = await verifyReleaseChecksums(directory, text);
		findings.push(...result.findings);
		names.push(...parseNames(text));
	}
	if (findings.length > 0) {
		throw new Error(
			`Downloaded release artifacts do not match the digests recorded at build time:\n${findings.join("\n")}`,
		);
	}

	const verified = (await checksumFiles(directory, names)).sort((a, b) => a.name.localeCompare(b.name));
	const checksums = renderChecksums(verified);
	await writeFile(join(directory, CHECKSUMS_FILE), checksums);
	return { assets: verified.map((entry) => entry.name), checksums };
}

function parseNames(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => CHECKSUM_LINE.exec(line)?.groups?.name ?? line);
}

if (import.meta.main) {
	const directory = process.argv[2] ?? process.cwd();
	const { assets, checksums } = await collectReleaseChecksums(directory);
	process.stdout.write(`verified ${assets.length} artifacts against their build-time digests\n`);
	process.stdout.write(checksums);
}
