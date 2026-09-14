import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

export async function checkDoctorIdentities(
	options: DoctorIdentitiesOptions = {},
): Promise<DoctorIdentitiesResult> {
	let configPath = options.configPath ?? ".darkfactory/df/config.json";
	if (!options.configPath && !existsSync(configPath) && existsSync(join("..", configPath))) {
		configPath = join("..", configPath);
	}
	let manifestPath = options.manifestPath ?? ".darkfactory/manifest.json";
	if (!options.manifestPath && !existsSync(manifestPath) && existsSync(join("..", manifestPath))) {
		manifestPath = join("..", manifestPath);
	}
	const reader = options.reader ?? ((p) => readFile(p, "utf8"));

	let configRaw: string;
	try {
		configRaw = await reader(configPath);
	} catch (err) {
		throw new Error(
			`df doctor identities: cannot read config at ${configPath}: ${(err as Error).message}`,
		);
	}

	let configData: { defaultChain?: string };
	try {
		configData = JSON.parse(configRaw) as { defaultChain?: string };
	} catch {
		throw new Error(`df doctor identities: invalid JSON in config at ${configPath}`);
	}

	if (!configData || typeof configData !== "object" || !configData.defaultChain) {
		throw new Error(`df doctor identities: config at ${configPath} missing defaultChain`);
	}

	const candidates = parseChain(configData.defaultChain);
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
	const repo = getOption(args, "--repo");
	const resolvedConfig = configPath ?? (repo ? join(repo, ".darkfactory/df/config.json") : undefined);
	const resolvedManifest =
		manifestPath ?? (repo ? join(repo, ".darkfactory/manifest.json") : undefined);

	const result = await checkDoctorIdentities({
		configPath: resolvedConfig,
		manifestPath: resolvedManifest,
	});

	if (!result.ok) {
		const message = `df doctor identities failed: missing identity entry for provider(s) in defaultChain: ${result.missingProviders.join(", ")}`;
		console.error(message);
		throw new Error(message);
	}

	console.log(
		`df doctor identities: all providers in defaultChain have valid identity entries (${result.chainProviders.join(", ")})`,
	);
}
