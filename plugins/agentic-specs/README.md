# Agentic Specs — portable Codex plugin

Two independent skills:

- **agentic-plan** produces executable engineering plans with one Dependencies table, one TODO checklist, explicit decisions and verified outcomes.
- **product-prd** produces lean product requirements with evidence, user journeys, priorities and observable acceptance; no duplicate engineering TODOs.

This plugin is instruction-only. It requires no MCP server, credentials or code installation and does not change DarkFactory execution governance or Wrkbench application code.

## Locations

- Repository-local skills: `.agents/skills/agentic-plan` and `.agents/skills/product-prd`.
- In DarkFactory, `.agents` is a tracked symlink to `.darkfactory`; the files are committed at `.darkfactory/skills`.
- Plugin manifest: `plugins/agentic-specs/plugin.json`.
- Repo plugin marketplace: `.agents/plugins/marketplace.json` (stored as `.darkfactory/plugins/marketplace.json`).

## Use

Invoke `$agentic-plan` for an engineering plan and `$product-prd` for a PRD in supported Codex hosts. The plugin can also be discovered through the repository marketplace.

## Maintenance

The plugin copies of both skills and templates must match the repository-local copies. Run `python3 plugins/agentic-specs/scripts/verify.py` at repository root before release.
