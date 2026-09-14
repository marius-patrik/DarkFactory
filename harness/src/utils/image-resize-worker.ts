import { parentPort } from "node:worker_threads";
import { resizeImageInProcess } from "../../node_modules/@earendil-works/pi-coding-agent/dist/utils/image-resize-core.js";

interface ResizeRequest {
	inputBytes: Uint8Array;
	mimeType: string;
	options?: { maxWidth?: number; maxHeight?: number; maxBytes?: number };
}

function isResizeRequest(value: unknown): value is ResizeRequest {
	if (!value || typeof value !== "object") return false;
	const request = value as Record<string, unknown>;
	return request.inputBytes instanceof Uint8Array && typeof request.mimeType === "string";
}

if (!parentPort) throw new Error("image resize worker requires parentPort");
const port = parentPort;
port.once("message", (message) => {
	void (async () => {
		try {
			if (!isResizeRequest(message)) throw new Error("Invalid image resize worker request");
			port.postMessage({ result: await resizeImageInProcess(message.inputBytes, message.mimeType, message.options) });
		} catch (error) {
			port.postMessage({ error: error instanceof Error ? error.message : String(error) });
		}
	})();
});
