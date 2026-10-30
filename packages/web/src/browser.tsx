import { createRoot } from "react-dom/client";
import { DarkFactoryShell } from "./web-shell.tsx";
import { createHttpOperatorBroker, type BrowserLoginConfig } from "./operator-auth.ts";

interface PublicWebConfig {
	version: 1;
	repository: string;
	docsContentUrl?: string;
	auth?: { clientId: string; scope: string; redirectUri: string; brokerUrl: string };
}
function isConfig(value: unknown): value is PublicWebConfig {
	if (!value || typeof value !== "object") return false;
	const input = value as Record<string, unknown>;
	if (
		input.version !== 1 ||
		typeof input.repository !== "string" ||
		!/^[\w-]+\/[\w.-]+$/u.test(input.repository) ||
		input.repository.includes("..")
	)
		return false;
	if (input.docsContentUrl !== undefined && typeof input.docsContentUrl !== "string") return false;
	if (input.auth !== undefined) {
		if (!input.auth || typeof input.auth !== "object") return false;
		const auth = input.auth as Record<string, unknown>;
		for (const key of ["clientId", "scope", "redirectUri", "brokerUrl"])
			if (typeof auth[key] !== "string" || !auth[key]) return false;
	}
	return true;
}
async function main() {
	const mount = document.getElementById("darkfactory-app");
	if (!mount) throw new Error("Missing DarkFactory application mount");
	const root = createRoot(mount);
	function fatal(message: string) {
		root.render(
			<main role="alert" style={{ padding: "2rem", fontFamily: "system-ui" }}>
				<h1>DarkFactory Web is not configured</h1>
				<p>{message}</p>
			<¶»§q«^