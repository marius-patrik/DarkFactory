#!/usr/bin/env node
import { exitCodeFor, main } from "./cli.ts";
import { redactErrorMessage } from "../../harness/src/redaction.ts";

main().catch((error: unknown) => {
	const message = redactErrorMessage(error);
	const exitCode = exitCodeFor(error);
	if (process.argv.includes("--json")) console.log(JSON.stringify({ type: "error", message, exitCode }));
	console.error(message);
	process.exitCode = exitCode;
});
