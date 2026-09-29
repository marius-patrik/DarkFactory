import { readFile } from "node:fs/promises";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
import { parseChain } from "../harness/routing.ts";
import { loadIdentities } from "./loader.ts";

export interface DoctorIdentitiesOptions {
	configPath?: string;
	manifestPath?: string;
	reader?: (path: string) => Promise<string>;
}

export interface DoctorIdentitiesResult {
	ok: boolean;
	chainProviders: string[];
	missingProviders: string[];
}

function getOption(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

export async function checkDoctorIdentities(options: DoctorIdentitiesOptions = {}): Promise<DoctorIdentitiesResult> {
	const configPath = options.configPath ?? resolveConfigDocumentPath(process.cwd());
	if (!configPath) throw new Error("df doctor identities: no combined DarkFactory configuration found");
	const manifestPath = options.manifestPath ?? configPath;
	const reader = options.reader ?? ((p) => readFile(p, "utf8"));

	let configRaw: string;
	try {
		configRaw = await reader(configPath);
	} catch (err) {
		throw new Error(`df doctor identities: cannot read config at ${configPath}: ${(err as Error).message}`);
	}

	let configData: Record<string, unknown>;
	try {
		const document = parseConfigDocument(configRaw, configPath);
		configData = configBlock(document, "providers", configPath) ?? {};
	} catch (error) {
		throw new Error(`df doctor identities: ${(error as Error).message}`);
	}

	const chainStrings: string[] = [];
	for (const key of ["defaultChain", "hardReasoningChain", "sensitiveChain"] as const) {
		const chain = configData[key];
		if (typeof chain === "string" && chain) chainStrings.push(chain);
	}

	if (chainStrings.length === 0) {
		// No chains configured; candidates are derived from provider configs.
		return {
			ok: true,
			chainProviders: [],
			missingProviders: [],
		};
	}

	const candidates = chainStrings.flatMap(parseChain);
	const chainProviders = [...new Set(candidates.map((c) => c.provider))];

	const identities = await loadIdentities(manifestPath, reader);

	const missingProviders = chainProviders.filter((provider) => !identities.providers[provider]);

	return {
		ok: missingProviders.length === 0,
		chainProviders,
		missingProviders,
	};
}

export async function runDoctorIdentities(args: string[] = []): Promise<void> {
	const configPath = getOption(args, "--config");
	const manifestPath = getOption(args, "--manifest");

	const result = await checkDoctorIdentities({
		configPath,
		manifestPath,
	});

	if (!result.ok) {
		const message = `df doctor identities failed: missing identity entry for provider(s) in defaultChain: ${result.missingProviders.join(", ")}`;
		console.error(message);
		throw new Error(message);
	}

	if (result.chainProviders.length === 0) {
		console.log("df doctor identities: no chains configured; candidates are derived from provider configs");
		return;
	}

	console.log(
		`df doctor identities: all providers in defaultChain have valid identity entries (${result.chainProviders.join(", ")})`,
	);
}
