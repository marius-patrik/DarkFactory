#!/usr/bin/env node
import { main } from "./index.ts";

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
