#!/usr/bin/env python3
"""Validate portable plugin layout and byte-identical skill copies."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[3]
manifest = json.loads((root / "plugins/agentic-specs/plugin.json").read_text())
market = json.loads((root / ".agents/plugins/marketplace.json").read_text())
assert manifest["$schema"] == "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
assert manifest["name"] == "agentic-specs"
assert any(x["name"] == "agentic-specs" for x in market["plugins"])
for name, template in (("agentic-plan", "PLAN_TEMPLATE.md"), ("product-prd", "PRD_TEMPLATE.md")):
    for suffix in ("SKILL.md", "references/" + template):
        left = root / ".agents/skills" / name / suffix
        right = root / "plugins/agentic-specs/skills" / name / suffix
        assert left.is_file() and right.is_file(), f"missing skill component: {suffix}"
        assert left.read_bytes() == right.read_bytes(), f"skill drift: {name}/{suffix}"
    contents = (root / ".agents/skills" / name / "SKILL.md").read_text()
    assert contents.startswith("---\n")
    assert re.search(r"^name: " + re.escape(name) + r"$", contents, re.M)
    assert re.search(r"^description: .+", contents, re.M)
print("PASS: agentic-specs plugin, marketplace and skill copies")
