#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path("DarkFactory")

def matching(text: str, start: int, opening: str = "(", closing: str = ")") -> int:
    depth = 0
    quote = None
    escape = False
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack: list[str] = []
    for i in range(start, len(text)):
        ch = text[i]
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            continue
        if ch in ('"', "'"):
            quote = ch
            continue
        if ch in pairs:
            stack.append(pairs[ch])
        elif stack and ch == stack[-1]:
            stack.pop()
            if not stack:
                return i
    raise ValueError(f"unbalanced expression at {start}")

def split_top_level(text: str) -> list[str]:
    parts: list[str] = []
    start = 0
    quote = None
    escape = False
    stack: list[str] = []
    pairs = {"(": ")", "[": "]", "{": "}"}
    for i, ch in enumerate(text):
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            continue
        if ch in ('"', "'"):
            quote = ch
        elif ch in pairs:
            stack.append(pairs[ch])
        elif stack and ch == stack[-1]:
            stack.pop()
        elif ch == "," and not stack:
            value = text[start:i].strip()
            if value:
                parts.append(value)
            start = i + 1
    value = text[start:].strip()
    if value:
        parts.append(value)
    return parts

def kwargs(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in split_top_level(text):
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        out[key.strip()] = value.strip()
    return out

def translation_slots(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    value = value.strip()
    if not value.startswith("translation("):
        return value, value
    open_at = value.index("(")
    close_at = matching(value, open_at)
    data = kwargs(value[open_at + 1:close_at])
    return data.get("cs"), data.get("en")

def universal_slot(value: str | None) -> str | None:
    cs, en = translation_slots(value)
    return en or cs

def clean_imports(text: str) -> str:
    text = re.sub(r"\bdefine-term\s*,\s*", "", text)
    text = re.sub(r",\s*define-term\b", "", text)
    return text

def migrate_concept_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "#let terminology = define-term(" not in text:
        # remove obsolete renderer-only arguments everywhere
        updated = re.sub(r"\s*render:\s*\"term\"\s*,", "", text)
        updated = re.sub(r"\s*register:\s*(?:true|false)\s*,", "", updated)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            return True
        return False

    marker = "#let terminology = define-term("
    start = text.index(marker)
    open_at = text.index("(", start + len("#let terminology = define-term"))
    close_at = matching(text, open_at)
    end = close_at + 1
    if end < len(text) and text[end] == "\n":
        end += 1

    data = kwargs(text[open_at + 1:close_at])
    proper_cs, proper_en = translation_slots(data.get("proper"))
    if proper_cs is None and proper_en is None:
        raise ValueError(f"{path}: terminology has no proper name")

    fields: list[tuple[str, str | None]] = [
        ("industry", universal_slot(data.get("industry"))),
        ("czech", proper_cs),
        ("english", proper_en),
        ("alias", universal_slot(data.get("alias"))),
        ("citation", data.get("citation")),
        ("source", data.get("source")),
    ]
    field_text = "".join(f"  {name}: {value},\n" for name, value in fields if value not in (None, "none"))

    text = text[:start] + text[end:]
    text = clean_imports(text)
    text, replaced = re.subn(r"\\bterm:\\s*terminology,\\s*", field_text, text, count=1)
    if replaced != 1 or "term: terminology" in text:
        raise ValueError(f"{path}: failed to replace terminology reference")

    text = re.sub(r"\s*render:\s*\"term\"\s*,", "", text)
    text = re.sub(r"\s*register:\s*(?:true|false)\s*,", "", text)
    path.write_text(text, encoding="utf-8")
    return True

SCHEMA = r'''#import "/DarkFactory/templates/common.typ": finalized, term, render-translation, resolve-citation-label, profile-state

#let relation(type, target) = {
  assert(type in ("dependency", "related"), message: "unsupported semantic relation: " + type)
  assert(target != none, message: "concept relation requires a target")
  (type: type, target: target)
}

#let concept(
  key: none,
  industry: none,
  czech: none,
  english: none,
  alias: none,
  title: none,
  citation: none,
  source: none,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
) = {
  assert(key != none, message: "concept requires a stable key")
  assert(czech != none or english != none or industry != none, message: "concept requires canonical terminology")
  assert(definition != none, message: "concept requires a definition")
  assert(description != none, message: "concept requires a description")
  assert(summary != none, message: "concept requires a summary")
  (
    kind: "concept",
    key: key,
    industry: industry,
    czech: czech,
    english: english,
    alias: alias,
    title: title,
    citation: citation,
    source: source,
    definition: definition,
    description: description,
    summary: summary,
    visual: visual,
    examples: examples,
    attachments: attachments,
    citations: citations,
    relations: relations,
  )
}

#let folder(
  key: none,
  title: none,
  section: none,
  concepts: (),
  children: (),
) = {
  assert(key != none, message: "folder requires a stable key")
  (
    kind: "folder",
    key: key,
    title: title,
    section: section,
    concepts: concepts,
    children: children,
  )
}

#let collect-concept(item) = {
  let result = (item,)
  for child in item.examples { result += collect-concept(child) }
  for child in item.attachments { result += collect-concept(child) }
  result
}

#let collect-folder-concepts(node) = {
  let result = ()
  if node.section != none { result += collect-concept(node.section) }
  for item in node.concepts { result += collect-concept(item) }
  for child in node.children { result += collect-folder-concepts(child) }
  result
}

#let collect-concepts(folders) = {
  let result = ()
  for node in folders { result += collect-folder-concepts(node) }
  result
}

#let build-vocabulary(folders) = {
  let result = (:)
  for item in collect-concepts(folders) {
    assert(not item.key in result, message: "duplicate concept key: " + item.key)
    result.insert(item.key, item)
  }
  result
}

#let semantic-graph(folders) = {
  let concepts = collect-concepts(folders)
  let keys = concepts.map(item => item.key)
  let dependencies = (:)
  let related = (:)
  for item in concepts {
    dependencies.insert(item.key, ())
    related.insert(item.key, ())
  }

  for item in concepts {
    for edge in item.relations {
      assert(edge.type in ("dependency", "related"), message: "unsupported semantic relation " + edge.type + " on " + item.key)
      assert(edge.target in keys, message: "unknown relation target " + edge.target + " from " + item.key)
      if edge.type == "dependency" {
        if not edge.target in dependencies.at(item.key) { dependencies.at(item.key).push(edge.target) }
      } else {
        if not edge.target in related.at(item.key) { related.at(item.key).push(edge.target) }
        if not item.key in related.at(edge.target) { related.at(edge.target).push(item.key) }
      }
    }
  }

  let done = ()
  let remaining = keys
  while remaining.len() > 0 {
    let progressed = false
    for key in remaining {
      if dependencies.at(key).all(dep => dep in done or not dep in remaining) {
        done.push(key)
        remaining = remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "dependency cycle in concept graph")
  }

  (dependencies: dependencies, related: related)
}

#let order-local(items, graph) = {
  let keys = items.map(item => item.key)
  let result = ()
  let remaining = keys
  while remaining.len() > 0 {
    let progressed = false
    for key in remaining {
      let deps = graph.dependencies.at(key)
      if deps.filter(dep => dep in keys).all(dep => dep in result) {
        result.push(key)
        remaining = remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "local dependency cycle")
  }
  result.map(key => items.find(item => item.key == key))
}

#let order-folders(nodes, graph) = {
  let keyed = nodes.filter(node => node.section != none)
  let unkeyed = nodes.filter(node => node.section == none)
  let keys = keyed.map(node => node.section.key)
  let result = ()
  let remaining = keys
  while remaining.len() > 0 {
    let progressed = false
    for key in remaining {
      let deps = graph.dependencies.at(key)
      if deps.filter(dep => dep in keys).all(dep => dep in result) {
        result.push(key)
        remaining = remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "sibling section dependency cycle")
  }
  result.map(key => keyed.find(node => node.section.key == key)) + unkeyed
}

#let render-concept-title(item) = context {
  if item.title != none {
    render-translation(item.title, language: "auto", school-both: false)
  } else {
    term(item, surface: "full", linked: false, marker: false, emphasized: false)
  }
}

#let render-citations(item) = {
  if item.citations.len() > 0 {
    let render-one(c) = {
      let lbl = resolve-citation-label(c)
      if lbl != none { cite(lbl) } else { none }
    }
    item.citations.map(render-one).filter(x => x != none).join()
  }
}

#let render-concept(item, terms, graph, level: 1) = {
  let output = [#heading(level: level)[#finalized[#render-concept-title(item)]]#label("concept-" + item.key)]

  output += (item.definition)(terms)
  output += (item.description)(terms)
  if item.visual != none { output += (item.visual)(terms) }

  for example in order-local(item.examples, graph) {
    output += render-concept(example, terms, graph, level: level + 1)
  }
  for attachment in order-local(item.attachments, graph) {
    output += render-concept(attachment, terms, graph, level: level + 1)
  }

  output += (item.summary)(terms)

  let citations = render-citations(item)
  if citations != none { output += [#citations] }

  output
}

#let render-folder(node, terms, graph, level: 1) = {
  let output = []
  let child-level = level

  if node.section != none {
    output += render-concept(node.section, terms, graph, level: level)
    child-level = level + 1
  }

  for item in order-local(node.concepts, graph) {
    output += render-concept(item, terms, graph, level: child-level)
  }
  for child in order-folders(node.children, graph) {
    output += render-folder(child, terms, graph, level: child-level)
  }
  output
}

#let render-folders(folders, terms, level: 1) = {
  let graph = semantic-graph(folders)
  let output = []
  for node in order-folders(folders, graph) {
    output += render-folder(node, terms, graph, level: level)
  }
  output
}
'''

COMMON_SUFFIX = r'''#let resolve-citation-label(c) = {
  if c == none { none }
  else if type(c) == label { c }
  else if type(c) == str { label(c) }
  else if type(c) == dictionary and "citation" in c { resolve-citation-label(c.citation) }
  else if type(c) == dictionary and "label" in c { resolve-citation-label(c.label) }
  else { none }
}

#let term-source(value) = {
  assert(value.kind == "concept", message: "term-source() expects a concept")
  value.source
}

#let term-citation(value) = {
  assert(value.kind == "concept", message: "term-citation() expects a concept")
  value.citation
}

#let concept-proper(value, language: "auto") = context {
  let profile = profile-state.get()
  let lang = if language != "auto" { language } else if profile in ("school", "cs") { "cs" } else if profile == "en" { "en" } else { "both" }
  if lang == "cs" {
    if value.czech != none { text(lang: "cs")[#value.czech] } else if value.english != none { text(lang: "en")[#value.english] } else { value.industry }
  } else if lang == "en" {
    if value.english != none { text(lang: "en")[#value.english] } else if value.czech != none { text(lang: "cs")[#value.czech] } else { value.industry }
  } else if value.czech != none and value.english != none and str(value.czech) != str(value.english) {
    [#text(lang: "en")[#value.english] (#text(lang: "cs")[#value.czech])]
  } else if value.english != none {
    text(lang: "en")[#value.english]
  } else if value.czech != none {
    text(lang: "cs")[#value.czech]
  } else {
    value.industry
  }
}

#let raw-proper(value, language: "auto") = context {
  let profile = profile-state.get()
  let lang = if language != "auto" { language } else if profile in ("school", "cs") { "cs" } else { "en" }
  if lang == "cs" {
    if value.czech != none { str(value.czech) } else if value.english != none { str(value.english) } else { str(value.industry) }
  } else {
    if value.english != none { str(value.english) } else if value.czech != none { str(value.czech) } else { str(value.industry) }
  }
}

#let term-name(value, surface: "full", language: "auto") = context {
  assert(value.kind == "concept", message: "term-name() expects a concept")
  assert(surface in ("full", "industry", "proper", "alias"), message: "unsupported term surface")
  let proper = concept-proper(value, language: language)
  if surface == "proper" { return proper }
  if surface == "industry" {
    return if value.industry != none { value.industry } else { proper }
  }
  if surface == "alias" {
    return if value.alias != none { value.alias } else if value.industry != none { value.industry } else { proper }
  }

  let lead = if value.industry != none { value.industry } else if value.english != none { value.english } else { value.czech }
  let lead-raw = str(lead)
  let cs-raw = if value.czech != none { str(value.czech) } else { none }
  let en-raw = if value.english != none { str(value.english) } else { none }
  [
    #lead
    #if value.czech != none and cs-raw != lead-raw {
      [#h(0.25em)#text("(")#text(lang: "cs")[#value.czech]#text(")")]
    }
    #if value.english != none and en-raw != lead-raw and en-raw != cs-raw {
      [#h(0.25em)#text("[")#text(lang: "en")[#value.english]#text("]")]
    }
    #if value.alias != none and str(value.alias) != lead-raw and str(value.alias) != cs-raw and str(value.alias) != en-raw {
      [#h(0.25em)#text("[")#value.alias#text("]")]
    }
  ]
}

#let term-sort-name(value) = {
  if value.industry != none { str(value.industry) }
  else if value.english != none { str(value.english) }
  else { str(value.czech) }
}

#let term(
  value,
  surface: "full",
  language: "auto",
  linked: true,
  marker: true,
  emphasized: true,
  cite: false,
) = context {
  assert(value.kind == "concept", message: "term() expects a concept")
  let name = term-name(value, surface: surface, language: language)
  let displayed = if emphasized { [_*#name*_] } else { name }
  if linked {
    displayed = link(label("concept-" + value.key), displayed)
  }
  if cite and value.citation != none {
    let render-c(c) = {
      let lbl = resolve-citation-label(c)
      if lbl != none { cite(lbl) } else { none }
    }
    let cites = if type(value.citation) == array {
      value.citation.map(render-c).filter(x => x != none).join()
    } else {
      render-c(value.citation)
    }
    if cites != none { displayed = [#displayed~#cites] }
  }
  if marker {
    [#displayed#super[#text(fill: rgb("#2563eb"), size: 0.72em)[#text("*")]]]
  } else {
    displayed
  }
}

#let kw = term
#let render-term = term

#let render-keywords(items) = context {
  let unique = ()
  for item in items {
    if not unique.any(existing => existing.key == item.key) {
      unique.push(item)
    }
  }
  let ordered = unique.sorted(key: item => lower(term-sort-name(item)))
  if ordered.len() == 0 {
    finalized[—]
  } else {
    finalized[
      #text(size: 11pt)[
        #ordered.map(item => term(
          item,
          surface: "full",
          linked: true,
          marker: false,
          emphasized: false,
        )).join([, ])
      ]
    ]
  }
}
'''

def rewrite_common() -> None:
    path = ROOT / "templates/common.typ"
    text = path.read_text(encoding="utf-8")
    marker = "#let term-use-label"
    if marker not in text:
        raise ValueError("common.typ terminology marker missing")
    text = text[:text.index(marker)] + COMMON_SUFFIX + "\n"
    path.write_text(text, encoding="utf-8")

def rewrite_schema() -> None:
    (ROOT / "schema.typ").write_text(SCHEMA, encoding="utf-8")

def main() -> None:
    changed = 0
    for path in ROOT.rglob("*.typ"):
        if path.name in {"schema.typ", "common.typ"}:
            continue
        if migrate_concept_file(path):
            changed += 1

    rewrite_schema()
    rewrite_common()

    stale = []
    for path in ROOT.rglob("*.typ"):
        text = path.read_text(encoding="utf-8")
        if "define-term" in text or "term: terminology" in text:
            stale.append(str(path))
    if stale:
        raise SystemExit("stale terminology abstraction remains:\n" + "\n".join(stale))
    print(f"migrated {changed} Typst files to concept-owned terminology")

if __name__ == "__main__":
    main()
