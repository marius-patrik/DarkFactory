#!/usr/bin/env python3
"""Compile semantic HTML publications with Typst and derive Markdown from them.

HTML is the canonical semantic web compilation. Markdown is generated
mechanically from that compiled HTML so it cannot drift from the compiled work.
"""

from __future__ import annotations

import argparse
import html
import re
import subprocess
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


PROFILES = (
    ("school", "prace"),
    ("cs", "prace-cs"),
    ("en", "prace-en"),
    ("merged", "prace-bilingual"),
)


PUBLICATION_STYLE = r"""
<style id="darkfactory-publication-style">
:root {
  color-scheme: light;
  --paper-bg: #eef2f7;
  --paper-surface: #ffffff;
  --paper-text: #172033;
  --paper-muted: #667085;
  --paper-border: #d8dee9;
  --paper-link: #175cd3;
  --paper-code: #101828;
  --paper-code-text: #f8fafc;
  --paper-accent: #3157d5;
}
html[data-theme="dark"] {
  color-scheme: dark;
  --paper-bg: #0b0f17;
  --paper-surface: #111827;
  --paper-text: #e5e7eb;
  --paper-muted: #9ca3af;
  --paper-border: #293241;
  --paper-link: #8ab4ff;
  --paper-code: #080b11;
  --paper-code-text: #f3f4f6;
  --paper-accent: #9bb7ff;
}
* { box-sizing: border-box; }
html {
  scroll-behavior: smooth;
  background: var(--paper-bg);
}
body {
  width: min(100% - 32px, 940px);
  margin: 0 auto;
  padding: clamp(28px, 5vw, 72px) clamp(20px, 4vw, 56px) 88px;
  background: var(--paper-surface);
  color: var(--paper-text);
  font-family: Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  font-size: 17px;
  line-height: 1.72;
  overflow-wrap: anywhere;
  box-shadow: 0 0 0 1px var(--paper-border), 0 20px 60px rgb(15 23 42 / 10%);
}
body > h2:first-of-type {
  margin-top: 0;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--paper-border);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2rem, 4.8vw, 3.4rem);
  line-height: 1.08;
  letter-spacing: -0.035em;
  text-align: center;
}
body > h2:first-of-type + p {
  margin: -8px 0 52px;
  color: var(--paper-muted);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  text-align: center;
}
h1, h2, h3, h4, h5, h6 {
  scroll-margin-top: 24px;
  margin: 2.1em 0 .7em;
  color: var(--paper-text);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  line-height: 1.2;
  letter-spacing: -0.018em;
}
h2 { font-size: 1.9rem; }
h3 { font-size: 1.48rem; }
h4 { font-size: 1.22rem; }
h5 { font-size: 1.08rem; }
h6 { font-size: 1rem; }
h2 .prefix, h3 .prefix, h4 .prefix, h5 .prefix, h6 .prefix {
  color: var(--paper-muted);
  font-variant-numeric: tabular-nums;
}
p { margin: .8em 0 1.1em; }
a {
  color: var(--paper-link);
  text-decoration-thickness: .08em;
  text-underline-offset: .18em;
}
a:hover { text-decoration-thickness: .13em; }
ul, ol { padding-left: 1.55em; }
li { margin: .28em 0; }
li > ul, li > ol { margin-top: .35em; }
nav[role="doc-toc"] {
  margin: 46px 0 62px;
  padding: 26px 30px 28px;
  border: 1px solid var(--paper-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--paper-surface) 92%, var(--paper-accent) 8%);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.45;
}
nav[role="doc-toc"] h2 { margin: 0 0 16px; font-size: 1.35rem; }
nav[role="doc-toc"] ol { margin: 0; padding-left: 1.15em; }
nav[role="doc-toc"] li { margin: .36em 0; }
nav[role="doc-toc"] a { color: var(--paper-text); text-decoration: none; }
nav[role="doc-toc"] a:hover { color: var(--paper-link); }
figure {
  margin: 2rem 0;
  padding: 18px;
  border: 1px solid var(--paper-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--paper-surface) 95%, var(--paper-accent) 5%);
}
figure img, figure svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
figcaption {
  margin-top: 12px;
  color: var(--paper-muted);
  font-size: .92rem;
  line-height: 1.5;
}
pre {
  max-width: 100%;
  margin: 1.4rem 0;
  padding: 18px 20px;
  overflow: auto;
  border: 1px solid var(--paper-border);
  border-radius: 10px;
  background: var(--paper-code);
  color: var(--paper-code-text);
  font: 13px/1.55 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
code {
  border-radius: 4px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: .88em;
}
p code, li code {
  padding: .12em .34em;
  background: color-mix(in srgb, var(--paper-surface) 84%, var(--paper-accent) 16%);
}
table {
  width: 100%;
  margin: 1.5rem 0;
  border-collapse: collapse;
  font-size: .95rem;
}
th, td {
  padding: 9px 11px;
  border: 1px solid var(--paper-border);
  text-align: left;
  vertical-align: top;
}
blockquote {
  margin: 1.5rem 0;
  padding: .2rem 0 .2rem 1.2rem;
  border-left: 3px solid var(--paper-accent);
  color: var(--paper-muted);
}
math { max-width: 100%; overflow-x: auto; }
mark { border-radius: 3px; padding: 0 .12em; }
@media (max-width: 640px) {
  body {
    width: 100%;
    padding: 24px 18px 64px;
    box-shadow: none;
  }
  nav[role="doc-toc"] { padding: 20px; }
}
@media print {
  :root {
    --paper-bg: #fff;
    --paper-surface: #fff;
    --paper-text: #111;
    --paper-muted: #555;
    --paper-border: #ddd;
  }
  body { width: auto; margin: 0; padding: 0; box-shadow: none; }
  nav[role="doc-toc"] { break-after: page; }
}
</style>
"""


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node | str"] = field(default_factory=list)


class TreeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {key: value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        if tag.lower() not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {key: value or "" for key, value in attrs})
        self.stack[-1].children.append(node)

    def handle_endtag(self, tag: str) -> None:
        wanted = tag.lower()
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == wanted:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


def text_content(node: Node) -> str:
    parts: list[str] = []
    for child in node.children:
        if isinstance(child, str):
            parts.append(child)
        else:
            parts.append(text_content(child))
    return "".join(parts)


def html_serialize(node: Node) -> str:
    attrs = "".join(
        f' {key}="{html.escape(value, quote=True)}"' for key, value in node.attrs.items()
    )
    if node.tag in {"br", "hr", "img", "meta", "link", "source", "input"}:
        return f"<{node.tag}{attrs}>"
    inner = "".join(
        html.escape(child, quote=False) if isinstance(child, str) else html_serialize(child)
        for child in node.children
    )
    return f"<{node.tag}{attrs}>{inner}</{node.tag}>"


def compact_text(value: str) -> str:
    return re.sub(r"\s+", " ", value)


def block(value: str) -> str:
    value = value.strip()
    return f"\n\n{value}\n\n" if value else ""


def render_children(node: Node, *, list_depth: int = 0) -> str:
    return "".join(
        compact_text(child) if isinstance(child, str) else render_node(child, list_depth=list_depth)
        for child in node.children
    )


def render_list(node: Node, *, ordered: bool, depth: int) -> str:
    lines: list[str] = []
    index = 1
    for child in node.children:
        if not isinstance(child, Node) or child.tag != "li":
            continue
        inline_parts: list[str] = []
        nested: list[Node] = []
        for part in child.children:
            if isinstance(part, Node) and part.tag in {"ul", "ol"}:
                nested.append(part)
            elif isinstance(part, str):
                inline_parts.append(compact_text(part))
            else:
                inline_parts.append(render_node(part, list_depth=depth + 1))
        body = "".join(inline_parts).strip()
        prefix = f"{index}. " if ordered else "- "
        indent = "  " * depth
        body_lines = body.splitlines() or [""]
        lines.append(indent + prefix + body_lines[0])
        continuation = indent + " " * len(prefix)
        lines.extend(continuation + line for line in body_lines[1:] if line.strip())
        for sub in nested:
            nested_text = render_list(sub, ordered=sub.tag == "ol", depth=depth + 1).strip("\n")
            if nested_text:
                lines.append(nested_text)
        index += 1
    return "\n" + "\n".join(lines) + "\n" if lines else ""


