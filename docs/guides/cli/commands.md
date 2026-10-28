# CLI and TUI

The [generated CLI reference](../../../packages/cli/src/cli.ts) is extracted directly from the current `usage()` function in `packages/cli/src/cli.ts`; it must match source and update automatically.

## Command families

`df --version`, `install`, `update`, `chat`, `run`, `route`, `limits`, `quota`, `resume`, `providers`, `models`, `accounts`, `account`, `login/logout`, `ask`, `doctor`, `plugin`, `ci`, `graph`, `secrets`, and `workspace` are declared by current CLI help. Execute `df --help` for the exact installed build; nested commands can have their own help.

## JSON and exits

`--json` is advertised for specific commands, not guaranteed globally. Machine callers must treat nonzero exit as failure and validate the returned JSON schema. Exit-code-by-condition and streaming-output compatibility remain subject to #2702 acceptance; do not invent a stable numerical error taxonomy.

## TUI interaction

Interactive chat entry is advertised by `df` / `df chat`. Keyboard navigation, interruption, screen reader behavior, reconnection and complete run-state inspection are candidate requirements under #2702 until verified on native binaries.

## Troubleshooting

If command help and these docs differ, trust the exact binary's `--help`, report the source-to-docs discrepancy, and block release until reconciled. Never expose provider keys in terminal recordings.
