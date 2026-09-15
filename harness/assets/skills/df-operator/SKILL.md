---
name: df-operator
description: operating df runs day to day - checking capacity, routing, limits and run health.
---

# DarkFactory operator guide

`df` is the command-line tool for running DarkFactory pipelines. This guide covers the commands an operator uses every day: checking capacity, routing tasks, inspecting limits, and reading run health. Every command below is a real `df` subcommand taken from `df --help`.

## Capacity and availability

`df quota --json` is the single source of truth for every provider, account, and model: state, limits, usage, and the source of each number. Availability comes from the quota engine, never from probing providers by hand.

```sh
df quota --json
```

`df limits` shows current rate limits; `df limits clear` removes them. Clear a selector using the same `<provider|provider:account|provider/model@account|*>` syntax the ledger understands.

```sh
df limits --json
df limits clear <provider>
df limits clear <provider:account>
df limits clear <provider/model@account>
df limits clear *
```

`df models` prints the live catalog for each provider. Refresh with `--refresh` when you have changed credentials or want a fresh view.

```sh
df models --provider <provider>
df models --provider <provider> --refresh
```

## Routing

`df route` tells you which chain a task would take before you commit to running it. It accepts `--kind`, `--size`, and `--need` flags that feed into the router input. The allowed values come from `routerInput` in `harness/src/cli.ts`:

- `--kind` must be one of: `plan`, `implement`, `review`, `fix`, `summarize`, `classify`, `chat`, `image`, `video`
- `--size` must be one of: `small`, `medium`, `large`
- `--need` must be one of: `tools`, `reasoning`, `vision`, `long_context`, `image_gen`, `video_gen`

```sh
df route --kind implement --size medium --need tools --json <prompt>
```

`df run` and `df ask` execute the task. Use `--chain` to pin a specific chain, or `--model` to pin a specific model. Both accept `--size`, `--need`, `--kind`, and `--reasoning hard`.

```sh
df run --chain <provider/model@account,...> --size medium <prompt>
df run --model <provider/model@account> --json <prompt>
df ask --chain <provider/model@account,...> <prompt>
```

## Graph

`df graph validate` checks that a workflow graph file is well-formed and prints a summary of nodes and edges. `df graph plan` produces a planned run from an event and a state file.

`df graph validate [path]` (default `.darkfactory/manifest.json`) prints:
```
<path>: valid workflow graph v<version> (<nodes> nodes, <edges> edges)
```

`df graph plan --event <file> --state <file> [--graph <path>]` reads the graph, event, and state files, then prints the planned run as JSON:
```sh
df graph validate
df graph plan --event <file> --state <file>
```

## CI and health

`df ci` manages pipeline status, and `df doctor` checks identities and configuration.

```sh
df ci status
df ci runs
df ci logs <run-id>
df ci rerun <run-id>
df doctor
df doctor identities
```

## Project boards

Project boards are moved only by the pipeline. Never edit a board by hand; the system enforces board transitions as part of the run lifecycle.

## Evidence rule

Every capacity or progress claim must cite its source: the command that produced the number and the output it printed. Quote the command and its output together; do not state a limit, usage, or run status from memory.
