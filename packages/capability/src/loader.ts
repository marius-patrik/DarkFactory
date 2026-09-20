import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { CapabilityDefinition, CapabilityModule } from "./abi.ts";
import { definitionFromModule } from "./compatibility.ts";

const ENTRYPOINTS = ["capability.ts", "capability.js", "capability.mjs"] as const;

/** Loads and validates one capability module from disk. */
export async function loadCapability(path: string): Promise<CapabilityDefinition> {
	const module = (await import(pathToFileURL(resolve(path)).href)) as CapabilityModule;
	return definitionFromModule(module);
}

/** Discovers and validates capability modules under a capability root. */
export async function discoverCapabilities(root: string): Promise<CapabilityDefinition[]> {
	const entries = (await readdir(root, { withFileTypes: true }))
		.sort((a, b) => a.name.localeCompare(b.name));
	const definitions: CapabilityDefinition[] = [];
	for (const entry of entries) {
		let loaded: CapabilityDefinition | undefined;
		if (entry.isDirectory()) {
			for (const filename of ENTRYPOINTS) {
				try {
					loaded = await loadCapability(join(root, entry.name, filename));
					break;
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code === "ENOENT" || /Cannot find module|ModuleNotFound/u.test(String(error)))
						continue;
					throw error;
				}
			}
		} else if (entry.isFile() && (entry.name.endsWith(".json") || entry.name.endsWith(".ts") || entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) {
			try {
				loaded = await loadCapability(join(root, entry.name));
			} catch (error) {
				if (
					(error as NodeJS.ErrnoException).code === "ENOENT" ||
					/Cannot find module|ModuleNotFound/u.test(String(error)) ||
					error?.message?.includes("must export capability or default")
				) {
					continue;
				}
				throw error;
			}
		}
		if (loaded) definitions.push(loaded);
	}
	const ids = new Set<string>();
	for (const definition of definitions) {
		if (ids.has(definition.id)) throw new Error(`Duplicate capability id: ${definition.id}`);
		ids.add(definition.id);
	}
	return definitions;
}

/** Resolved domains and the capabilities applicable to them. */
export interface CapabilityResolution {
	domains: readonly string[];
	capabilities: readonly CapabilityDefinition[];
}

/** Filters and deterministically orders capabilities for detected domains. */
export function resolveCapabilities(
	definitions: readonly CapabilityDefinition[],
	domains: readonly string[],
): CapabilityResolution {
	const normalizedDomains = [...new Set(domains)].sort();
	const domainSet = new Set(normalizedDomains);
	const capabilities = definitions
		.filter((definition) => {
			const supported = definition.domains ?? [];
			return supported.length === 0 || supported.some((domain) => domainSet.has(domain));
		})
		.slice()
		.sort((a, b) => a.id.localeCompare(b.id));
	return { domains: normalizedDomains, capabilities };
}
