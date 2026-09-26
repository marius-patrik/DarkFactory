import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "wouter/memory";
import { DarkFactoryShell } from "../src/index";

test("DarkFactoryShell renders shell", () => {
	const output = renderToString(createElement(DarkFactoryShell));
	expect(output).toContain("DarkFactory Web");
});

test("DarkFactoryShell renders Dashboard at /", () => {
	const output = renderToString(
		createElement(MemoryRouter, { initialEntries: ["/"] }, createElement(DarkFactoryShell)),
	);
	expect(output).toContain("Dashboard");
});

test("DarkFactoryShell renders System Status at /status", () => {
	const output = renderToString(
		createElement(MemoryRouter, { initialEntries: ["/status"] }, createElement(DarkFactoryShell)),
	);
	expect(output).toContain("System Status");
});

test("DarkFactoryShell renders NotFound at /unknown", () => {
	const output = renderToString(
		createElement(MemoryRouter, { initialEntries: ["/unknown"] }, createElement(DarkFactoryShell)),
	);
	expect(output).toContain("404 Not Found");
});
