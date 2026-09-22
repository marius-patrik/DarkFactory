#!/usr/bin/env python3
"""Consolidate the entire multi-file DarkFactory paper into a single standalone .typ file.

This script traverses the manuscript folders and concepts defined in DarkFactory/index.typ,
extracts all verbatim section and concept texts, visuals, examples, figures, and frontmatter,
and produces a single self-contained Typst file that can be compiled directly with:
    typst compile --font-path DarkFactory/fonts consolidated.typ out/consolidated.pdf
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


def parse_balanced(text: str, open_ch: str, close_ch: str, start_pos: int = 0) -> tuple[str | None, int]:
    """Extract substring enclosed in balanced open_ch and close_ch."""
    depth = 0
    start = -1
    for i in range(start_pos, len(text)):
        ch = text[i]
        if ch == open_ch:
            if depth == 0:
                start = i
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return text[start + 1 : i], i + 1
    return None, len(text)


def parse_typst_args(call_body: str) -> dict[str, Any]:
    """Parse named arguments from a Typst function call body."""
    args: dict[str, Any] = {}
    i = 0
    while i < len(call_body):
        m = re.compile(r"([a-zA-Z0-9_-]+)\s*:\s*").search(call_body, i)
        if not m:
            break
        arg_name = m.group(1)
        val_start = m.end()

        # Skip `terms =>` if present
        terms_m = re.compile(r"terms\s*=>\s*").match(call_body, val_start)
        if terms_m:
            val_start = terms_m.end()

        rest = call_body[val_start:].lstrip()
        diff_offset = len(call_body[val_start:]) - len(rest)
        val_start += diff_offset
        if not rest:
            break

        if rest[0] == "[":
            val, next_pos = parse_balanced(call_body, "[", "]", val_start)
            args[arg_name] = val.strip() if val else ""
            i = next_pos
        elif rest[0] == "(":
            val, next_pos = parse_balanced(call_body, "(", ")", val_start)
            args[arg_name] = "(" + val + ")"
            i = next_pos
        elif rest[0] in ('"', "'"):
            quote = rest[0]
            end_q = call_body.find(quote, val_start + 1)
            if end_q != -1:
                args[arg_name] = call_body[val_start + 1 : end_q]
                i = end_q + 1
            else:
                i = val_start + 1
        else:
            end_arg = re.search(r",|\n|\)", call_body[val_start:])
            if end_arg:
                args[arg_name] = call_body[val_start : val_start + end_arg.start()].strip()
                i = val_start + end_arg.start()
            else:
                args[arg_name] = rest.strip()
                break
    return args


def collect_parsed_items(root_dir: Path) -> dict[str, dict[str, Any]]:
    """Scan all .typ files in root_dir and extract concept, section, and example definitions."""
    items: dict[str, dict[str, Any]] = {}
    for p in sorted(root_dir.rglob("*.typ")):
        if "templates" in str(p) or p.name in (
            "schema.typ",
            "metadata.typ",
            "book.typ",
            "thesis.typ",
            "web-publication.typ",
        ):
            continue
        content = p.read_text(encoding="utf-8")
        for m in re.finditer(r"(?:#let\s+([a-zA-Z0-9_-]+)\s*=\s*)?\b(concept|section|example)\s*\(", content):
            var_name = m.group(1)
            kind = m.group(2)
            call_body, _ = parse_balanced(content, "(", ")", m.end() - 1)
            if call_body:
                args = parse_typst_args(call_body)
                if "key" in args:
                    args["kind"] = kind
                    args["_file"] = str(p)
                    args["_var"] = var_name
                    items[args["key"]] = args
                    if var_name:
                        items[f"{p.name}:{var_name}"] = args
                        items[f"{p.stem}:{var_name}"] = args
                        if var_name not in items:
                            items[var_name] = args
    return items


def query_structure_from_typst(book: str, fonts: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Use typst eval to query the exact folder tree and vocabulary from index.typ."""
    script = f"""
import "/{book}/index.typ": folders, vocabulary
let dump-concept(c) = (
  kind: c.kind,
  key: c.key,
  term: c.term,
  keyword: c.keyword,
  citation: repr(c.citation),
  source: repr(c.source),
)
let dump-folder(f) = (
  key: f.key,
  title: repr(f.title),
  has_section: f.section != none,
  section_title: if f.section != none {{ repr(f.section.title) }} else {{ none }},
  section_key: if f.section != none {{ f.section.key }} else {{ none }},
  concepts: f.concepts.map(dump-concept),
  children: f.children.map(dump-folder),
)
(
  folders: folders.map(dump-folder),
  vocabulary: vocabulary.pairs().map(((k, v)) => (
    key: k,
    term: v.term,
    keyword: v.keyword,
    kind: v.kind,
  )),
)
"""
    cmd = ["typst", "eval", script, "--font-path", str(fonts), "--root", "."]
    out = subprocess.check_output(cmd).decode("utf-8")
    data = json.loads(out)
    return data["folders"], {entry["key"]: entry for entry in data["vocabulary"]}


