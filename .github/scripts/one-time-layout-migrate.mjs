#!/usr/bin/env node
/** One-time deterministic path migration. Run only from isolated migration branch. */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MOVED = ["auth", "capability", "docs", "github", "harness", "keychain", "plugins", "protocol"];
const movable = new Set(MOVED);
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const tracked = git("ls-files", "-z").split("\0").filter(Boolean);
const relocate = (p) => {
  const a = p.split("/");
  if (a[0] === "packages" && movable.has(a[1])) a[0] = "plugins";
  return a.join("/");
};

mkdirSync("plugins", { recursive: true });
for (const module of MOVED) {
  if (!existsSync("packages/" + module)) throw new Error("Missing package directory: " + module);
  git("mv", "packages/" + module, "plugins/" + module);
}

const relPattern = /(["'\x60])(\.\.?\/[^"'\x60\r\n]+)\1/g;
const directPattern = new RegExp("\\bpackages/(" + MOVED.join("|") + ")(?=/|\\b)", "g");
const segmentsPattern = new RegExp("([\"'\\x60])packages\\1(\\s*,\\s*)([\"'\\x60])(" + MOVED.join("|") + ")\\3", "g");
let modified = 0;
for (const original of tracked) {
  const current = relocate(original);
  if (!existsSync(current) || lstatSync(current).isSymbolicLink() || !lstatSync(current).isFile()) continue;
  const buffer = readFileSync(current);
  if (buffer.includes(0)) continue;
  const input = buffer.toString("utf8");
  if (!Buffer.from(input, "utf8").equals(buffer)) continue;
  let output = input;
  output = output.replace(relPattern, (match, quote, spec) => {
    if (spec.includes("$" + "{")) return match;
    const originalTarget = path.posix.normalize(path.posix.join(path.posix.dirname(original), spec));
    const currentTarget = relocate(originalTarget);
    if (originalTarget === currentTarget) return match;
    let rewritten = path.posix.relative(path.posix.dirname(current), currentTarget);
    if (!rewritten.startsWith(".")) rewritten = "./" + rewritten;
    if (spec.endsWith("/") && !rewritten.endsWith("/")) rewritten += "/";
    return quote + rewritten + quote;
  });
  output = output.replace(directPattern, (_match, pkg) => "plugins/" + pkg);
  output = output.replace(segmentsPattern, (_match, quote1, comma, quote2, pkg) =>
    quote1 + "plugins" + quote1 + comma + quote2 + pkg + quote2
  );
  if (current === "tsconfig.json") {
    const json = JSON.parse(output);
    for (const suffix of ["src", "test", "scripts"]) {
      const key = "plugins/*/" + suffix;
      if (!json.include.includes(key)) json.include.push(key);
    }
    output = JSON.stringify(json, null, 2) + "\n";
  }
  if (output !== input) {
    writeFileSync(current, output);
    modified++;
  }
}
for (const module of MOVED) {
  if (existsSync("packages/" + module) || !existsSync("plugins/" + module))
    throw new Error("Invalid relocated package: " + module);
}
for (const module of ["cli", "core", "web"]) {
  if (!existsSync("packages/" + module)) throw new Error("Missing package: " + module);
}
console.log("Relocated " + MOVED.length + " packages; updated " + modified + " text files.");
