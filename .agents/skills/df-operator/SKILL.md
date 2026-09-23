---
name: df-operator
description: Operate DarkFactory runs using the canonical df CLI/TUI, provider/quota state, checks, and audit evidence.
---

# DarkFactory operator guide

`df` is the supported operator surface. Bare interactive `df` enters the TUI on a TTY; headless subcommands remain scriptable. The command registry is canonical, so use `df help` and subcommand help rather than copying hard-coded command/enum lists into documentation.

## Health and capacity

```sh
df status
df doctor
df quota --json
df models --provider <provider> --refresh
```

Quota/provider/account/model state comes from the canonical quota/catalog/keychain contracts. Unknown data stays unknown; do not probe a provider merely to manufacture availability.

## Routing and execution

Use `df route` to inspect routing and `df run` / governed Request execution to perform work. Explicit model/chain choices remain subject to hard capability, sensitivity and capacity constraints.

The runtime uses the packaged declarable graph and one persisted run/effect model. Graph validation and inspection use the current `df graph` commands and packaged graph assets; do not reference source-tree harness paths.

## Checks and runs

Use the current `df ci` / status surfaces to inspect required checks and run evidence. A green aggregate is meaningful only when the canonical quality contract has no unresolved gaps and every required action is proven for the exact head.

## GitHub/project state

GitHub events are triggers. Current GitHub/runtime evidence is authoritative for Request, PR and project reconciliation, so delayed events must not be treated as a newer state snapshot.

## Evidence rule

Operational claims cite observed current state: exact head/SHA where relevant, the command or GitHub run that produced the evidence, and the relevant result. Do not report quota, delivery or merge status from memory.
