#!/usr/bin/env bun
/**
 * Measures the real vertical gap a paragraph break introduces, and can assert a target for it.
 *
 * Why this exists. Typst's `par(spacing:)` is a target for the whole distance between paragraphs,
 * not an increment on the leading, so the number written in a style is not the gap that appears on
 * the page. Setting `spacing: 8pt` where the guide asks for an 8pt gap produces *less* than no gap
 * at all, and the build stays green either way. A probe file is not a fix: a probe that fits on one
 * line measures only the space between paragraphs, which is not what the document does.
 *
 * So this reads the built PDF. `pdftotext -bbox` emits <word> boxes with no <line> element, so lines
 * are reconstructed by grouping words that share a baseline.
 *
 * Usage:
 *   measure-paragraph-gap.ts <pdf>                  # report the measured gap
 *   measure-paragraph-gap.ts <pdf> --want 8         # assert it, exit 1 on mismatch
 *
 * Exit codes: 0 as expected, 1 the measurement disagrees with --want, 2 bad invocation.
 */
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const pdf = args.find((arg) => !arg.startsWith("-"));
const wantIndex = args.indexOf("--want");
const want = wantIndex === -1 ? undefined : Number(args[wantIndex + 1]);

if (!pdf || args.includes("--help")) {
	process.stdout.write("usage: measure-paragraph-gap.ts <pdf> [--want <pt>]\n");
	process.exit(pdf ? 0 : 2);
}

let bbox: string;
try {
	bbox = execFileSync("pdftotext", ["-bbox", pdf, "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
} catch (error) {
	process.stderr.write(`could not read ${pdf}: ${String(error)}\n`);
	process.exit(2);
}

interface Line {
	page: number;
	top: number;
	bottom: number;
}

const lines: Line[] = [];
let page = 0;
let current: Line | undefined;
let key = "";

for (const raw of bbox.split("\n")) {
	if (/<page\s/.test(raw)) page++;
	const word = /<word\s+xMin="[\d.]+"\s+yMin="([\d.]+)"\s+xMax="[\d.]+"\s+yMax="([\d.]+)"/.exec(raw);
	if (!word) continue;

	// Two words on one line share a yMin exactly. A looser tolerance would merge the last line of a
	// paragraph with the first of the next and quietly halve the measured gap.
	const next = `${page}:${word[1]}`;
	if (next !== key) {
		if (current) lines.push(current);
		current = { page, top: Number(word[1]), bottom: Number(word[2]) };
		key = next;
	} else if (current) {
		current.top = Math.min(current.top, Number(word[1]));
		current.bottom = Math.max(current.bottom, Number(word[2]));
	}
}
if (current) lines.push(current);

if (lines.length < 3) {
	process.stderr.write(`read ${lines.length} line(s) from ${pdf}; is it a text PDF?\n`);
	process.exit(2);
}

const advances: number[] = [];
for (let i = 1; i < lines.length; i++) {
	const previous = lines[i - 1] as Line;
	const next = lines[i] as Line;
	if (previous.page !== next.page) continue;
	if (next.top <= previous.top) continue; // a header or a column above us
	advances.push(Number((next.top - previous.bottom).toFixed(3)));
}

const counts = new Map<number, number>();
for (const value of advances) counts.set(value, (counts.get(value) ?? 0) + 1);
const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);

// The within-paragraph advance is the most common one by a wide margin: a body paragraph is many
// lines against one break, so this is the font's own leading slack rather than anything set.
const baseline = (ranked[0] as [number, number] | undefined)?.[0] ?? 0;
const breaks = ranked.filter(([value]) => value > baseline);
const dominant = breaks[0] as [number, number] | undefined;

if (!dominant) {
	process.stderr.write("no paragraph break found; cannot infer the gap\n");
	process.exit(2);
}

const gap = Number((dominant[0] - baseline).toFixed(3));
process.stdout.write(
	`${lines.length} lines, ${advances.length} advances\n` +
		`within-paragraph advance: ${baseline}pt\n` +
		`paragraph break: ${dominant[0]}pt in ${dominant[1]} place(s)\n` +
		`=> extra space introduced by par(spacing:): ${gap}pt\n`,
);

if (want === undefined) process.exit(0);

if (!Number.isFinite(want)) {
	process.stderr.write(`--want needs a number, got ${String(args[wantIndex + 1])}\n`);
	process.exit(2);
}

// Half a point of tolerance: PDF coordinates are rounded, and the value is a distance between two
// rounded boxes. Tighter than this would fail on rounding; looser would miss a real regression.
if (Math.abs(gap - want) <= 0.5) {
	process.stdout.write(`ok: ${gap}pt is within 0.5pt of the required ${want}pt\n`);
	process.exit(0);
}

process.stderr.write(`FAIL: measured ${gap}pt, required ${want}pt\n`);
process.exit(1);
