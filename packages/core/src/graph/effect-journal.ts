import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProductionEffectJournal, ProductionEffectRecord } from "./production-handlers.ts";

/**
 * File-backed production effect journal scoped to one graph run.
 *
 * Each effect record is stored independently as `<effectId>.df`, allowing
 * crash-safe exact-effect reconciliation without rewriting a shared journal.
 */
export class FileProductionEffectJournal implements ProductionEffectJournal {
	constructor(readonly directory: string) {}

	private path(id: string): string {
		if (!/^[0-9a-f]{64}$/u.test(id)) throw new Error(`Invalid production effect id: ${id}`);
		return join(this.directory, `${id}.df`);
	}

	async read<T>(id: string): Promise<ProductionEffectRecord<T> | undefined> {
		try {
			return JSON.parse(await readFile(this.path(id), "utf8")) as ProductionEffectRecord<T>;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			throw error;
		}
	}

	async write<T>(record: ProductionEffectRecord<T>): Promise<void> {
		await mkdir(this.directory, { recursive: true });
		const target = this.path(record.id);
		const temp = `${target}.${process.pid}.${crypto.randomUUID()}.tmp.df`;
		await writeFile(temp, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
		await rename(temp, target);
	}
}
