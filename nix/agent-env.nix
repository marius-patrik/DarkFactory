# The agent runtime: one directory that is the whole environment.
#
# Everything the agent can reach is either in this directory or on the PATH this
# directory hands to its children, which is what lets docker/Dockerfile.agent be
# reduced to copying a root filesystem. There is no interpreter version left to
# keep in step with a base image: the Bun that runs `df` is `pkgs.bun` at the
# nixpkgs revision the flake pins, and the JavaScript dependency closure is
# nix/bun-deps.nix resolving the repository's own bun.lock.
{ lib
, stdenvNoCC
, makeWrapper
, bun
, git
, libsecret
, dbus
, gnome-keyring
, bash
, nodeModules
, agentSource
, dfWrapperScript
, entrypointScript
, version
}:

let
  # uid 1001 is the GitHub runner's own user, so the bind-mounted workspace is
  # writable without relaxing its permissions, and PRD.md D4 (agent processes
  # must not run as root) holds by construction rather than by a USER directive
  # added after the installs.
  agentUid = 1001;
  agentGid = 1001;

  # `df` resolves its assets relative to its own source file, so the tree is
  # copied in whole and executed in place. The path is not a free choice: the
  # workspace links bun writes into harness/node_modules/@darkfactory are
  # relative (../../../packages/...), so the harness and the packages it imports
  # have to sit side by side at this depth. /opt/darkfactory is what
  # docker/Dockerfile.agent used, kept so the path in a failing log does not move.
  dfRoot = "/opt/darkfactory";

  # The executables the agent may shell out to, each of them present because
  # something in this repository calls it:
  #
  #   git         harness/src and packages/*/src spawn it throughout; the agent
  #               operates on a git checkout, and `df license` and `df submodules`
  #               act on one.
  #   libsecret   ships `secret-tool`, which packages/keychain/src/os-keychain.ts
  #               calls to store, look up and clear vault keys, and
  #               packages/keychain/src/import/antigravity.ts to look one up.
  #   dbus        ships `dbus-run-session`; secret-tool reaches the Secret Service
  #               over a session bus, and the entrypoint runs under one.
  #   gnome-keyring the Secret Service implementation those calls need. Unlocking
  #               it is the entrypoint owner's business (#1148), not the image's;
  #               the image's job is to make the binary resolvable.
  #   bash        the agent account's login shell, and the interpreter every
  #               wrapped entry point is a /bin/sh script.
  #
  # Not here, and not invented: `jq` and `tmux` are used only by
  # harness/assets/workflows/*.tmpl, which run in the Actions runner's shell rather
  # than in this container; `gh` appears only in a negative test assertion, because
  # df talks to GitHub over HTTPS (harness/src/github/client.ts apiBase) rather
  # than through the CLI; `curl`, `unzip` and `gnupg` were build-time needs of the
  # hand-pinned installers this derivation replaces. Whoever ports
  # agent_runner.py to a subcommand of `df` (#1148) will need `gh` again, and adding
  # it is one line here.
  tools = [
    git
    libsecret
    dbus
    gnome-keyring
    bash
  ];
in
stdenvNoCC.mkDerivation {
  pname = "darkfactory-agent-env";
  inherit version;

  nativeBuildInputs = [ makeWrapper ];

  dontConfigure = true;
  dontBuild = true;
  strictDeps = true;

  installPhase = ''
    runHook preInstall

    install -d "$out$dfRoot" "$out/bin"

    cp -a ${agentSource}/. "$out$dfRoot/"

    # The dependency closure, laid over the tree exactly where bun puts it in a
    # checkout: one node_modules per workspace, seventeen of them. The
    # @darkfactory/* links inside them are relative (../../../protocol), so this
    # placement is what makes them resolve; moving the closure without moving the
    # packages would not. The output is a mirror of the workspace tree holding
    # nothing but node_modules directories, so it merges into what is already here
    # rather than replacing it.
    cp -a ${nodeModules}/. "$out$dfRoot/"

    # Both entry points are wrapped rather than symlinked, so each carries the
    # store paths it needs. A symlink would leave the interpreter to be found on
    # PATH, which is the hand-pinning this derivation exists to remove.
    #
    # The copies in libexec are what get wrapped, not the files in the store:
    # makeWrapper calls assertExecutable on its target and dies on a
    # non-executable one, and a script committed at mode 100644 stays
    # non-executable in the store no matter what its shebang says
    # (pkgs/build-support/setup-hooks/make-wrapper.sh).
    install -d "$out/libexec"
    install -m 0755 ${dfWrapperScript} "$out/libexec/df-wrapper.sh"
    install -m 0755 ${entrypointScript} "$out/libexec/entrypoint.sh"

    makeWrapper "$out/libexec/df-wrapper.sh" "$out/bin/df" \
      --set DF_BUN "${bun}/bin/bun" \
      --set DF_ROOT "$dfRoot" \
      --prefix PATH : "${lib.makeBinPath tools}"

    makeWrapper "$out/libexec/entrypoint.sh" "$out/bin/df-agent-entrypoint" \
      --set DF_ENTRYPOINT "$out/bin/df" \
      --prefix PATH : "$out/bin:${lib.makeBinPath ([ bun ] ++ tools)}"

    # The agent's home. Not cosmetic: `df` falls back to join(homedir(), ".df")
    # when DF_HOME is unset (packages/keychain/src/credentials.ts), so the vault
    # location follows HOME. The git config is here because git refuses to
    # operate on a checkout owned by another uid and the bind-mounted workspace is
    # owned by the runner's user -- the old image stated safe.directory with
    # `git config --global` while still running as root, which wrote a
    # /root/.gitconfig the agent user never read.
    install -d -m 0755 "$out/home/agent/.config"
    printf '[safe]\n\tdirectory = *\n' > "$out/home/agent/.gitconfig"

    # The image layer is owned by the agent's uid so that its home is writable
    # (see nix/agent-image.nix), which would otherwise make the toolchain writable
    # too. Nix store paths are already mode 0555; the copied tree is not, so it is
    # made read-only here. The old image got this for free from being root-owned,
    # and nothing in the runtime writes into the tree: `df` executes its source in
    # place and Bun needs no build output.
    chmod -R a-w "$out$dfRoot" "$out/bin" "$out/libexec"

    runHook postInstall
  '';

  passthru = {
    inherit tools agentUid agentGid dfRoot;
  };
}
