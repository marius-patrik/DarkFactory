---
name: port-plugin
description: Use when creating a new plugin, adding a skill, hook or script to one, or making a plugin load in Claude Code, Codex, opencode and pi at once.
license: MIT
---

# Build and port a plugin

Plugins live in `.agents/plugins/<name>/`. Content and scripts stay here; nothing in a plugin is
wired into the `packages/` build, and no plugin text is duplicated into the workspace. The
directory itself is the single declaration of the skill (DF-RULE-015) - `.agents/skills/` is
untracked install output written by `df ci install`, so a tracked copy there is a second
declaration and a test fails on it.

## Layout

```
<name>/
  plugin.json                 # portable manifest
  .claude-plugin/plugin.json  # Claude Code
  .codex-plugin/plugin.json   # Codex
  AGENTS.md                   # instructions, canonical
  skills/<skill>/SKILL.md     # the one shared artefact
  references/                 # long material, linked not inlined
  scripts/                    # self-locating, runnable, meaningful exit codes
  hooks/hooks.json            # Claude Code + Codex
```

All three manifests carry the same `name`, equal to the directory. Omit `mcp.json` and
`.mcp.json` unless the plugin genuinely needs MCP: there is no shared MCP shape, and shipping
none removes four ways to be wrong. Ship no `CLAUDE.md`; Claude Code prefers it over `AGENTS.md`
and would then ignore the latter.

## Making it load everywhere

`.agents/skills/` is read natively by Codex, opencode and pi. Claude Code is the holdout and needs
one symlink per skill, because it follows a `<skill-name>` entry but not anything deeper:

```sh
mkdir -p .claude/skills
for skill in .agents/plugins/<name>/skills/*/; do
	ln -sfn "../../$skill" ".claude/skills/$(basename "$skill")"
done
```

opencode needs no configuration - it reads `.agents/skills/` and `.claude/skills/` automatically.
pi picks up `.agents/skills/` natively and needs a `settings.json` entry only for extensions.

## Hooks

Write `hooks/hooks.json` once for Claude Code and Codex; those two share the schema. opencode and
pi cannot read JSON hooks and each need a TypeScript port - see `references/four-hosts.md` for
both shapes.

Two things make a hook look installed and do nothing:

- Codex skips every non-managed hook until it is trusted in `/hooks`.
- pi gates all project resources behind project trust.

So a hook that matters must be verifiable another way, and must not be the only guard.

Keep hooks few and cheap. A `PreToolUse` guard that runs on every tool call is a tax on every
action in the session, including the ones it has no opinion about. Match narrowly and exit fast.

## Scripts

- **Self-locating**: `here="$(cd "$(dirname "$0")" && pwd)"`. Do not rely on `${CLAUDE_PLUGIN_ROOT}`,
  which only the Claude-shaped hosts substitute.
- **Real exit codes**: 0 pass, 1 findings, 2 bad invocation. Never let a pipe stand between the
  command and the status you report.
- **No dependencies outside the repository** beyond `bun`, and no imports from `packages/`.

## Checking

```sh
bun .agents/plugins/plugin-builder/scripts/validate-skills.ts
bun .agents/plugins/plugin-builder/scripts/validate-skills.ts --strict
```

The validator is shared with the repository test, so it is the contract, not a convenience. If a
rule matters enough to state in a skill, it belongs in the validator too - prose that nothing
checks is a comment.
