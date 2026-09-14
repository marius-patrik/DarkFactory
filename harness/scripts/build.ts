import { $ } from "bun";

const outfile = process.platform === "win32" ? "./dist/df.exe" : "./dist/df";
await $`bun build ./src/cli.ts ./src/utils/image-resize-worker.ts --compile --outfile ${outfile}`;
await $`bun run ./scripts/package-assets.ts`;
