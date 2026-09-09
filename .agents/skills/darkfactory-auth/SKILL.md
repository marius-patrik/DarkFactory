---
name: darkfactory-auth
description: Set DarkFactory harness credentials on GitHub repositories from this machine. Use when a repository's agent is unauthenticated, a token has been rotated, or a newly installed repository needs its secrets. Reads credentials from the environment and the macOS keychain and pipes them into `gh secret set` without printing them.
---

# Setting DarkFactory credentials

Sets the secrets the agent needs on one or more repositories, reading each credential from wherever
it already lives on this machine.

## Run it

```bash
python3 .github/scripts/credentials.py marius-patrik/DarkFactory marius-patrik/omnis
```

Limit to particular secrets:

```bash
python3 .github/scripts/credentials.py marius-patrik/DarkFactory --only CLAUDE_CODE_OAUTH_TOKEN
```

## What it collects

| Secret | Read from | Note |
| :--- | :--- | :--- |
| `CLAUDE_CODE_OAUTH_TOKEN` | `$CLAUDE_CODE_OAUTH_TOKEN` | Mint with `claude setup-token` |
| `ANTHROPIC_API_KEY` | `$ANTHROPIC_API_KEY` | Bills per token rather than a subscription |
| `ANTIGRAVITY_REFRESH_TOKEN` | keychain `antigravity-cli`, or the environment | |
| `OPENAI_API_KEY` | `$OPENAI_API_KEY` | |
| `GH_PROJECT_TOKEN` | `$GH_PROJECT_TOKEN` | Needs `project` scope |

A credential that is not present is reported with what to do about it, and the rest are still set.

## Two things worth knowing

**Claude's keychain entry is deliberately not read.** It holds a short-lived access token that the
CLI refreshes every few hours. Copied into a secret it works for minutes and then fails in a way
that looks like a broken harness rather than an expired credential. `claude setup-token` mints the
long-lived one; export it and run this.

**Nothing is printed.** Values are piped into `gh secret set` rather than passed as arguments, so a
credential cannot appear in a process listing, a shell history or a log. Only the names of the
secrets that were set are reported.

## After running

The agent also needs switching on, once per repository:

```bash
gh variable set AGENT_ENABLED --body true --repo <owner>/<name>
```
