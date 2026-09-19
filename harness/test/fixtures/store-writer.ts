import { FileCredentialStore } from "../../src/credentials.ts";
import { QuotaStore } from "../../src/harness/quota-store.ts";

const [mode, home, id] = process.argv.slice(2);
if (!mode || !home || !id) throw new Error("store-writer requires mode, home, and id");

if (mode === "credentials") {
	await new FileCredentialStore(home).setSlot(`fixture:${id}`, "api_key", { type: "api_key", value: `value-${id}` });
} else if (mode === "quota") {
	await new QuotaStore(home).mark(
		{ provider: "fixture", model: id, account: "default" },
		"rate_limited",
		Date.now() + 60_000,
	);
} else {
	throw new Error("unknown store-writer mode");
}
