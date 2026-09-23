import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DATA = join("data", "phase2-evidence.json");
const OUTPUT = join("img", "generated", "gradually-ai-usage-2026.svg");

type Category = {
  key: "never" | "free" | "paid" | "coding";
  label_cs: string;
  share_percent: number;
  dots: number;
};

type Evidence = {
  gradually: {
    dot_count: number;
    categories: Category[];
  };
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function text(
  x: number,
  y: number,
  value: string,
  size = 18,
  weight = "normal",
  anchor = "start",
) {
  return (
    '<text x="' + x.toFixed(2) +
    '" y="' + y.toFixed(2) +
    '" font-family="sans-serif" font-size="' + size +
    '" font-weight="' + weight +
    '" text-anchor="' + anchor +
    '" fill="#111827">' + escapeXml(value) + "</text>"
  );
}

export async function renderEvidence() {
  const payload = JSON.parse(await readFile(DATA, "utf8")) as Evidence;
  const categories = payload.gradually.categories;
  const dotCount = categories.reduce((total, item) => total + item.dots, 0);

  if (dotCount !== payload.gradually.dot_count || dotCount !== 2500) {
    throw new Error("Gradually evidence dot count is inconsistent");
  }

  const fills = {
    never: "#e5e7eb",
    free: "#a8a29e",
    paid: "#57534e",
    coding: "#111827",
  } as const;
  const strokes = {
    never: "#9ca3af",
    free: "#78716c",
    paid: "#44403c",
    coding: "#111827",
  } as const;
  const people = {
    never: "≈ 5,9 mld.",
    free: "≈ 2,3 mld.",
    paid: "≈ 80 mil.",
    coding: "≈ 30 mil.",
  } as const;

  const width = 1000;
  const height = 560;
  const originX = 34;
  const originY = 34;
  const step = 9.5;
  const radius = 3.25;
  const categoryByIndex: Category["key"][] = [];

  for (const item of categories) {
    categoryByIndex.push(...Array.from({ length: item.dots }, () => item.key));
  }

  const parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width +
      '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '">',
    '<rect width="100%" height="100%" fill="white"/>',
  ];

  categoryByIndex.forEach((key, index) => {
    const row = Math.floor(index / 50);
    const column = index % 50;
    const x = originX + column * step;
    const y = originY + row * step;
    parts.push(
      '<circle cx="' + x.toFixed(2) +
      '" cy="' + y.toFixed(2) +
      '" r="' + radius +
      '" fill="' + fills[key] +
      '" stroke="' + strokes[key] +
      '" stroke-width="0.65"/>',
    );
  });

  const legendX = 545;
  parts.push(text(legendX, 42, "8,3 mld. lidí = 2 500 bodů", 22, "bold"));
  parts.push(text(legendX, 70, "1 bod ≈ 3,3 mil. lidí", 17));

  let y = 120;
  for (const item of categories) {
    parts.push(
      '<circle cx="' + (legendX + 7) +
      '" cy="' + (y - 5) +
      '" r="6.5" fill="' + fills[item.key] +
      '" stroke="' + strokes[item.key] +
      '" stroke-width="1"/>',
    );
    parts.push(text(legendX + 25, y, item.label_cs, 16, item.key === "coding" ? "bold" : "normal"));
    const share = item.key === "coding"
      ? "0,36 %"
      : String(item.share_percent).replace(".", ",") + " %";
    parts.push(
      text(
        legendX + 25,
        y + 24,
        people[item.key] + " · " + share + " · " + item.dots + " bodů",
        15,
      ),
    );
    y += 86;
  }

  parts.push(text(legendX, 485, "Kategorie se nepřekrývají; člověk je zařazen", 14));
  parts.push(text(legendX, 505, "podle nejpokročilejší použité kategorie.", 14));
  parts.push(
    text(
      legendX,
      535,
      "Coding agents: redakční deduplikovaný odhad (25–35 mil.).",
      14,
      "bold",
    ),
  );
  parts.push("</svg>");

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, parts.join(""), "utf8");
}

if (import.meta.main) {
  await renderEvidence();
  console.log("ok: rendered " + OUTPUT);
}
