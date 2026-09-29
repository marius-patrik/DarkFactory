/**
 * Prints the Typst entrypoint declared in `paper/typst.toml`.
 *
 * The manuscript's entry file is not a fixed name: `develop`'s stub declares `index.typ` and the
 * thesis branch declares `main.typ`. Every command that has to name the file reads it from here, so
 * there is one declaration and a capability never has to guess.
 */
import { join, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..", "..");
const MANIFEST = join(REPOSITORY_ROOT, "paper", "typst.toml");

const manifest = await Bun.file(MANIFEST).text();
const declared = /^\s*entrypoint\s*=\s*"([^"]+)"/mu.exec(manifest)?.[1];

if (!declared) {
	process.stderr.write(`no entrypoint declared in ${MANIFEST}\n`);
	process.exit(1);
}

process.stdout.write(declared);
