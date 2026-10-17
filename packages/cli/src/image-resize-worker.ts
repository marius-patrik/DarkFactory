// Bun compiled workers are embedded by entrypoint identity. Keep the entry
// beside the CLI that constructs new URL("./image-resize-worker.ts", import.meta.url).
// The actual image processing implementation stays in the harness package.
import "../../harness/src/image-resize-worker.ts";
