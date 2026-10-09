/** @packageDocumentation
 * The parts of a reinstall that change an existing installation.
 *
 * Never overwriting a file meant a reinstall could not *update* anything either: the callers kept
 * their old pin, so the one thing a consumer most needs from a reinstall - adopting a pipeline
 * release - was the one thing it could not do. So a reinstall edits the pin, repairs the one line
 * generated callers need and hand-written ones often lack, and fills in configuration keys an
 * installation written earlier did not have. Everything else a repository has written stays exactly
 * as it is.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { loadRepositoryManifest, MANIFEST_PATH, resolveManifestPath } from "./manifest.ts";

/**
 * Matches whatever a caller's `uses:` line pins.
 *
 * Deliberately not restricted to a commit SHA. Some callers were generated pinning a *branch*
 * (`...ci.yml@darkfactory`), which is not a pin at all - it silently follows whatever lands there,
 * so the diff a bump is supposed to show never exists. A pattern that only matched SHAs left those
 * exactly as they were, which is the one case that most needed fixing.
 */
const PIN_PATTERN = /(\.github\/workflows\/[\w.-]+\.ya?ml@)\S+/gu;

/**
 * Matches a caller's `pipeline-ref:` input, quoted or not.
 *
 * The quotes are optional because a hand-written caller need not use them, and omnis's did not - so
 * its `pipeline-ref:` kept a commit sixteen versions older than the `uses:` line above it, and the
 * pipeline's own drift test failed on the repository the repin had just "updated".
 */
const REF_INPUT_PATTERN = /pipeline-ref:(?<pre>\s*)(?<quote>"?)(?<ref>[^"\s]*)\k<quote>/gu;

