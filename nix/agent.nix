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
    outputHash =
      if pkgs.stdenv.hostPlatform.system == "x86_64-linux"
      then "sha256-DKGa0FolMPTdJi8EriHakRiP+DtPO9m6yh5kazS+Ho0="
      else if pkgs.stdenv.hostPlatform.system == "aarch64-linux"
      then "sha256-aaouyVlhUyWNsuGNl6vfUfBwULriQZcQk/hRCrlH/hU="
      else throw "Unsupported DarkFactory agent platform";

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

  # Native Bun release binaries carry an appended payload; modifying their ELF
  # layout with patchelf corrupts that payload (ARM64 segfaults after patching).
  # Keep their bytes pristine. Provide the expected Linux loader in the image.
  dynamicLoader = pkgs.stdenv.cc.bintools.dynamicLinker;
  systemLoader = if pkgs.stdenv.hostPlatform.system == "x86_64-linux"
    then "lib64/ld-linux-x86-64.so.2"
    else "lib/ld-linux-aarch64.so.1";
  sharedLibraries = lib.makeLibraryPath [ pkgs.glibc pkgs.stdenv.cc.cc.lib pkgs.zlib pkgs.openssl ];

  # Reuse the native release compiler and asset packager. The final image
  # contains the compiled executable plus its bundled assets, not TS sources.
  target = if pkgs.stdenv.hostPlatform.system == "x86_64-linux" then "linux-x64"
    else if pkgs.stdenv.hostPlatform.system == "aarch64-linux" then "linux-arm64"
    else throw "Unsupported DarkFactory agent platform";

  agentRuntime = pkgs.runCommand "darkfactory-agent-runtime" {
    nativeBuildInputs = [ pkgs.bun pkgs.coreutils pkgs.patchelf ];
  } ''
    set -euo pipefail
    export HOME="$TMPDIR/home"
    export BUN_INSTALL_CACHE_DIR="$TMPDIR/cache"
    mkdir -p "$HOME" "$BUN_INSTALL_CACHE_DIR" "$TMPDIR/build"
    cp -a ${source}/. "$TMPDIR/build/"
    chmod -R u+w "$TMPDIR/build"
    ln -s ${nodeModules}/node_modules "$TMPDIR/build/node_modules"
    cd "$TMPDIR/build"

    # One compiler for release assets and container images; includes worker,
    # WASM, graph assets and independently bundled official capabilities.
    bun packages/harness/scripts/build.ts --target ${target}
    dist="packages/harness/dist"
    test -x "$dist/df-${target}"
    test -d "$dist/assets"
    test -d "$dist/plugins"
    test -f "$dist/photon_rs_bg.wasm"

    mkdir -p "$out/bin"
    cp -a "$dist"/. "$out/bin/"
    mv "$out/bin/df-${target}" "$out/bin/df"
    # Verify the expected system interpreter without rewriting the ELF.
    test "$(patchelf --print-interpreter "$out/bin/df")" = "/${systemLoader}"
    # Nix build sandboxes lack /lib64. Invoke the unmodified packaged binary
    # through the Nix loader for the build smoke; Docker uses /lib{,64} below.
    "${dynamicLoader}" --library-path "${sharedLibraries}" "$out/bin/df" __packaging-smoke
    "${dynamicLoader}" --library-path "${sharedLibraries}" "$out/bin/df" --version
  '';

  df = agentRuntime;

  # Container images have no system-level D-Bus configuration. The session bus
  # must use an explicit reproducible policy rather than an absent /etc default.
  sessionBusConfig = pkgs.writeText "darkfactory-dbus-session.conf" ''
    <busconfig>
      <type>session</type>
      <listen>unix:tmpdir=/tmp</listen>
      <standard_session_servicedirs/>
      <policy context="default">
        <allow send_destination="*"/>
        <allow own="*"/>
      </policy>
    </busconfig>
  '';

  entrypoint = pkgs.writeShellScriptBin "df-agent-entrypoint" ''
    set -eu
    : "''${HOME:=/home/agent}"
    export HOME
    exec ${pkgs.dbus}/bin/dbus-run-session --config-file=${sessionBusConfig} -- ${df}/bin/df "$@"
  '';

  tools = with pkgs; [
    bun bash coreutils git gh openssh curl jq gnugrep gnused gawk findutils
    dbus libsecret gnome-keyring cacert tmux
  ];
  path = lib.makeBinPath tools;

  agentImage = pkgs.dockerTools.buildLayeredImage {
    name = "darkfactory-agent";
    tag = "nix";
    contents = tools ++ [ df entrypoint pkgs.glibc pkgs.stdenv.cc.cc.lib pkgs.zlib pkgs.openssl ];
    extraCommands = ''
      mkdir -p bin lib lib64 etc/ssl/certs home/agent/.config workspace tmp
      # The untouched release binary resolves the standard Linux ELF loader
      # through this symlink; libraries themselves remain immutable in /nix/store.
      ln -s ${dynamicLoader} ${systemLoader}
      chmod 1777 tmp
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
        "XDG_DATA_DIRS=${pkgs.gnome-keyring}/share:${pkgs.dbus}/share"
        "PATH=${df}/bin:${path}:/bin"
        "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
        "LD_LIBRARY_PATH=${sharedLibraries}"
      ];
    };
  };
in { inherit agentImage nodeModules agentRuntime df; }
