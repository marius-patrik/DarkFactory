import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { memoryLocation } from "wouter/memory-location";
import { DarkFactoryShell } from "../src/index";

test("DarkFactoryShell renders shell", () => {
	const output = renderToString(createElement(DarkFactoryShell));
	expect(output).toContain("DarkFactory Web");
});

test("DarkFactoryShell renders Dashboard at /", () => {
	const output = renderToString(createElement(DarkFactoryShell, { hook: memoryLocation({ path: "/" }).hook }));
	expect(output).toContain("Dashboard");
});

test("DarkFactoryShell renders System Status at /status", () => {
	const output = renderToString(createElement(DarkFactoryShell, { hook: memoryLocation({ path: "/status" }).hook }));
	expect(output).toContain("System Status");
});

test("DarkFactoryShell renders NotFound at /unknown", () => {
	const output = renderToString(createElement(DarkFactoryShell, { hook: memoryLocation({ path: "/unknown" }).hook }));
	expect(output).toContain("404 Not Found");
});