def format_term_full_name(item_or_dict: dict[str, Any]) -> str:
    term = item_or_dict.get("term")
    keyword = item_or_dict.get("keyword")
    if term and keyword:
        return f"{term} ({keyword})"
    elif term:
        return str(term)
    elif keyword:
        return str(keyword)
    return str(item_or_dict.get("key", ""))


def clean_repr_content(raw_repr: str | None) -> str:
    """Clean Typst repr of content like '[Úvod]' to 'Úvod'."""
    if not raw_repr or raw_repr == "none":
        return ""
    val = raw_repr.strip()
    if val.startswith("[") and val.endswith("]"):
        val = val[1:-1]
    return val.strip()


def build_consolidated_source(
    book: str,
    fonts: Path,
    parsed_items: dict[str, dict[str, Any]],
    folders: list[dict[str, Any]],
    vocab: dict[str, Any],
) -> str:
    """Build the consolidated Typst file content."""
    lines: list[str] = []

    # 1. Header and preamble
    lines.append("// ─────────────────────────────────────────────────────────────")
    lines.append("//  KONSOLIDOVANÁ ODBORNÁ PRÁCE (Jediný zdrojový soubor .typ)")
    lines.append("//  Generováno automaticky pomocí scripts/consolidate_paper.py")
    lines.append("// ─────────────────────────────────────────────────────────────")
    lines.append("")

    # Bib reference variables
    lines.append("// ── Kanonické bibliografické proměnné ───────────────────────")
    bib_ref_path = Path(f"{book}/bib/references.typ")
    if bib_ref_path.exists():
        bib_lines = bib_ref_path.read_text(encoding="utf-8").splitlines()
        for bl in bib_lines:
            if bl.startswith("#import"):
                continue
            lines.append(bl)
    lines.append("")

    # Visual and evidence helpers
    lines.append("// ── Vizualizace a empirické snímky ──────────────────────────")
    evidence_typ = Path(f"{book}/manuscript/introduction/motivation/evidence.typ")
    if evidence_typ.exists():
        for el in evidence_typ.read_text(encoding="utf-8").splitlines():
            if el.startswith("#import"):
                continue
            lines.append(el)
    lines.append("")

    benchmark_typ = Path(f"{book}/language-models/benchmark.typ")
    if benchmark_typ.exists():
        for bl in benchmark_typ.read_text(encoding="utf-8").splitlines():
            if bl.startswith("#import"):
                continue
            lines.append(bl)
    lines.append("")

    # Template setup and wordometer
    lines.append("// ── Typografická šablona a pomocné funkce (GJKT) ─────────────")
    lines.append("""
#let PISMO = ("Caladea", "New Computer Modern")

#let string-word-count(string) = (
  characters: string.replace(regex("\\s+"), "").clusters().len(),
  words: string.matches(regex("\\b[\\w'’.,\\-]+\\b")).len(),
  sentences: string.matches(regex("\\w+\\s*[.?!]")).len(),
)

#let concat-adjacent-text(children) = {
  if children.len() == 0 { return () }
  let squashed = (children.at(0),)
  let as-text(el) = {
    let fn = repr(el.func())
    if fn == "text" { el.text }
    else if fn == "space" { " " }
    else if fn in "linebreak" { "\\n" }
    else if fn in "parbreak" { "\\n\\n" }
    else if fn in "pagebreak" { "\\n\\n\\n\\n" }
    else if fn == "smartquote" {
      if el.double { "\\"" } else { "'" }
    }
  }
  let last-text = as-text(squashed.at(-1))
  for child in children.slice(1) {
    let has-label = child.at("label", default: none) != none
    if has-label {
      squashed.push(child)
      last-text = none
      continue
    }
    let this-text = as-text(child)
    let merge-with-last = last-text != none and this-text != none
    if merge-with-last {
      last-text = last-text + this-text
      squashed.at(-1) = text(last-text)
    } else {
      last-text = this-text
      squashed.push(child)
    }
  }
  squashed
}

#let IGNORED_ELEMENTS = (
  "bibliography", "cite", "display", "equation", "h", "hide", "image",
  "line", "linebreak", "locate", "metadata", "pagebreak", "parbreak",
  "path", "polygon", "ref", "repeat", "smartquote", "space", "style",
  "update", "v",
)

#let map-tree(f, content, exclude: IGNORED_ELEMENTS) = {
  if content == none { return none }
  let fn = repr(content.func())
  let fields = content.fields().keys()
  if fn in exclude {
    none
  } else if content.at("label", default: none) in exclude {
    none
  } else if fn in ("text", "raw") {
    f(content.text)
  } else if "children" in fields {
    let children = content.children
    if fn == "sequence" { children = concat-adjacent-text(children) }
    children.map(map-tree.with(f, exclude: exclude)).filter(x => x != none)
  } else if fn == "figure" {
    (
      if "figure-body" not in exclude { map-tree(f, content.body, exclude: exclude) },
      if "caption" in content.fields() { map-tree(f, content.caption, exclude: exclude) },
    ).filter(x => x != none)
  } else if fn == "styled" {
    map-tree(f, content.child, exclude: exclude)
  } else if "body" in fields {
    map-tree(f, content.body, exclude: exclude)
  } else {
    none
  }
}

#let extract-text(content, ..options) = {
  let out = (map-tree(x => x, content, ..options),).flatten().join(" ")
  out + ""
}

#let review-state = state("review-mode", sys.inputs.at("review", default: "false") in ("true", "1", "yes"))
#let word-stats-state = state("word-stats-state", (
  raw: (words: 0, chars: 0),
  review: (words: 0, chars: 0),
))

#let ui-label(cs, en) = cs

#let alert(body) = context if review-state.get() {
  [#block(fill: rgb("fefce8"), stroke: (left: 3pt + rgb("eab308")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("854d0e"), size: 10.5pt)[📐 *Strukturální upozornění:* #body]) <callout>]
} else { none }
#let struct-alert = alert

#let note(body) = context if review-state.get() {
  [#block(fill: rgb("ecfdf5"), stroke: (left: 3pt + rgb("10b981")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("065f46"), size: 10.5pt)[💡 *Návrh na vylepšení:* #body]) <callout>]
} else { none }

#let issue(body) = context if review-state.get() {
  [#block(fill: rgb("fef2f2"), stroke: (left: 3pt + rgb("ef4444")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("991b1b"), size: 10.5pt)[⚠️ *Chyba / Nesrovnalost k opravě:* #body]) <callout>]
} else { none }

#let critique(body) = context if review-state.get() {
  [#block(fill: rgb("fff7ed"), stroke: (left: 3pt + rgb("ea580c")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("9a3412"), size: 10.5pt)[🔥 *Hloubková kritika / Oponentura:* #body]) <callout>]
} else { none }

#let scope-note(body) = context if review-state.get() {
  [#block(fill: rgb("eff6ff"), stroke: (left: 3pt + rgb("3b82f6")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("1e40af"), size: 10.5pt)[📌 *Metodické vymezení / Rozsah práce:* #body]) <callout>]
} else { none }
#let blue-note = scope-note

#let added(body) = context if review-state.get() {
  highlight(fill: rgb("#dafbe1"))[#text(fill: rgb("#116329"))[[#text("+ ") <diff-prefix>]#body]]
} else { body }
#let ai = added

#let draft(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#eab308"), offset: 2.5pt)[#body]
} else { none }
#let unconfirmed = draft

#let accepted(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#2563eb"), offset: 2.5pt)[#body]
} else { body }

#let finalized(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#16a34a"), offset: 2.5pt)[#body]
} else { body }

#let removed(body) = context if review-state.get() {
  [#highlight(fill: rgb("#ffebe9"))[#text(fill: rgb("#82071e"))[#text("- ")#body]] <removed-diff>]
} else { none }

#let diff(old, new) = context if review-state.get() {
  [#removed(old) #added(unconfirmed(new))]
} else { old }

#let semantic-term(value) = {
  assert(value.kind in ("concept", "section"), message: "term API expects a semantic concept or section")
  assert(value.term != none or value.keyword != none, message: "semantic item requires term or keyword: " + value.key)
  none
}

#let term-full-name(value) = {
  semantic-term(value)
  if value.term != none and value.keyword != none {
    value.term + " (" + value.keyword + ")"
  } else if value.term != none {
    value.term
  } else {
    value.keyword
  }
}

#let term-link-label(value) = {
  semantic-term(value)
  if value.kind == "section" {
    label("section-" + value.key)
  } else {
    label("concept-" + value.key)
  }
}

#let term(
  value,
  linked: true,
  marker: true,
  emphasized: true,
  cite: false,
) = context {
  semantic-term(value)
  let name = term-full-name(value)
  let displayed = if emphasized { [_*#name*_] } else { name }
  if linked {
    displayed = link(term-link-label(value), displayed)
  }
  if marker {
    [#displayed#super[#text(fill: rgb("#2563eb"), size: 0.72em)[#text("*")]]]
  } else {
    displayed
  }
}
#let kw = term
#let render-term = term
""")

    terms_entries = []
    for k, v in sorted(vocab.items()):
        term_val = json.dumps(v.get("term") or "", ensure_ascii=False) if v.get("term") else "none"
        kw_val = json.dumps(v.get("keyword") or "", ensure_ascii=False) if v.get("keyword") else "none"
        kind_val = json.dumps(v.get("kind") or "concept", ensure_ascii=False)
        safe_key = f'"{k}"' if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_-]*$", k) else k
        terms_entries.append(
            f'  {safe_key}: (key: "{k}", term: {term_val}, keyword: {kw_val}, kind: {kind_val}),'
        )
    lines.append("// ── Slovník pojmů (Vocabulary) ──────────────────────────────")
    lines.append("#let terms = (\n" + "\n".join(terms_entries) + "\n)")
    lines.append("")

    lines.append("""
#let regular-level-one-heading(it) = block(above: 21pt, below: 10pt, sticky: true, text(size: 16pt, weight: "bold", it))
#let nadpis-bez-cisla(text-nadpisu) = heading(numbering: none, outlined: true, bookmarked: false, text-nadpisu)

#let meta = (
  autor: "Patrik Marius",
  trida: "4.D",
  vedouci: "Michal Dočekal",
  konzultant: none,
  skola: "Gymnázium J. K. Tyla",
  skola-zkratka: "GJKT",
  mesto: "Hradci Králové",
  rok: 2026,
  annotation-cs: [
    Odborná práce zkoumá využití agentní umělé inteligence při vývoji softwaru se zaměřením na architekturu agentního harnessu.
    Kapitoly 2–4 sledují přechod od jazykového modelu přes Harness k AI-asistovanému vývoji a agentickému inženýrství.
    Kapitoly 5–6 oddělují kanonickou dokumentaci DarkFactory od vyhodnocení dostupných důkazů.
    Evaluace používá zdrojový kód, automatické testy a CI výsledky a výslovně rozlišuje prokázané mechanismy od neprokázaného plného produkčního průchodu.
  ],
  abstract-en: [
    This thesis examines the use of agentic artificial intelligence in software development, focusing on the architecture of an agent harness.
    Chapters 2–4 progress from the language model through the harness to AI-assisted development and agentic engineering.
    Chapters 5–6 separate the canonical DarkFactory documentation from evaluation of the available evidence.
    The evaluation uses source code, automated tests, and CI results and explicitly distinguishes demonstrated mechanisms from a full production lifecycle that was not demonstrated.
  ],
  podekovani: none,
)

#set document(title: "AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory", author: meta.autor)
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm),
  footer: none,
)
#set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
#set par(justify: true, leading: 1.5 * 0.65em, spacing: 8pt, first-line-indent: 0pt)
#show par: it => block(breakable: false, it)

#set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set std.terms(indent: 0pt, hanging-indent: 1.6em, spacing: 4pt)
#show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show std.terms: it => block(above: 3pt, below: 5pt, breakable: true, it)

#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  regular-level-one-heading(it)
}
#show heading.where(level: 2): it => pad(left: 0.75em)[#block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))]
#show heading.where(level: 3): it => pad(left: 1.5em)[#block(above: 17pt, below: 8pt, sticky: true, text(size: 12pt, weight: "bold", it))]
#show heading.where(level: 4): it => pad(left: 2.25em)[#block(above: 14pt, below: 6pt, sticky: true, text(size: 11pt, weight: "bold", it))]
#show heading.where(level: 5): it => pad(left: 3em)[#block(above: 12pt, below: 5pt, sticky: true, text(size: 10.5pt, weight: "bold", it))]
#show heading.where(level: 6): it => pad(left: 3.75em)[#block(above: 10pt, below: 4pt, sticky: true, text(size: 10pt, weight: "bold", it))]

#show figure.caption: set text(size: 10pt)
#show raw: set text(font: ("DejaVu Sans Mono",), size: 9.5pt)
#show raw.where(block: true): it => block(
  fill: rgb("#1e293b"), stroke: 0.5pt + rgb("#334155"), inset: (x: 10pt, y: 8pt), radius: 4pt, width: 100%,
  text(fill: rgb("#f1f5f9"), it),
)
#show raw.where(block: false): it => box(
  fill: rgb("#f1f5f9"), stroke: 0.3pt + rgb("#cbd5e1"), inset: (x: 3pt, y: 1pt), radius: 2pt,
  text(fill: rgb("#0f172a"), it),
)
#show link: set text(fill: rgb("#0b4f9e"))
#show cite: it => super(it)
#set table(stroke: 0.5pt, inset: (x: 5pt, y: 4pt))
#set figure(numbering: "1")
""")

    # 2. Front matter
    lines.append("// ── Přední část ──────────────────────────────────────────")
    lines.append("""
// Titulní strana
#align(center)[
  #v(1cm)
  #text(size: 14pt, weight: "bold", meta.skola)
  #v(1fr)
  #text(size: 26pt, weight: "bold", hyphenate: false)[AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory]
  #v(0.7cm)
  #text(size: 15pt, tracking: 2pt)[ODBORNÁ PRÁCE]
  #v(1fr)
]
#align(left)[
  #set text(size: 12pt)
  #context {
    let s = word-stats-state.final()
    let range-line(stats) = [Rozsah práce: #stats.words slov / #stats.chars znaků]
    let rozsahy = stack(
      dir: ttb,
      spacing: 3pt,
      range-line(s.raw),
      unconfirmed(range-line(s.review)),
    )
    grid(
      columns: (1fr, auto),
      column-gutter: 1.2em,
      row-gutter: 4pt,
      [Autor práce: #meta.autor, #meta.trida],
      rozsahy,
      [Vedoucí práce: #meta.vedouci],
      none,
    )
  }
  #v(0.8cm)
  #align(center)[#text(size: 12pt, str(meta.rok))]
]
#pagebreak()

// Prohlášení
#nadpis-bez-cisla[Prohlášení]
Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval/a
samostatně pod dohledem vedoucího uvedeného na první straně. Všechny
použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané
jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby
tištěná forma práce byla uchována na #meta.skola a tam používána jako
tištěný zdroj např. pro další studentské práce či pro prezentaci
vzdělávání na #meta.skola-zkratka.

#v(1.5cm)
V #meta.mesto dne #box(width: 4.5cm, repeat("…")) #h(1fr) Podpis autora práce: #box(width: 4.5cm, repeat("…"))
#pagebreak()

// Anotace a klíčová slova
#nadpis-bez-cisla[Anotace]
#meta.annotation-cs

#nadpis-bez-cisla[Abstract]
#meta.abstract-en

#nadpis-bez-cisla[Klíčová slova]
""")

    # Render sorted keywords
    sorted_keywords = sorted(
        [v for v in vocab.values() if v.get("keyword")],
        key=lambda x: str(x.get("term") or x.get("keyword")).lower(),
    )
    kw_strings = []
    for item in sorted_keywords:
        full_name = format_term_full_name(item)
        kw_strings.append(f"{full_name}")
    lines.append(f"#text(size: 11pt, fill: black)[{', '.join(kw_strings)}]")
    lines.append("#pagebreak()")
    lines.append("")

    # Obsah
    lines.append("// Obsah")
    lines.append("#outline(title: [Obsah], depth: 99, indent: 1.4em)")
    lines.append("")

    # 3. Main body setup
    lines.append("// ── Vlastní text ─────────────────────────────────────────")
    lines.append("""
#set page(footer: context {
  align(center, text(font: PISMO, size: 11pt, counter(page).display("1")))
})
#metadata("body-start") <body-start-anchor>
""")

    def render_concept_item(c_dict: dict[str, Any], level: int) -> list[str]:
        clines: list[str] = []
        key = c_dict["key"]
        parsed = parsed_items.get(key, {})
        full_name = format_term_full_name(c_dict)

        # Concept heading
        clines.append(
            f"#heading(level: {level}, numbering: none, outlined: false, bookmarked: false)[{full_name}] <concept-{key}>"
        )

        # Definition
        definition = parsed.get("definition")
        if definition:
            clines.append(f"[\n  #set par(first-line-indent: (amount: 1.5em, all: true))\n  {definition}\n]\n")

        # Description
        description = parsed.get("description")
        if description:
            clines.append(f"{description}\n")

        # Examples
        examples_raw = parsed.get("examples")
        if examples_raw:
            ex_tokens = [tok.strip() for tok in re.findall(r"([a-zA-Z0-9_.-]+)", examples_raw) if tok.strip() not in ("none", "item")]
            seen_ex = set()
            for tok in ex_tokens:
                base_var = tok.split(".")[0]
                file_name = Path(parsed.get("_file", "")).name
                file_stem = Path(parsed.get("_file", "")).stem
                ex_parsed = (
                    parsed_items.get(f"{file_name}:{base_var}")
                    or parsed_items.get(f"{file_stem}:{base_var}")
                    or parsed_items.get(base_var)
                    or parsed_items.get(tok)
                )
                if not ex_parsed and "karpathy" in tok:
                    ex_parsed = parsed_items.get("karpathy_vibe_coding_tweet")
                if ex_parsed:
                    ex_k = ex_parsed.get("key")
                    if ex_k in seen_ex:
                        continue
                    seen_ex.add(ex_k)
                    ex_kind = ex_parsed.get("kind", "example")
                    ex_title = ex_parsed.get("title", "")
                    if ex_title.startswith("[") and ex_title.endswith("]"):
                        ex_title = ex_title[1:-1]
                    ex_desc = ex_parsed.get("description", "")
                    ex_vis = ex_parsed.get("visual", "")
                    ex_def = ex_parsed.get("definition", "")

                    if ex_kind == "example":
                        if ex_title:
                            clines.append(f"#block[#strong[{ex_title}.] {ex_desc}] <example-{ex_k}>\n")
                        else:
                            clines.append(f"#block[{ex_desc}] <example-{ex_k}>\n")
                    elif ex_vis:
                        clines.append(f"#block[{ex_desc}] <concept-{ex_k}>\n")
                    else:
                        full_name = format_term_full_name(ex_parsed)
                        clines.append(f"#block[{full_name}. {ex_def}] <concept-{ex_k}>\n{ex_desc}\n")
                    if ex_vis:
                        clines.append(f"{ex_vis}\n")

        # Visual
        visual = parsed.get("visual")
        if visual:
            clines.append(f"{visual}\n")

        # Practical
        practical = parsed.get("practical")
        if practical:
            clines.append(f"[#emph[Praktický význam:] {practical}]\n")

        return clines

    def render_folder_node(folder: dict[str, Any], level: int) -> list[str]:
        flines: list[str] = []
        key = folder["key"]
        if key == "appendices":
            return flines

        title = clean_repr_content(folder.get("title"))
        sec_title = clean_repr_content(folder.get("section_title"))
        sec_key = folder.get("section_key")

        heading_title = title or sec_title
        has_heading = bool(heading_title)
        child_level = level

        if has_heading:
            flines.append(f"#heading(level: {level})[{heading_title}] <section-{key}>")
            child_level = level + 1

            if sec_key and sec_key in parsed_items:
                sec_item = parsed_items[sec_key]
                s_def = sec_item.get("definition")
                if s_def:
                    flines.append(f"[\n  #set par(first-line-indent: (amount: 1.5em, all: true))\n  {s_def}\n]\n")
                s_desc = sec_item.get("description")
                if s_desc:
                    flines.append(f"{s_desc}\n")
                s_prac = sec_item.get("practical")
                if s_prac:
                    flines.append(f"[#emph[Praktický význam:] {s_prac}]\n")

        # Concepts in folder
        for c in folder.get("concepts", []):
            flines.extend(render_concept_item(c, child_level))

        # Children folders
        for child in folder.get("children", []):
            flines.extend(render_folder_node(child, child_level))

        # Conclusion in section
        if sec_key and sec_key in parsed_items:
            s_concl = parsed_items[sec_key].get("conclusion")
            if s_concl:
                flines.append(f"{s_concl}\n")

        return flines

    # Render manuscript folders (Chapters 1 to 7)
    for folder in folders:
        if folder["key"] == "appendices":
            continue
        lines.extend(render_folder_node(folder, level=1))

    # 4. Back matter / Bibliography
    lines.append("""
#metadata("body-end") <body-end-anchor>

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("/DarkFactory/bib/references.bib", style: "iso-690-numeric", title: none, full: true)
""")

    # 5. Appendices
    lines.append("""
// ── Přílohy ──────────────────────────────────────────────
#metadata("appendix-start") <appendix-start-anchor>
#pagebreak(weak: true)

#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
#pagebreak(weak: true)

#nadpis-bez-cisla[Seznam příloh]
#counter(heading).update(0)
#set heading(numbering: "A.1", supplement: [Příloha])
#outline(title: none, target: heading.where(level: 1, supplement: [Příloha]))

#heading(level: 1, supplement: [Příloha])[Encyklopedie a rejstřík pojmů] <section-concept_encyclopedia>
Abecední přehled klíčových pojmů použitých v práci. Názvy a definice jsou odvozeny přímo z kanonických sémantických položek.
""")

    # Render alphabetical dictionary of concepts with definitions and links
    for item in sorted_keywords:
        full_name = format_term_full_name(item)
        key = item["key"]
        parsed = parsed_items.get(key, {})
        c_def = parsed.get("definition", "")
        prefix = "section-" if item.get("kind") == "section" else "concept-"
        lines.append(f"#block(above: 6pt, below: 2pt)[#link(<{prefix}{key}>, strong([{full_name}]))]")
        if c_def:
            lines.append(f"{c_def}\n")

    # 6. Word count stats calculation
    lines.append("""
// ── Výpočet rozsahu práce ─────────────────────────────────
#context {
  let core = sel => selector(sel)
    .after(<body-start-anchor>, inclusive: false)
    .before(<body-end-anchor>, inclusive: false)

  let containers = selector(list).or(enum).or(std.terms).or(table).or(figure.caption)
  let nested-par-locs = query(core(selector(par).within(containers))).map(it => it.location())
  let nested-list-locs = query(core(selector(list).within(containers))).map(it => it.location())
  let nested-enum-locs = query(core(selector(enum).within(containers))).map(it => it.location())
  let nested-terms-locs = query(core(selector(std.terms).within(containers))).map(it => it.location())
  let nested-table-locs = query(core(selector(table).within(containers))).map(it => it.location())

  let review-words = 0
  let review-chars = 0
  let stats-of = item => string-word-count(extract-text(item))

  for p in query(core(par)) {
    if p.location() not in nested-par-locs {
      let s = stats-of(p.body)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(list)) {
    if item.location() not in nested-list-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(enum)) {
    if item.location() not in nested-enum-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(std.terms)) {
    if item.location() not in nested-terms-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(table)) {
    if item.location() not in nested-table-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for h in query(core(heading)) {
    let s = stats-of(h.body)
    review-words += s.words
    review-chars += s.characters
  }
  for caption in query(core(figure.caption)) {
    let s = stats-of(caption)
    review-words += s.words
    review-chars += s.characters
  }
  for item in query(core(<callout>)) {
    let s = stats-of(item)
    review-words -= s.words
    review-chars -= s.characters
  }
  for item in query(core(<removed-diff>)) {
    let s = stats-of(item)
    review-words -= s.words
    review-chars -= s.characters
  }
  for item in query(core(<diff-prefix>)) {
    let s = stats-of(item)
    review-words -= s.words
    review-chars -= s.characters
  }

  let review-stats = (
    words: calc.max(0, review-words),
    chars: calc.max(0, review-chars),
  )
  let stats = (raw: review-stats, review: review-stats)
  word-stats-state.update(stats)
  [#metadata(stats) <word-stats>]
}
""")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Consolidate the entire paper into a single .typ file."
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("consolidated.typ"),
        help="Path for the consolidated .typ output file (default: consolidated.typ)",
    )
    parser.add_argument(
        "--book",
        type=str,
        default="DarkFactory",
        help="Book folder name (default: DarkFactory)",
    )
    parser.add_argument(
        "--font-path",
        type=Path,
        default=Path("DarkFactory/fonts"),
        help="Font path for typst (default: DarkFactory/fonts)",
    )
    parser.add_argument(
        "--compile",
        action="store_true",
        help="Compile the generated .typ file to PDF to verify output",
    )
    parser.add_argument(
        "--pdf-output",
        type=Path,
        default=Path("out/consolidated.pdf"),
        help="Path for compiled PDF when --compile is used (default: out/consolidated.pdf)",
    )

    args = parser.parse_args()

    book_path = Path(args.book)
    if not book_path.is_dir():
        print(f"Error: book directory {book_path} not found.", file=sys.stderr)
        sys.exit(1)

    print(f"1/4 Scanning concept, section, and example files in {book_path}...")
    parsed_items = collect_parsed_items(book_path)
    print(f"    Found {len(parsed_items)} semantic items.")

    print("2/4 Querying manuscript structure and vocabulary from Typst...")
    folders, vocab = query_structure_from_typst(args.book, args.font_path)
    print(f"    Loaded {len(folders)} root folder entries and {len(vocab)} vocabulary concepts.")

    print(f"3/4 Generating consolidated Typst source -> {args.output}...")
    source = build_consolidated_source(args.book, args.font_path, parsed_items, folders, vocab)
    args.output.write_text(source, encoding="utf-8")
    print(f"    Consolidated paper written ({len(source.splitlines())} lines, {len(source)} bytes).")

    if args.compile:
        print(f"4/4 Compiling {args.output} -> {args.pdf_output}...")
        args.pdf_output.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "typst",
            "compile",
            "--font-path",
            str(args.font_path),
            "--root",
            ".",
            str(args.output),
            str(args.pdf_output),
        ]
        res = subprocess.run(cmd)
        if res.returncode != 0:
            print("Error compiling consolidated typst file!", file=sys.stderr)
            sys.exit(res.returncode)
        print(f"    PDF compiled successfully: {args.pdf_output} ({args.pdf_output.stat().st_size} bytes).")
    else:
        print("4/4 Compilation skipped (use --compile to compile automatically).")

    print("\nDone! Single .typ file ready at:", args.output)


if __name__ == "__main__":
    main()
