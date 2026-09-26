import {
	CAPTURE_SCHEMAS,
	captureJsonSchema,
	getCaptureSchema,
	listCaptureSchemas,
} from "@darkfactory/protocol/result-capture";

/**
 * Format registered capture schemas for `--capture-schema [name]`.
 *
 * @param name - Optional schema name or "all" to list all registered schemas.
 * @returns Formatted JSON string of the requested schema or all schemas.
 * @throws Error if an unknown schema name is requested.
 */
export function formatCaptureSchema(name?: string): string {
	if (!name || name === "all") {
		return JSON.stringify(listCaptureSchemas(), null, 2);
	}
	const schema = getCaptureSchema(name);
	if (!schema) {
		throw new Error(`Unknown capture schema: ${name}. Available: ${Object.keys(CAPTURE_SCHEMAS).join(", ")}`);
	}
	return JSON.stringify(captureJsonSchema(schema), null, 2);
}
