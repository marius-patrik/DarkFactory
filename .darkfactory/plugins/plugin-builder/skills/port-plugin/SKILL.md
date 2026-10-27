---
name: port-plugin
description: Use when creating a new plugin, adding a skill, hook or script to one, or making a plugin load in Claude Code, Codex, opencode and pi at once.
license: MIT
---

# Build and port a plugin

Plugins live in `.darkfactory/plugins/<name>/`. Content and scripts stay here; nothing in a plugin is
wired into the `packages/` build, and no plugin text is duplicated into the workspace. The
directory itself is the single declaration of the skill (the `commits-and-repository-taxonomy` skill) - `.agents/skills/` is
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
  hooks/
    hooks.json                # Claude Code + Codex
    guard.sh                  # the rule itself, self-locating
    ports/opencode.ts         # opencode cannot read JSON hooks
    ports/pi.ts               # pi cannot read JSON hooks
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
for skill in .darkfactory/plugins/<name>/skills/*/; do
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
Of the failure modes worth guarding against, most are not detectable from a command line - editing
by line in a hard-wrapped file, or losing a quote. Only build a hook for what the matcher can
actually see, and only when the rule is worth a permanent tax.

A rule that has to reach opencode and pi exists in **three** files, and they will drift unless you
test them against the same cases. Do that. A loose pattern is the likely failure: matching the text
`git add .` also matches `git add .darkfactory/...`, which is the one command the rule must never
stop, so the separator after the flag is load-bearing.

Because a hook that matters must be verifiable another way, never let a hook be the only guard.

## Scripts

- **Self-locating**: `here="$(cd "$(dirname "$0")" && pwd)"`. Do not rely on `${CLAUDE_PLUGIN_ROOT}`,
  which only the Claude-shaped hosts substitute.
- **Real exit codes**: 0 pass, 1 findings, 2 bad invocation. Never let a pipe stand between the
  command and the status you report.
- **No dependencies outside the repository** beyond `bun`, and no imports from `packages/`.

## Checking

```sh
df plugin list
df plugin describe <name>
df plugin validate --strict
```

`df plugin validate` is shared with the repository test, so it is the contract rather than a
convenience. If a rule matters enough to state in a skill, it belongs in the validator too - prose
that nothing checks is a comment.

The plugin needs both host manifests. `.claude-plugin/plugin.json` is what Claude Code reads and
`.codex-plugin/plugin.json` is what Codex reads; `validate` warns when one is missing, because a
plugin without it is simply not loadable by that host.
