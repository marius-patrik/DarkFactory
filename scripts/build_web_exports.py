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


PUBLICATION_CSS = Path("web/src/publication.css")
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
    if not PUBLICATION_CSS.is_file():
        raise SystemExit(f"missing shared publication stylesheet: {PUBLICATION_CSS}")

    css = PUBLICATION_CSS.read_text(encoding="utf-8")
    style = '<style id="darkfactory-publication-style">\n' + css + '\n</style>'

    body_match = re.search(r"<body(?P<attrs>[^>]*)>", source, flags=re.IGNORECASE)
    if not body_match:
        raise SystemExit("compiled HTML has no <body> for publication styling")
    attrs = body_match.group("attrs")
    class_match = re.search(r'class="([^"]*)"', attrs)
    if class_match:
        classes = class_match.group(1).split()
        if "publication-surface" not in classes:
            classes.append("publication-surface")
        replacement_attrs = re.sub(
            r'class="[^"]*"',
            'class="' + " ".join(classes) + '"',
            attrs,
            count=1,
        )
    else:
        replacement_attrs = attrs + ' class="publication-surface"'
    source = source[:body_match.start()] + "<body" + replacement_attrs + ">" + source[body_match.end():]
    return source.replace("</head>", style + "</head>", 1)


def compile_html(
    *,
    typst: str,
    font_paths: Iterable[str],
    book: str,
    template: str,
    profile: str,
    review: bool,
    source: Path,
    output: Path,
) -> None:
    command = [typst, "compile", "--features", "html", "--format", "html"]
    for font_path in font_paths:
        command.extend(["--font-path", font_path])
    command.extend([
        "--input", f"book={book}",
        "--input", f"template={template}",
        "--input", f"profile={profile}",
    ])
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
    parser.add_argument("--book", required=True)
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
                book=args.book,
                template=args.template,
                profile=profile,
                review=review,
                source=source,
                output=html_output,
            )
            print(
                f"ok: semantic web publication {args.book}/{args.template}/{profile}/"
                f"{'review' if review else 'final'} -> {html_output} + {html_output.with_suffix('.md')}"
            )


if __name__ == "__main__":
    main()
