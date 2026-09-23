import { FileCredentialStore } from "@darkfactory/keychain";
import { LimitLedger } from "../../src/limits/ledger.ts";

const [mode, home, id] = process.argv.slice(2);
if (!mode || !home || !id) throw new Error("store-writer requires mode, home, and id");

if (mode === "credentials") {
	await new FileCredentialStore(home).setSlot(`fixture:${id}`, "api_key", { type: "api_key", value: `value-${id}` });
} else if (mode === "quota") {
	const now = Date.now();
	await new LimitLedger(home).record([
		{
			provider: "fixture",
			model: id,
			account: "default",
			type: "rate",
			observedAt: now,
			resetAt: now + 60_000,
			source: "rule",
			remaining: 0,
		},
	]);
} else {
	throw new Error("unknown store-writer mode");
}
