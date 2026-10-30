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

## Reproducible source-checkout commands

The following exact commands are declared by `packages/cli/src/cli.ts`. In a developer checkout with Bun and installed dependencies, invoke the real dispatch path:

```sh
bun packages/cli/src/cli.ts --help
bun packages/cli/src/cli.ts --version
bun packages/cli/src/cli.ts graph validate
bun packages/cli/src/cli.ts providers
```

The first should print `Usage:` followed by command families. The version command prints `df <release>` or `df development/unmanaged` if no installed release identity is available; **not** necessarily `1.0.0`. The graph validator reads the bundled graph by default, validates it and reports graph version, node count and edge count. Provider listing reports a tabular header, but network availability and usable provider credentials are separate acceptance conditions. This page does not assert these commands were executed on this SHA.

To validate an alternate graph without mutating remote state use `bun packages/cli/src/cli.ts graph validate /path/to/graph.json` with an existing validated graph document. `graph plan` requires both `--event` and `--state` paths containing valid JSON matching source-owned graph event and run-state contracts; it reports a JSON plan, **not** GitHub authorization or execution. The source also dispatches `graph dispatch`, but it is not advertised by the printed `usage()` and should not be promoted as a stable user command without #2702/#2698 review.

## Source-level exit and error behavior

The `main()` error handler sets `process.exitCode` through `exitCodeFor()`. The source declares error code `1` for generic failures and delegates chain exhaustion and timeout codes to their respective error classes. When `--json` is present, caught top-level failures emit `{type:"error",message,exitCode}` and optionally quota chain or timeout details; they **also** print redacted error text to stderr. Not all commands support `--json`, and successful output shapes are command-specific. CI must check both process exit status and expected data: a JSON-looking response alone is not success.

## Command ownership and failure triage

| Task | Source-declared command | First failure check |
| --- | --- | --- |
| Read source help | `df --help` | Correct binary and release identity |
| Inspect graph schema | `df graph validate [path]` | Existing JSON and schema/version |
| Offline planning | `df graph plan --event <file> --state <file>` | Input files exist and satisfy event/state contracts |
| Check model access | `df models --provider <provider>` | Account credentials and live/cache source |
| Inspect quotas | `df quota --json` | Ledger source, provider/account and JSON exit |
| Resume quota-blocked work | `df resume --repo owner/name` | Run is actually blocked on quota; no effect replay |
| Validate capability | `df plugin validate` | Installed validated plugin declaration, ownership #2701 |
| Diagnose identities | `df doctor identities` | Permissions/config, not just an available token |

Every listed command remains subject to actual installed-binary behavioral acceptance under #2702. Do not use interactive `df` in unattended scripts; it enters chat rather than deterministic noninteractive execution.
