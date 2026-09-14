import os


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read(name):
    with open(os.path.join(ROOT, "theme", "assets", name), encoding="utf-8") as handle:
        return handle.read()


def test_switcher_uses_hsl_tokens_and_native_color_schemes():
    css = _read("theme.css")
    switcher = css[css.index(".switcher {"):]
    for token in ("border", "muted-foreground", "foreground", "background", "ring"):
        assert f"var(--{token}" not in switcher.replace(f"hsl(var(--{token}))", "")
    assert "color-scheme: light;" in switcher
    assert ' [data-theme="dark"]' not in switcher  # selector has no leading space
    assert '[data-theme="dark"] .switcher__select' in switcher
    assert "color-scheme: dark;" in switcher
    assert ".switcher__select:focus-visible" in switcher


def test_project_matching_accepts_url_entries_and_normalizes_previews():
    js = _read("theme.js")
    assert "if (isProject && entry.url)" in js
    assert "locationUrl.indexOf(projectUrl + \"/\") === 0" in js
    assert ".replace(/\\/pr-\\d+(?=\\/|$)/i, \"\")" in js
    assert "projectUrl.length > bestMatch.length" in js
