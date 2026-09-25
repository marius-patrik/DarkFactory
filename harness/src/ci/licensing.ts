import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
import type { GitHubClient } from "../github/client.ts";

/**
 * Licences offered to a repository, as SPDX identifiers.
 *
 * Deliberately a short list rather than everything SPDX knows. A licence nobody in this family uses
 * is a licence nobody has thought about, and offering it invites picking one by accident.
 */
export const OFFERED_LICENCES = [
	"GPL-3.0",
	"AGPL-3.0",
	"LGPL-2.1",
	"Apache-2.0",
	"MIT",
	"BSD-3-Clause",
	"MPL-2.0",
	"CC0-1.0",
	"Unlicense",
] as const;

/** Declared when a repository is deliberately not licensed for reuse. */
export const NO_LICENCE = "NONE";

/** The licence a repository declares, with the manifest's silence defaulted. */
export interface DeclaredLicence {
	/** SPDX identifier, or {@link NO_LICENCE}. */
	spdx: string;
	/** Copyright holder, for licences that name one. */
	holder: string;
	/** Copyright year, likewise. */
	year: string;
}

/**
 * Reads the licence block from the repository manifest.
 *
 * @param root Repository root.
 * @returns The declared licence, defaulted where the manifest is silent.
 */
export async function declaredLicence(root: string): Promise<DeclaredLicence> {
	const path = resolveConfigDocumentPath(root);
	if (!path) return { spdx: NO_LICENCE, holder: "", year: "" };
	const document = parseConfigDocument(await readFile(path, "utf8"), path);
	const block = (configBlock(document, "repo", path)?.license ?? {}) as Record<string, unknown>;
	const text = (value: unknown): string => (value === undefined || value === null ? "" : String(value));
	return {
		spdx: text(block.spdx) || NO_LICENCE,
		holder: text(block.holder),
		year: text(block.year),
	};
}

/**
 * Fetches the canonical licence text and fills in its placeholders.
 *
 * The text comes from GitHub's licence API rather than being bundled: a bundled copy is a fork of a
 * legal document that quietly drifts from the canonical wording.
 *
 * @param client Authenticated GitHub client.
 * @param spdx SPDX identifier.
 * @param holder Copyright holder, for licences that name one.
 * @param year Copyright year, likewise.
 * @returns The licence text, or `undefined` when GitHub does not know the identifier.
 */
export async function licenceBody(
	client: GitHubClient,
	spdx: string,
	holder = "",
	year = "",
): Promise<string | undefined> {
	let text: string;
	try {
		const data = await client.rest<{ body?: unknown }>("GET", `/licenses/${spdx.toLowerCase()}`);
		if (typeof data.body !== "string") return undefined;
		text = data.body;
	} catch {
		return undefined;
	}
	// Only the bracketed placeholders are substituted. GPL and AGPL carry an appendix showing a
	// user what to put in their *own* source files, written with angle brackets; filling those in
	// rewrites instructions as though they were a copyright notice, which is why GitHub leaves them
	// alone too.
	if (holder) text = text.replaceAll("[fullname]", holder);
	if (year) text = text.replaceAll("[year]", year);
	return text;
}

export interface ApplyLicenceOptions {
	/** Repository root holding the manifest and the LICENSE file. */
	root: string;
	/** Client used to fetch canonical licence text. */
	client: GitHubClient;
	/** Progress and warning sink. */
	log?: (message: string) => void;
}

/**
 * Writes the declared licence into the repository.
 *
 * @param options Root, client and sink.
 * @returns The SPDX identifier written, or `undefined` when nothing was written.
 */
export async function applyLicence({ root, client, log = () => {} }: ApplyLicenceOptions): Promise<string | undefined> {
	const declared = await declaredLicence(root);
	const target = join(root, "LICENSE");

	if (declared.spdx === NO_LICENCE) {
		// Deliberately unlicensed is a choice, so an existing LICENSE is removed rather than left
		// contradicting the declaration.
		if (existsSync(target)) {
			await rm(target);
			log("Removed LICENSE: the manifest declares no licence.");
		} else {
			log("No licence declared, and none present.");
		}
		return undefined;
	}

	if (!(OFFERED_LICENCES as readonly string[]).includes(declared.spdx)) {
		log(`${declared.spdx} is not one of the offered licences: ${OFFERED_LICENCES.join(", ")}`);
		return undefined;
	}

	const text = await licenceBody(client, declared.spdx, declared.holder, declared.year);
	if (text === undefined) return undefined;

	if (existsSync(target) && (await readFile(target, "utf8")).trim() === text.trim()) {
		log(`LICENSE already matches the declared ${declared.spdx}.`);
		return declared.spdx;
	}

	await writeFile(target, text.endsWith("\n") ? text : `${text}\n`);
	log(`Wrote LICENSE for ${declared.spdx}.`);
	return declared.spdx;
}
