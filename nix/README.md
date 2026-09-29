# The Nix derivation behind the agent image

`docker/Dockerfile.agent` describes the agent image across 23 layers: a Python
base because one ENTRYPOINT line execed `python3`, a `curl | bash` Bun installer,
four apt repositories, and a `pip install`. The toolchain is *described* in four
places that can drift apart. This directory makes it a derivation: one pinned
`nixpkgs` revision, plus the repository's own `bun.lock`, and nothing to remember
to update.

There is no Python interpreter in the result. `nix/checks.nix` asserts that by
walking the closure, because the old image's base existed for exactly one line and
that line is the thing most likely to creep back.

## `docker/Dockerfile.agent` is unchanged, and why

It is not reduced to a bridge to this derivation. Four things reference it, and the
one that matters is a workflow this change does not own:

| Referrer | What it needs |
| --- | --- |
| `.github/workflows/agent.yml:194` | the only build step: `docker build -f "$CONTEXT/docker/Dockerfile.agent"` |
| `paper/index.typ:242` | names it, in Czech, as the image the agent workflow builds (ADR-0028, byte-identical) |
| `tests/test_pipeline_config.py:601` | asserts the workflow still names it |
| `tests/test_workflows.py:68` | asserts the Dockerfile's `COPY` and `pip install` lines |

And the obstacle is not the reference, it is the argument. That workflow runs
`docker run --rm … darkfactory-agent dispatch`, which today reaches
`.github/scripts/agent_runner.py` through the Python entrypoint. `df` has no
top-level `dispatch` subcommand — `packages/harness/src/cli.ts:1597`'s command
switch has no such case. The nearest thing is `graph dispatch`
(`packages/harness/src/cli.ts:1525` → `packages/harness/src/graph/dispatch.ts`),
181 lines that print
a JSON plan naming the `df run --node <id>` commands to execute next; it does not
run the agent, and `agent_runner.py` is 4969 lines.

So an image whose entrypoint is `df` would make that step print a plan and exit 0,
and the agent run would be *skipped* rather than *reported*. That is the worst
failure shape available: a green pipeline that dispatched nothing. Pointing the
entrypoint at `graph dispatch` to paper over it would build the same silent skip
into a shim. So the entrypoint is left alone and the image ships alongside the
Dockerfile rather than in place of it.