def render_node(node: Node, *, list_depth: int = 0) -> str:
    tag = node.tag

    if tag in {"head", "style", "script", "noscript", "template"}:
        return ""
    if tag in {"root", "html", "body"}:
        return render_children(node, list_depth=list_depth)
    if tag in {"table", "math", "svg"}:
        return block(html_serialize(node))
    if tag in {"main", "article", "section", "div", "header", "footer", "nav", "figure"}:
        return block(render_children(node, list_depth=list_depth))
    if tag == "p":
        return block(render_children(node, list_depth=list_depth))
    if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
        level = int(tag[1])
        return block("#" * level + " " + render_children(node, list_depth=list_depth).strip())
    if tag == "br":
        return "\n"
    if tag == "hr":
        return block("---")
    if tag == "ul":
        return render_list(node, ordered=False, depth=list_depth)
    if tag == "ol":
        return render_list(node, ordered=True, depth=list_depth)
    if tag == "li":
        return render_children(node, list_depth=list_depth)
    if tag in {"strong", "b"}:
        return "**" + render_children(node, list_depth=list_depth).strip() + "**"
    if tag in {"em", "i"}:
        return "*" + render_children(node, list_depth=list_depth).strip() + "*"
    if tag in {"del", "s"}:
        return "~~" + render_children(node, list_depth=list_depth).strip() + "~~"
    if tag == "code":
        content = text_content(node)
        fence = "``" if "`" in content else "`"
        return fence + content + fence
    if tag == "pre":
        content = text_content(node).strip("\n")
        fence = "```"
        while fence in content:
            fence += "`"
        return block(f"{fence}\n{content}\n{fence}")
    if tag == "a":
        label = render_children(node, list_depth=list_depth).strip() or node.attrs.get("href", "")
        href = node.attrs.get("href", "")
        return f"[{label}]({href})" if href else label
    if tag == "img":
        alt = node.attrs.get("alt", "")
        src = node.attrs.get("src", "")
        title = node.attrs.get("title", "")
        suffix = f' "{title}"' if title else ""
        return f"![{alt}]({src}{suffix})"
    if tag == "blockquote":
        content = render_children(node, list_depth=list_depth).strip()
        return block("\n".join("> " + line if line else ">" for line in content.splitlines()))
    if tag == "figcaption":
        content = render_children(node, list_depth=list_depth).strip()
        return block("*" + content + "*") if content else ""
    if tag in {"sup", "sub"}:
        return html_serialize(node)
    return render_children(node, list_depth=list_depth)


def html_to_markdown(source: str) -> str:
    parser = TreeParser()
    parser.feed(source)
    rendered = render_node(parser.root)
    lines = [line.rstrip() for line in rendered.splitlines()]
    value = "\n".join(lines)
    value = re.sub(r"\n{3,}", "\n\n", value).strip()
    return value + "\n"


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def style_compiled_html(source: str) -> str:
    if 'id="darkfactory-publication-style"' in source:
        return source
    if "</head>" not in source:
        raise SystemExit("compiled HTML has no </head> for publication styling")
    return source.replace("</head>", PUBLICATION_STYLE + "</head>", 1)


def compile_html(
    *,
    typst: str,
    font_paths: Iterable[str],
    template: str,
    profile: str,
    review: bool,
    source: Path,
    output: Path,
) -> None:
    command = [typst, "compile", "--features", "html", "--format", "html"]
    for font_path in font_paths:
        command.extend(["--font-path", font_path])
    command.extend(["--input", f"template={template}", "--input", f"profile={profile}"])
    if review:
        command.extend(["--input", "review=true"])
    command.extend([str(source), str(output)])
    output.parent.mkdir(parents=True, exist_ok=True)
    run(command)

    html_source = output.read_text(encoding="utf-8")
    lowered = html_source.lower()
    if "<html" not in lowered or "<body" not in lowered:
        raise SystemExit(f"Typst HTML output is not a complete HTML document: {output}")

    html_source = style_compiled_html(html_source)
    output.write_text(html_source, encoding="utf-8")

    markdown = html_to_markdown(html_source)
    md_output = output.with_suffix(".md")
    md_output.write_text(markdown, encoding="utf-8")
    if len(markdown.strip()) < 256 or "#" not in markdown:
        raise SystemExit(f"derived Markdown output is unexpectedly small: {md_output}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--typst", default="typst")
    parser.add_argument("--font-path", action="append", default=[])
    parser.add_argument("--template", required=True)
    parser.add_argument("--source", default="web-publication.typ")
    parser.add_argument("--output-dir", default="out")
    args = parser.parse_args()

    source = Path(args.source)
    if not source.is_file():
        raise SystemExit(f"missing semantic web publication source: {source}")

    output_dir = Path(args.output_dir)
    for profile, stem in PROFILES:
        for review in (False, True):
            suffix = "-review" if review else ""
            html_output = output_dir / f"{stem}{suffix}.html"
            compile_html(
                typst=args.typst,
                font_paths=args.font_path,
                template=args.template,
                profile=profile,
                review=review,
                source=source,
                output=html_output,
            )
            print(
                f"ok: semantic web publication {args.template}/{profile}/"
                f"{'review' if review else 'final'} -> {html_output} + {html_output.with_suffix('.md')}"
            )


if __name__ == "__main__":
    main()
