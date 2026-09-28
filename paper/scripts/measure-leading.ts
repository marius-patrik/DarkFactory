#!/usr/bin/env bun
/**
 * Measures the real vertical gap between lines in a built PDF, and separates the ordinary
 * line advance from the extra space a paragraph break adds.
 *
 * Why this exists: Typst's `par(spacing:)` is a target distance, not an increment on the leading,
 * so the value written in the style is not the gap that appears on the page. A probe file is not
 * enough either - a probe that fits on one line measures only the space between paragraphs, which
 * is not what the document does. So this reads the real PDF.
 *
 * Usage: measure-leading.ts <pdf>
 */
import { execFileSync } from "node:child_process";

const pdf = process.argv[2];
if (!pdf) {
	process.stderr.write("usage: measure-leading.ts <pdf>\n");
	process.exit(2);
}

interface Line {
	page: number;
	top: number;
	bottom: number;
	left: number;
}

const bbox = execFileSync("pdftotext", ["-bbox", pdf, "-"], { encoding: "utf8", maxBuffer: 1 << 28 });

// pdftotext -bbox emits <word> boxes only, with no <line> element, so lines are reconstructed by
// grouping words that share a baseline. Two words on the same line share a yMin exactly; anything
// looser would merge the last line of a paragraph with the first of the next.
interface Word {
	page: number;
	xMin: number;
	yMin: number;
	yMax: number;
}

const words: Word[] = [];
let page = 0;
for (const raw of bbox.split("\n")) {
	if (/<page\s/.test(raw)) page++;
	const match = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)"/.exec(raw);
	if (match) {
		words.push({ page, xMin: Number(match[1]), yMin: Number(match[2]), yMax: Number(match[4]) });
	}
}

const lines: Line[] = [];
let current: Line | undefined;
let currentKey = "";
for (const word of words) {
	// A new column or page restarts grouping; so does any leftward move, which is a new paragraph
	// starting to the left of the previous line's end rather than a continuation.
	const key = `${word.page}:${word.yMin.toFixed(2)}`;
	if (key !== currentKey) {
		if (current) lines.push(current);
		current = { page: word.page, top: word.yMin, bottom: word.yMax, left: word.xMin };
		currentKey = key;
	} else if (current) {
		current.top = Math.min(current.top, word.yMin);
		current.bottom = Math.max(current.bottom, word.yMax);
		current.left = Math.min(current.left, word.xMin);
	}
}
if (current) lines.push(current);

if (lines.length < 3) {
	process.stderr.write(`read only ${lines.length} line(s) from ${pdf}\n`);
	process.exit(1);
}

// PDF points are 1/72 inch; the thesis is set in points already, so the numbers are comparable.
const advances: number[] = [];
for (let i = 1; i < lines.length; i++) {
	const previous = lines[i - 1] as Line;
	const current = lines[i] as Line;
	if (previous.page !== current.page) continue;
	if (current.top <= previous.top) continue; // a column or a header above us
	// Box-to-box separation. Within a paragraph this is the font's internal leading slack; at a
	// paragraph break it is that plus whatever `par(spacing:)` added.
	advances.push(Number((current.top - previous.bottom).toFixed(3)));
}

const counts = new Map<number, number>();
for (const value of advances) counts.set(value, (counts.get(value) ?? 0) + 1);

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
const baseline = sorted[0]?.[0] ?? 0;

process.stdout.write(`${lines.length} lines, ${advances.length} advances within pages\n\n`);
process.stdout.write(`most common box-to-box gap: ${baseline}pt (${sorted[0]?.[1] ?? 0} occurrences) - the within-paragraph case\n\n`);

process.stdout.write("other distinct gaps, by frequency:\n");
for (const [value, count] of sorted.slice(1, 12)) {
	const extra = Number((value - baseline).toFixed(3));
	process.stdout.write(`  ${String(value).padStart(8)}pt  x${String(count).padStart(4)}   extra over baseline: ${extra > 0 ? "+" : ""}${extra}pt\n`);
}

const paragraphBreaks = sorted.filter(([value]) => value > baseline);
if (paragraphBreaks.length === 0) {
	process.stdout.write("\nno paragraph break found: cannot infer the spacing target\n");
	process.exit(0);
}

const dominant = paragraphBreaks[0] as [number, number];
const extra = Number((dominant[0] - baseline).toFixed(3));
process.stdout.write(
	`\ndominant paragraph break: ${dominant[0]}pt box-to-box in ${dominant[1]} places\n` +
		`=> extra space introduced by par(spacing:) is ${extra}pt\n`,
);
