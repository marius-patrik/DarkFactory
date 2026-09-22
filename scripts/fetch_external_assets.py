#!/usr/bin/env python3
"""Fetch authoritative external figures used by attachment/example concepts."""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = "paper" if (ROOT / "paper").exists() else "DarkFactory"
OUT = ROOT / BOOK_DIR / "img" / "external"
UA = "Mozilla/5.0 (compatible; DarkFactory-Paper/1.0; +https://github.com/marius-patrik/DarkFactory-Paper)"

ASSETS = (
    {
        "path": "karpathy-vibe-coding.png",
        "url": "https://www.coderabbit.ai/content/assets/a-semantic-history-how-the-term-vibe-coding-went-from-a-tweet-to-prod-inline-image.png",
    },
)


def get(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read(), response.headers.get_content_type()


def detected_format(payload: bytes) -> str | None:
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if payload.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if payload.startswith(b"RIFF") and payload[8:12] == b"WEBP":
        return "webp"
    return None


def fetch(path: str, url: str) -> None:
    target = OUT / path
    if target.is_file() and target.stat().st_size > 1024:
        return
    payload, content_type = get(url)
    actual = detected_format(payload)
    expected = target.suffix.lower().lstrip(".")
    if expected == "jpg":
        expected = "jpeg"
    if actual is None:
        raise RuntimeError(f"not a supported image: {url} ({content_type})")
    if actual != expected:
        raise RuntimeError(
            f"image format mismatch for {path}: expected {expected}, got {actual} ({content_type})"
        )
    target.write_bytes(payload)
    print(f"fetched {path}: {len(payload)} bytes")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        fetch(asset["path"], asset["url"])


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"external asset fetch failed: {exc}", file=sys.stderr)
        raise