/** Matches the pinned `ref:` of a direct runtime checkout. */
const DIRECT_CI_REF_PATTERN = /^(\s*ref:\s*")[^"]+("\s*$)/gmu;

/**
 * One GitHub Actions expression, built from its body.
 *
 * A workflow file spells an expression `${{ ... }}`, which is not a template literal and reads as
 * one to every tool that looks at this string. Assembling the delimiters keeps the two apart.
 */
function expression(body: string): string {
	return `$\{{ ${body} }}`;
}

/**
 * The App key's name when a repository declares none.
 *
 * The name every installed workflow reads, and therefore the only correct answer for a repository with
 * no `app.private_key_secret` of its own. A constant rather than a literal at the two use sites below,
 * because a third copy is what this change is removing.
 */
const DEFAULT_APP_KEY_SECRET = "DARKFACTORY_APP_PRIVATE_KEY";

/** The step name that marks a workflow as checking the pinned runtime out directly. */
const DIRECT_CI_MARKER = "Check out pinned DarkFactory runtime";

/**
 * Every workflow file in a directory, sorted, or an empty list when the directory is absent.
 *
 * Both extensions, because both are workflow files to GitHub and the choice of one is a consumer's
 * rather than the pipeline's: matching only `.yml` meant a repository that writes `ci.yaml` got a
 * reinstall that silently changed nothing and stayed pinned to a commit sixteen releases old. A
 * filter that skips files is worse than one that fails - the reinstall reported success.
 */
async function workflowFiles(directory: string): Promise<string[]> {
	if (!existsSync(directory)) return [];
	const entries = await readdir(directory);
	return entries.filter((name) => name.endsWith(".yml") || name.endsWith(".yaml")).sort();
}

/**
 * Repoints an existing installation at a new pipeline commit.
 *
 * Only the commit in a `uses:` line, the `pipeline-ref:` input and a direct checkout's `ref:` change;
 * every other line a repository has written stays exactly as it is.
 *
 * @param root Repository root.
 * @param ref Pipeline commit to point at. An empty ref changes nothing and writes nothing.
 * @returns Paths whose pin changed.
 */
export async function retarget(root: string, ref: string): Promise<string[]> {
	if (!ref) return [];
	const changed: string[] = [];
	const directory = join(root, ".github", "workflows");

	for (const name of await workflowFiles(directory)) {
		const path = join(directory, name);
		const content = await readFile(path, "utf8");

		// A direct checkout pins the runtime with a `ref:` of its own rather than a `uses:` line, so
		// it needs the pattern that finds it - and only that workflow is entitled to rewrite one.
		const direct = name === "ci.yml" && content.includes(DIRECT_CI_MARKER);
		let updated = direct
			? content.replaceAll(
					DIRECT_CI_REF_PATTERN,
					(_match, prefix: string, suffix: string) => `${prefix}${ref}${suffix}`,
				)
			: content.replaceAll(PIN_PATTERN, (_match, prefix: string) => `${prefix}${ref}`);
		updated = updated.replaceAll(
			REF_INPUT_PATTERN,
			(_match, pre: string, quote: string) => `pipeline-ref:${pre}${quote}${ref}${quote}`,
		);

		if (updated === content) continue;
		await writeFile(path, updated, "utf8");
		console.log(`  repinned .github/workflows/${name}`);
		changed.push(`.github/workflows/${name}`);
	}
	return changed;
}

/**
 * Adds `secrets: inherit` to a caller that passes none.
 *
 * A called workflow sees none of its caller's secrets unless they are passed, and a caller written
 * before that mattered passes nothing - which is why formatting commits were once pushed with
 * `GITHUB_TOKEN` and checked nothing. Generated callers emit this line, so the repair here is for
 * callers that predate it and for hand-written ones.
 *
 * An explicit secrets *list* is a deliberate choice and is not widened, with one exception: the App
 * key is not a preference but the difference between a workflow that can mint an installation token
 * and one that silently falls back to a person's quota.
 *
 * @param root Repository root.
 * @returns Paths that gained the line.
 */
export async function ensureSecretsPass(root: string): Promise<string[]> {
	const changed: string[] = [];
	const directory = join(root, ".github", "workflows");

	// The secret's *name* is declared in `repo.dfconfig` as `app.private_key_secret`, and it used to be
	// written out as a literal here. Two copies of one fact: a repository that renamed the secret kept a
	// declaration saying one thing and a reinstaller injecting another, and the two disagreed silently -
	// the "already passed it?" check looked for the old name, so a caller already carrying the *declared*
	// name was not recognised and the literal was appended beside it. A reinstall therefore grew a second
	// entry for a secret that does not exist.
	//
	// Read from the repository being repaired rather than from this pipeline's own configuration, because
	// the file being edited belongs to the consumer. Falling back to this pipeline's name is the honest
	// default for a repository with no declaration: it is the name the installed workflows use.
	let secretName = DEFAULT_APP_KEY_SECRET;
	try {
		secretName = (await loadRepositoryManifest(root)).appKeySecret() ?? DEFAULT_APP_KEY_SECRET;
	} catch {
		// A malformed document is reported by the install that reads it; this repair must not refuse to
		// run because of it.
	}

	for (const name of await workflowFiles(directory)) {
		const path = join(directory, name);
		// Line terminators are kept, so an inserted line inherits the file's own endings rather than
		// introducing a mixed-line-ending file.
		const lines = (await readFile(path, "utf8")).split(/(?<=\n)/u);

		// A repository's own workflow is not the pipeline's to edit.
		if (!lines.some((line) => line.includes(".github/workflows/") && line.includes("uses:"))) continue;

		const explicit = lines.findIndex((line) => line.trimStart().startsWith("secrets:"));
		if (explicit !== -1) {
			if (lines[explicit]?.trim() !== "secrets:") continue;
			if (lines.some((line) => line.includes(secretName))) continue;
			const indent = " ".repeat(leadingWidth(lines[explicit] ?? "") + 2);
			lines.splice(explicit + 1, 0, `${indent}${secretName}: ${expression(`secrets.${secretName}`)}\n`);
			await writeFile(path, lines.join(""), "utf8");
			console.log(`  passed the App key in .github/workflows/${name}`);
			changed.push(`.github/workflows/${name}`);
			continue;
		}

		// After the last input, which every caller ends with, so the line lands inside the job.
		let lastInput = -1;
		for (const [index, line] of lines.entries()) {
			if (line.includes("pipeline-ref:")) lastInput = index;
		}
		if (lastInput === -1) continue;
		// One level *less* than the input, because `secrets:` is a sibling of `with:`'s contents.
		// Clamped at zero: a `pipeline-ref:` at the left margin - a hand-written caller with no job
		// indentation at all - would otherwise ask `String.repeat` for a negative count and throw
		// RangeError, turning a repairable caller into a reinstall that fails.
		const indent = " ".repeat(Math.max(0, leadingWidth(lines[lastInput] ?? "") - 2));
		lines.splice(lastInput + 1, 0, `${indent}secrets: inherit\n`);
		await writeFile(path, lines.join(""), "utf8");
		console.log(`  passed secrets in .github/workflows/${name}`);
		changed.push(`.github/workflows/${name}`);
	}
	return changed;
}

/** The number of leading whitespace characters on a line. */
function leadingWidth(line: string): number {
	return line.length - line.trimStart().length;
}

/** A JSON value read out of a configuration document. */
type Json = unknown;

function isRecord(value: Json): value is Record<string, Json> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON with object keys ordered, so two documents can be compared for equality. */
function stableStringify(value: Json): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	if (isRecord(value)) {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
}

/**
 * Fills in missing `repo` block keys without overwriting repository choices.
 *
 * The upstream pin is updated because moving that pin is the purpose of reinstall/update; every other
 * missing key takes the generated value and every present one is left alone.
 *
 * @param root Repository root.
 * @param ref Pipeline commit to pin.
 * @param planned The combined configuration this installation would generate.
 * @returns True when the combined configuration changed.
 * @throws When either document is malformed or the `repo` block is missing.
 */
export async function reconcileManifest(root: string, ref: string, planned: string): Promise<boolean> {
	const path = resolveManifestPath(root);
	if (!existsSync(path)) return false;

	const current = JSON.parse(await readFile(path, "utf8")) as Json;
	if (!isRecord(current)) {
		throw new Error(`DarkFactory configuration at ${path} must contain an object.`);
	}
	const currentRepo = current.repo;
	if (!isRecord(currentRepo)) {
		throw new Error(`DarkFactory configuration at ${path} is missing the repo block.`);
	}
	const generated = JSON.parse(planned) as Json;
	if (!isRecord(generated) || !isRecord(generated.repo)) {
		throw new Error("Generated DarkFactory configuration is missing the repo block.");
	}
	const generatedRepo = generated.repo;
	const before = stableStringify(current);

	for (const [key, value] of Object.entries(generatedRepo)) {
		if (!(key in currentRepo)) currentRepo[key] = value;
	}
	if (ref) {
		// `upstream` is filled from the generated document above only when the key is *absent*, so a
		// key that is present-but-null escaped it. The generated manifest always spells
		// `upstream.repo` out, and a manifest that has it null is what the pipeline's own repository
		// looks like: `manifest.upstream()` reads a null `repo` as "this repository is the upstream",
		// so a consumer whose config came from there - or from any install written before the pin
		// carried a repository - was left with no pin at all. A reinstall of such a repository moved
		// `ref` and nothing else, and the callers kept `uses:` lines pointing at nothing.
		//
		// A non-null `repo` is a choice, not a gap: it is how a consumer pins a fork of the pipeline
		// rather than the pipeline itself. It is left exactly as written, because filling it from the
		// generated document would silently repoint a fork's consumers at this repository - and `ref`
		// still moves below, which is the reinstall's one job and was already true before this change.
		// A fork that wants this pipeline's commits asks for them by name.
		const upstream = isRecord(currentRepo.upstream) ? { ...currentRepo.upstream } : {};
		if (upstream.repo === undefined || upstream.repo === null) {
			const declared = generatedRepo.upstream;
			upstream.repo = isRecord(declared) ? declared.repo : null;
		}
		upstream.ref = ref;
		currentRepo.upstream = upstream;
	}

	if (stableStringify(current) === before) return false;

	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(current, null, 2)}\n`, "utf8");
	console.log(`  reconciled ${relative(root, path)}`);
	return true;
}

/** Re-exported so a caller planning an installation need not import two modules for one path. */
export { MANIFEST_PATH };
