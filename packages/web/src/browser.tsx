import { createRoot } from "react-dom/client";
import { validateWebConfig } from "./site-contract.ts";
import { DarkFactoryShell } from "./web-shell.tsx";

async function main(): Promise<void> {
	const mount = document.getElementById("darkfactory-app");
	if (!mount) throw new Error("Missing DarkFactory app mount");
	const root = createRoot(mount);
	try {
		// Relative to <base>, never to the current documentation URL or hash route.
		const response = await fetch(new URL("./darkfactory-web.json", document.baseURI), {
			cache: "no-store",
			credentials: "omit",
		});
		if (!response.ok) throw new Error(`Public configuration HTTP ${response.status}`);
		const config = validateWebConfig((await response.json()) as unknown);
		root.render(<DarkFactoryShell repository={config.repository} config={config} />);
	} catch {
		root.render(
			<main role="alert" style={{ padding: "2rem", fontFamily: "system-ui" }}>
				<h1>DarkFactory Web is unavailable</h1>
				<p>Public configuration is missing or invalid. Operator actions are disabled.</p>
			</main>,
		);
	}
}
void main();
