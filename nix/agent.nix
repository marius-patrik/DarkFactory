{ pkgs }:
let
  inherit (pkgs) lib;
  nodeModules = pkgs.stdenvNoCC.mkDerivation {
    pname = "darkfactory-agent-node-modules";
    version = "1";
    dontUnpack = true;
    strictDeps = true;
    nativeBuildInputs = [ pkgs.bun pkgs.coreutils ];
    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
    outputHash = lib.fakeHash;

    installPhase = ''
      runHook preInstall
      mkdir -p "$TMPDIR/work" "$TMPDIR/home" "$TMPDIR/cache"
      cd "$TMPDIR/work"
      cp ${../package.json} package.json
      cp ${../bun.lock} bun.lock
      export HOME="$TMPDIR/home"
      export BUN_INSTALL_CACHE_DIR="$TMPDIR/cache"
      bun install --frozen-lockfile --production
      mkdir -p "$out"
      cp -a node_modules "$out/node_modules"
      runHook postInstall
    '';
  };

  source = lib.cleanSourceWith {
    src = ../.;
    name = "darkfactory-agent-source";
    filter = path: type:
      let
        rel = lib.removePrefix "${toString ../.}/" (toString path);
        name = baseNameOf path;
      in
        !(builtins.elem name [ ".git" "node_modules" ".worktrees" "dist" "result" ])
        && !(lib.hasPrefix ".github/" rel || rel == ".github")
        && !(lib.hasPrefix "nix/" rel || rel == "nix")
        && !(lib.hasPrefix "docker/" rel || rel == "docker")
        && !(lib.hasSuffix ".pdf" name);
  };

  agentRuntime = pkgs.runCommand "darkfactory-agent-runtime" { } ''
    mkdir -p "$out/share/darkfactory"
    cp -a ${source}/. "$out/share/darkfactory/"
    chmod u+w "$out/share/darkfactory"
    ln -s ${nodeModules}/node_modules "$out/share/darkfactory/node_modules"
    chmod -R a-w "$out/share/darkfactory"
  '';

  df = pkgs.writeShellScriptBin "df" ''
    set -eu
    exec ${pkgs.bun}/bin/bun ${agentRuntime}/share/darkfactory/packages/cli/src/cli.ts "$@"
  '';

  entrypoint = pkgs.writeShellScriptBin "df-agent-entrypoint" ''
    set -eu
    : "''${HOME:=/home/agent}"
    export HOME
    exec ${pkgs.dbus}/bin/dbus-run-session -- ${df}/bin/df "$@"
  '';

  tools = with pkgs; [
    bun bash coreutils git gh openssh curl jq gnugrep gnused gawk findutils
    dbus libsecret gnome-keyring cacert tmux
  ];
  path = lib.makeBinPath tools;

  agentImage = pkgs.dockerTools.buildLayeredImage {
    name = "darkfactory-agent";
    tag = "nix";
    contents = tools ++ [ df entrypoint agentRuntime ];
    extraCommands = ''
      mkdir -p bin etc/ssl/certs home/agent/.config workspace
      ln -s ${pkgs.bash}/bin/sh bin/sh
      ln -s ${pkgs.bash}/bin/bash bin/bash
      ln -s ${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt etc/ssl/certs/ca-bundle.crt
      printf '%s\n' \
        'root:x:0:0:root:/root:/bin/bash' \
        'agent:x:1001:1001:DarkFactory agent:/home/agent:/bin/bash' \
        > etc/passwd
      printf '%s\n' 'root:x:0:' 'agent:x:1001:' > etc/group
      printf '%s\n' 'passwd: files' 'group: files' 'hosts: files dns' > etc/nsswitch.conf
      printf '[safe]\n\tdirectory = *\n' > home/agent/.gitconfig
    '';
    fakeRootCommands = ''
      chown -R 1001:1001 home/agent workspace
    '';
    enableFakechroot = true;
    config = {
      User = "1001:1001";
      WorkingDir = "/workspace";
      Entrypoint = [ "${entrypoint}/bin/df-agent-entrypoint" ];
      Env = [
        "HOME=/home/agent"
        "PATH=${path}:/bin"
        "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
        "DF_SOURCE=${agentRuntime}/share/darkfactory/packages/cli/src/cli.ts"
      ];
    };
  };
in { inherit agentImage nodeModules agentRuntime df; }