This is also the order #1202 asks for in its own Sequencing section: land the
`agent_runner` port (#1148) first, because doing the image first "means carrying
`agent_runner.py` through a Nix derivation, which is wasted work".

When #1148 lands, the swap is three lines: the workflow's build step becomes
`nix build .#agentImage && docker load < result`, and `docker/Dockerfile.agent` and
the two tests above go. Nothing in this directory changes for that — the entry
point and its `Entrypoint`/`User`/`WorkingDir` config are already what the
replacement needs.

## Building the image

**If the machine has Nix** — this is the intended path:

```sh
nix build .#agentImage
docker load < result          # tags darkfactory-agent:nix
docker run --rm darkfactory-agent:nix df --help
```

`nix build .#agentImage` produces one file, a docker-archive tarball, and that is
its entire contract. `result` is it. Nothing else is needed to load it.

**Architecture**: `nix build .#agentImage` builds for the machine it runs on, and
`packages` is defined for both `x86_64-linux` and `aarch64-linux`. The JavaScript
closure is architecture-specific — bun resolves each platform's optional
dependencies at install time (esbuild, biome and the clipboard prebuilds each ship
one binary per platform) — so these are native per-architecture builds, which is
what the runners do. There is no x86_64 assumption anywhere in this directory.

## Running a df without a container

The environment on its own, from the same closure the image is built from:

```sh
nix build .#agentEnv
result/bin/df --help
```

Or a shell carrying just the toolchain, for working on the repository itself:

```sh
nix develop
bun install --frozen-lockfile     # the tree is not pre-installed; see below
```

`nix develop` deliberately does not install `node_modules`. Bun lays workspace
links out as relative symlinks
(`packages/harness/node_modules/@darkfactory/core -> ../../core`), which resolve
only when
`node_modules` sits beside the real `packages/`. Linking a Nix-built `node_modules`
into a checkout would break every one of them, so the shell provides the pinned Bun
and leaves the install to bun — reading the same committed `bun.lock` the
derivation reads.

## Two things that have to be filled in by a machine with Nix

Neither is guessed here. A hash nobody computed is a claim nobody checked, and a
wrong one fails the build in a way that looks like a corrupted store.

**`nix/bun-deps.nix`'s `outputHash`.** It resolves the JavaScript closure with
`bun install --frozen-lockfile`, the only step that needs the network, and Nix
models that as a fixed-output derivation. `outputHash` is `lib.fakeHash` — unset.

```sh
nix build .#nodeModules              # first run succeeds, then reports:
#   hash mismatch; got: sha256-...
```

Paste the reported hash over `outputHash` and commit it. Until then the image is
not reproducible, and the *second* build of `nodeModules` fails rather than
silently succeeding, so it cannot be forgotten.

**`flake.lock`.** The `nixpkgs` input is pinned to an exact revision in
`flake.nix`, so a lockfile is not needed to be correct — but `nix flake lock` and
committing the result is what turns a correct pin into a verified one.

## What is in the image, and why

| Path | What it is |
| --- | --- |
| `/opt/darkfactory` | the runtime source, executed in place — `df` resolves its assets from `import.meta.url`, so there is no compile step |
| `/usr/local/bin/df` | wrapper pinning the Bun from the closure |
| `/usr/local/bin/df-agent-entrypoint` | the entrypoint, `df` under `dbus-run-session` |
| `/bin/sh`, `/bin/bash` | a Nix closure is not a filesystem; the wrappers are `#!/bin/sh` scripts and git execs `/bin/sh` |
| `/nix/store` | the whole toolchain, read-only (store paths are mode 0555) |

`/opt/darkfactory` is not a free choice. The workspace links bun writes into
`packages/harness/node_modules/@darkfactory` are relative (`../../core`), so the
runtime and the packages it imports have to sit side by side under `packages/` at
that depth. The path is the one `docker/Dockerfile.agent` used, kept so it does not
move in a log.

Executables on PATH, each present because something in this repository calls it:

| Tool | Called by |
| --- | --- |
| `bun` | the runtime; `df` is TypeScript run by Bun |
| `git` | `packages/*/src`; the agent works on a checkout |
| `secret-tool` (libsecret) | `packages/keychain/src/os-keychain.ts:79`, `.../import/antigravity.ts:26` |
| `dbus-run-session` (dbus) | the entrypoint; `secret-tool` needs a session bus |
| `gnome-keyring-daemon` | the Secret Service those calls need |
| `bash` | the agent account's shell, and the interpreter the wrappers are |

Not included, and deliberately: `jq` and `tmux` are used only by
`packages/harness/assets/workflows/*.tmpl`, which run in the Actions runner's shell
rather than in this container; `gh` appears only in negative assertions in the
Python suite, because `df` talks to GitHub over HTTPS
(`packages/harness/src/github/client.ts:64` `apiBase`) rather than through the CLI; `curl`,
`unzip` and `gnupg` were build-time needs of the hand-pinned installers this
derivation replaces. **Whoever ports `agent_runner.py` to a `df` subcommand
(#1148) will need `gh` back** — it is one line in `nix/agent-env.nix`.

## Checks

```sh
nix flake check
```

Three, and each fails for something that would otherwise show up only as a failed
agent run:

| Check | What it holds the derivation to |
| --- | --- |
| `df-runs` | `df --help` starts from the derived environment |
| `tools-on-path` | `git`, `secret-tool`, `dbus-run-session`, `gnome-keyring-daemon`, `bash` all resolve on the PATH the entrypoint hands its children |
| `no-python` | no member of the closure provides `bin/python*` or `bin/pypy*` |

There is deliberately **no** check that runs the harness's `tsc --noEmit`. That
command reports 29 errors on `origin/develop`; wiring it up would add a check that
is red before it says anything about this flake, and turning it green would mean
fixing harness type errors, which is not this change's subject.

## Known limitations

- **Nothing here has been built.** This was written on a machine with no `nix`
  (`which nix` → not found). The Nix code is reviewed, not executed: the pins, the
  workspace layout, the closure contents and the manifests-only install are all
  verified, but no derivation has been evaluated or built. The first person to run
  `nix flake check` should expect to fix things, and `flake.lock` and the
  `nodeModules` hash are both still open by design.
- **The image is large.** `agentRootfs` copies every requisites store path whole,
  which includes the copy of the source tree `cleanSourceWith` already made and the
  manifests copy the FOD hashed. Deduplicating them means carrying a manifest of
  what to drop, which is a second description of the closure to keep in step; it is
  left as a known cost.
- **`uid`/`gid` chown the whole layer**, store included, because that is how
  `dockerTools.buildImage` makes `/home/agent` writable for uid 1001. The store
  stays mode 0555, so it is still not writable by the agent.
- **A dirty checkout is not reproducible.** `repoRoot` is `./.`, so building from
  a working tree picks up untracked files that the filter keeps. From a git flake
  (`nix build .#…` inside the repo, which is how CI would do it) the source is the
  exported tree and this does not arise.
- **The image excludes `.github/`**, so `df ci install` run with the working
  directory inside `/opt/darkfactory` would find no workflows to drift-check. The
  workflow sets the container's working directory to the bind-mounted
  `/workspace`, so the paths resolve against the operated repository. The templates
  themselves are in `packages/harness/assets/workflows/*.tmpl`, which the image does
  carry.

## File map

| File | Responsibility |
| --- | --- |
| `flake.nix` | the pin, and one definition of the environment shared by `packages` and `checks` |
| `nix/sources.nix` | which files the image carries, and which files decide the dependency closure |
| `nix/bun-deps.nix` | the fixed-output derivation that resolves `bun.lock` |
| `nix/agent-env.nix` | the runtime: source tree, dependency closure, wrapped entry points |
| `nix/agent-image.nix` | the root filesystem, and the docker archive of it |
| `nix/df-wrapper.sh` | `df`, with the closure's Bun rather than whatever is on PATH |
| `nix/entrypoint.sh` | the agent entrypoint |
| `nix/checks.nix` | df starts, every tool resolves, no interpreter in the closure |
