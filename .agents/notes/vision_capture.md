# Vision capture — provenance

> **Historical note.** This note preserves the provenance of the original vision conversation. Current product requirements are in [`PRD.md`](../../PRD.md); the decisions
> made since are recorded as ADRs in [`.agents/notes/adr/`](adr/).

This note records the provenance of the Gemini scoping conversation ("App Scoping Technical
Specifications Discussion") and how the transcript was captured. The retired `VISION.md` was the
non-normative synthesis of the DarkFactory product vision; it did **not** originate from this
conversation and did not "produce Omnis" — Omnis is a separate consumer repository with its own
scoping and product docs. The turns listed below document a distinct Omnis-era scoping session and
are preserved here for provenance only.

## Source

- **Conversation**: Google Gemini, "App Scoping Technical Specifications Discussion"
- **URL**: `https://gemini.google.com/app/545cf54445afcd33`
- **Account**: the maintainer's Google account
- **Captured**: 2026-09-06
- **Size**: 20 turns, 79,181 characters of rendered text

## Status: complete

All 20 turns are captured. No gaps.

| Turns | Content |
|---|---|
| 0–1 | App icon configuration; the Dynamic Brand Skinning Engine |
| 2–3 | Window styling — the five pillars, and the appearance schema |
| 4–5 | Typography, layout density, audio cues, icon state machines, context menus |
| 6–7 | Behavioural forking; the `SystemPersonalityPackage` |
| 8–9 | The Zed terminal-native UI engine and the rendering switchboard |
| 10–11 | The settings switchboard |
| 12–13 | The terminal-grid web browser |
| 14–15 | Master specification: topology, dual-socket IPC, binary substrate, security, schema |
| 16–17 | Rust implementation skeletons |
| 18–19 | Final master architecture specification |

## How it was captured

The first attempt used the Chrome automation extension, reading the rendered DOM in chunks because
that tool truncates each read at 1,000 characters. It reached turn 15 before the extension lost its
connection to the automation host and did not reconnect, leaving roughly 45,000 characters — most of
the master compilation, and all of turns 16–19 — unread. Clipboard and CDP fallbacks were both
unavailable: the page rejected programmatic clipboard writes without focus, and the only reachable
debugging port belonged to an unrelated application.

The second attempt used the Kimi WebBridge daemon (`127.0.0.1:10086`) against the same browser
profile, which worked in one pass:

```bash
# 1. Open the conversation in a named session so the tabs stay grouped.
{"action":"navigate","args":{"url":"<conversation url>","newTab":true,
 "group_title":"Omnis vision capture"},"session":"omnis-vision-capture"}

# 2. Extract every turn as JSON, writing curl's output straight to a file.
{"action":"evaluate","args":{"code":"(() => { const els = [...document.querySelectorAll(
 'user-query, model-response')]; return JSON.stringify(els.map((e,i) => ({i,
 role: e.tagName.toLowerCase(), text: e.innerText}))); })()"},"session":"omnis-vision-capture"}
```

**The lesson worth keeping:** route bulk extraction to a file on disk, never through a tool result.
Tool output is truncated (1,000 characters for the Chrome extension's JavaScript results) and
content-inspection guards reject some code-dense payloads outright — both failures are silent and
partial, which is worse than an error. Writing `curl` output to a file and decoding it locally has
neither limit. `document.querySelectorAll('user-query, model-response')` is the selector; each
element's `innerText` is one complete turn.

Gemini's DOM wraps each turn in Czech UI affordances — user turns are prefixed `Váš pokyn ` followed
by a truncated preview line, model turns by `Odpověď Gemini`. The decoder strips these.

## Ground rules

The retired `VISION.md` was non-normative regardless of how complete it was. Anything in it that
binds the implementation was promoted deliberately into `PRD.md` (the single normative product
document) through an approved ADR — never by treating the vision document as a specification.

The earlier `VISION.md` section on internally inconsistent source points was inaccurate: it cited a
`§11` that never existed. Disagreements among sources are recorded in the relevant ADRs and
tracked issues, not re-created here.
