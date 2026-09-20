import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve("packages");
const directories = (await readdir(packageRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

console.log(JSON.stringify(directories));

const required = ["protocol", "core", "capability", "github", "keychain", "auth", "docs", "cli", "web"] as const;
console.log(JSON.stringify([...required].sort()));

console.log(JSON.stringify(directories) === JSON.stringify([...required].sort()));
