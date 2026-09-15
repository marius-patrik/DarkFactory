import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseChain } from "../harness/routing.ts";
import { loadIdentities } from "./loader.ts";

/** Options for {@link checkDoctorIdentities}. */
export interface DoctorIdentitiesOptions {
	/** Override the default config path `.darkfactory/df/config.json`. */
	configPath?: string;
	/** Override the default manifest path `.darkfactory/manifest.json`. */
	manifestPath?: string;
	/** Custom reader used to read config/manifest files; defaults to reading from disk. */
	reader?: (path: string) => Promise<string>;
}

/** Result of {@link checkDoctorIdentities}. */
export interface DoctorIdentitiesResult {
	/** True when every provider in the default chain has an identity entry. */
	ok: boolean;
	/** Unique providers referenced in the default chain. */
	chainProviders: string[];
	/** Providers in the default chain that lack an identity entry. */
	missingProviders: string[];
}

function getOption(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

/**
 * Validates that every provider in the default chain has an identity entry.
 * @param options - Override config/manifest paths or provide a custom reader.
 * @returns The result indicating which providers are missing.
 * @throws When config cannot be read, is invalid JSON, or lacks `defaultChain`.
 */
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

/**
 * Runs the `df doctor identities` CLI command.
 * @param args - CLI args; supports `--config`, `--manifest`, and `--repo`.
 * @throws When any provider in the default chain is missing an identity entry.
 */
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
