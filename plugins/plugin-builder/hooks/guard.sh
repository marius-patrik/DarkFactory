#!/bin/sh
# PreToolUse guard. Denies a small set of command shapes that caused real, expensive failures.
#
# Deliberately narrow: this runs on every shell action in the session, including the ones it has no
# opinion about. A guard with a broad matcher is a tax paid for a rule nobody agreed to.
#
# Exits 0 to allow, 2 to deny (the convention both Claude Code and Codex share).
set -u

payload=$(cat)

# Extract the command text without assuming a tool name; hosts differ in what they pass.
command_text=$(printf '%s' "$payload" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')

# Blind staging. `git add -A` and `git add .` swept in a concurrent session's work once, and
# `git add -A` also picks up whatever the build just wrote.
#
# The separator after the flag matters: matching the bare text "git add ." also matches
# "git add .darkfactory/...", which is an explicit path and the one command this must never stop.
if printf '%s' "$command_text" | grep -Eq 'git[[:space:]]+add[[:space:]]+(-A|--all|-a)([[:space:]]|;|&|\||\)|$)|git[[:space:]]+add[[:space:]]+\.([[:space:]]|;|&|\||\)|$|")'; then
	printf '%s' "Refusing a blind git add. It swept a parallel session's work into a commit here.

Stage explicit paths, so a commit contains only what you meant:

    git add path/to/file.ts

If you genuinely need everything, run it yourself with a reason, or stage the
directory you changed." >&2
	exit 2
fi

exit 0
