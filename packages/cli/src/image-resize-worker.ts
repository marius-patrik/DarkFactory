// The Bun compiled executable embeds workers by their entrypoint identity.
// Keep this entry next to the CLI that constructs new URL("./image-resize-worker.ts", import.meta.url).
// The implementation remains owned by the harness and is bundled into this worker entry.
import "../../harness/src/image-resize-worker.ts";
