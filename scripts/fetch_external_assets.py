#!/usr/bin/env python3
"""Fetch authoritative external figures used by attachment/example concepts."""

from __future__ import annotations

import html.parser
import mimetypes
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "DarkFactory" / "img" / "external"
UA = "DarkFactory-Paper/1.0 (+https://github.com/marius-patrik/DarkFactory-Paper)"

ASSETS = (
    {
        "path": "microsoft-ai-diffusion-2025.png",
        "url": "https://www.microsoft.com/en-us/corporate-responsibility//wp-content/uploads/2026/01/table1-1-1-1024x213.png",
    },
    {
        "path": "chatgpt-macos.webp",
        "url": "https://images.ctfassets.net/j22is2dtoxu1/intercom-img-e1314aa390884a7e44dec5a6/ac351fade56b7018d314107dc0811615/image.png?fm=webp&q=80&w=1100",
    },
    {
        "path": "codex-app.webp",
        "url": "https://images.ctfassets.net/kftzwdyauwt9/212T6zWyTJxsZOe79RrI1a/8af0d0131ab9d1bcc90789fe0910de4e/tablet_m_feature02.png?w=2400&q=90&fm=webp",
    },
    {
        "path": "claude-code.webp",
        "url": "https://assets.claude.com/454390de9d9ccefb6082b7c2440c7547c1ec3964.webp",
    },
    {
        "path": "claude-desktop.webp",
        "url": "https://www.anthropic.com/_next/image?q=90&url=https%3A%2F%2Fwww-cdn.anthropic.com%2Fimages%2F4zrzovbb%2Fwebsite%2Fc5823949d9350145ce2fda51acbc7076f2139cd0-1920x1080.png&w=1920",
    },
)

OG_ASSETS = (
    ("gpt-5-6.webp", "https://openai.com/index/gpt-5-6/"),
    ("claude-opus-5.webp", "https://www.anthropic.com/news/claude-opus-5"),
    ("deepseek-v4-1-flash.webp", "https://www.deepseek.com/en/news/deepseek-v4-1-flash/"),
)


class OgImageParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.image: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta" or self.image:
            return
        data = {key.lower(): value for key, value in attrs if value is not None}
        if data.get("property") in ("og:image", "og:image:url") or data.get("name") in ("og:image", "twitter:image"):
            if data.get("content"):
                self.image = data["content"]


def get(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "image/avif,image/webp,image/png,image/jpeg,text/html;q=0.8,*/*;q=0.5",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read(), response.headers.get_content_type()


def resolve_og(page_url: str) -> str:
    payload, content_type = get(page_url)
    if "html" not in content_type:
        raise RuntimeError(f"expected HTML at {page_url}, got {content_type}")
    parser = OgImageParser()
    parser.feed(payload.decode("utf-8", errors="replace"))
    if not parser.image:
        raise RuntimeError(f"no og:image found at {page_url}")
    return parser.image


def looks_like_image(payload: bytes, content_type: str) -> bool:
    if content_type.startswith("image/"):
        return True
    return (
        payload.startswith(b"\x89PNG\r\n\x1a\n")
        or payload.startswith(b"\xff\xd8\xff")
        or payload.startswith(b"RIFF") and payload[8:12] == b"WEBP"
    )


def fetch(path: str, url: str) -> None:
    target = OUT / path
    if target.is_file() and target.stat().st_size > 1024:
        return
    payload, content_type = get(url)
    if not looks_like_image(payload, content_type):
        raise RuntimeError(f"not an image: {url} ({content_type})")
    target.write_bytes(payload)
    print(f"fetched {path}: {len(payload)} bytes")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        fetch(asset["path"], asset["url"])
    for path, page_url in OG_ASSETS:
        fetch(path, resolve_og(page_url))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"external asset fetch failed: {exc}", file=sys.stderr)
        raise
