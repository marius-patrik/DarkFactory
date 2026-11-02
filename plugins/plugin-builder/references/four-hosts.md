# The four hosts

Everything here is verified against each host's own documentation or source. Where the hosts
disagree, the disagreement is stated rather than smoothed over, and the rule is the strictest of
the four — a skill that satisfies all four costs nothing.

## Skills: the one shared artefact

`skills/<name>/SKILL.md` is the only format all four load. There is no single *directory* all four
scan, but `.agents/skills/` is read natively by three of the four and symlinked for the fourth.

| Host | Native skills dir | Reads `.agents/skills/` |
| :--- | :--- | :--- |
| Claude Code | `.claude/skills/` | no - the holdout, needs a symlink |
| Codex | `.agents/skills/`, `.codex/skills/` | yes |
| opencode | `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` | yes |
| pi | `.pi/skills/`, `.agents/skills/`, `~/.agents/skills/` | yes |

Claude Code does not follow symlinks *inside* a skill directory, only a `<skill-name>` entry in
`.claude/skills/` may itself be a symlink. So link one directory per skill, not the tree.

### Rules that satisfy all four

- `name` is lowercase kebab-case, at most 64 characters, matching `^[a-z0-9]+(-[a-z0-9]+)*$`,
  and **identical to the containing directory name**. opencode documents the match, Claude Code
  defaults the name to the directory, pi permits divergence. Divergence makes `/skill:<name>`
  disagree with the host's own listing.
- `description` is present and non-empty. This is not advisory: **Codex and pi refuse to load a
  skill without one.** Start it with "Use when" so the host has something to match a request
  against, and keep it under 500 characters.
- `license`, `compatibility` and `metadata` are accepted by all four. Nothing else is safe.
- **Never put a Claude-only key in a shared skill.** Codex, opencode and pi ignore unknown keys,
  but `claude.ai` upload and `package_skill.py` hard-error on them. The banned set is `context`,
  `paths`, `model`, `effort`, `arguments`, `argument-hint`, `hooks`, `shell`, `agent`,
  `background`, `disable-model-invocation`, `user-invocable`, `disallowed-tools`, `when_to_use`.

### Listing budgets differ

Codex caps the initial skills list at 2% of the context window or 8,000 characters and shortens
descriptions first. Claude Code truncates `description` plus `when_to_use` at 1,536 characters.
opencode and pi put the full description in context. Front-load the keywords: the tail is what
gets cut.

## Hooks: no common format

`hooks/hooks.json` in Claude Code's shape serves **Claude Code and Codex**. The schema is
`{"hooks":{"<Event>":[{"matcher":"...","hooks":[{"type":"command","command":"..."}]}]}}`, and the
event names overlap heavily: `SessionStart`, `PreToolUse`, `PostToolUse`, `PermissionRequest`,
`SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `Stop`,
`SessionEnd`.

**opencode and pi cannot read it.** opencode hooks are a TypeScript plugin returning an object;
pi hooks are TypeScript subscriptions. Neither is expressible in JSON, so each needs its own port:

```ts
// .opencode/plugins/<name>.ts
export const Guard = async () => ({
	"tool.execute.before": async (input, output) => {
		if (input.tool === "bash" && /dangerous/.test(String(output.args.command))) {
			throw new Error("blocked");
		}
	},
});
```

```ts
// .pi/extensions/<name>.ts
export default (pi: any) => {
	pi.on("tool_call", async (event: any) =>
		event.toolName === "bash" && /dangerous/.test(String(event.input?.command))
			? { block: true, reason: "blocked" }
			: undefined,
	);
};
```

Two gates will silently disable a hook that looks installed:

- **Codex requires interactive hook trust.** Non-managed hooks are skipped until reviewed in
  `/hooks` (hash-pinned). `CLAUDE_PLUGIN_ROOT` is set for compatibility, alongside `PLUGIN_ROOT`.
- **pi gates all project resources behind `project_trust`.**

**Write scripts to be self-locating.** `$(dirname "$0")/..` works in every host; relying on
`${CLAUDE_PLUGIN_ROOT}` means the script only functions on the one host that substitutes it.

## MCP: no common format either

Claude Code reads a plugin's `.mcp.json` and errors on a remote entry with no `type`. Codex's
portable `mcp.json` requires a `type` per server. opencode has MCP but **a plugin cannot bundle a
server definition** - it only goes in `opencode.json`. pi has no MCP client at all; it arrives via
the third-party `pi-mcp-adapter` extension, which reads standard `.mcp.json`.

Ship a Claude-shaped `.mcp.json` and a Codex `mcp.json` that differs only by the added `type`.
If a plugin needs no MCP, ship neither — that is the common case and it removes the whole problem.

## Instructions files

`AGENTS.md` is canonical: Codex, opencode and pi all read it, walking upward from the working
directory. **Claude Code reads `AGENTS.md` only when no `CLAUDE.md` exists** in the working
directory or above, and `CLAUDE.md` wins when both do. So a repository carrying both gets its
`AGENTS.md` silently ignored by one host. Prefer a plugin that ships `AGENTS.md` and no
`CLAUDE.md`.

## What to do

Ship content, not code, wherever the four agree, and only write TypeScript ports for opencode and
pi when a hook genuinely earns them. The intersection is narrow on purpose: a skill that needs
three bespoke ports is usually a script wearing a skill's clothes.
